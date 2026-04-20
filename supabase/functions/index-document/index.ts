// Reads a document from Storage, extracts text (PDF/DOCX/TXT/Image OCR via Gemini),
// asks Lovable AI to extract structured metadata (people, orgs, places, dates, tags, summary),
// and writes the result back into the documents row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEXT_EXTS = new Set(["txt", "md", "csv", "log", "json"]);
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"]);
const OFFICE_EXTS = new Set(["pdf", "doc", "docx", "rtf", "odt", "xls", "xlsx", "ppt", "pptx"]);

const MAX_TEXT_CHARS = 60_000; // cap before sending to LLM
const MAX_BYTES_INLINE = 12 * 1024 * 1024; // 12MB inline cap for AI

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  // btoa available in Deno
  return btoa(binary);
}

function safeJsonParse<T = any>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function extractFirstJsonBlock(s: string): string | null {
  // Strip code fences and pull the first {...} block
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : s;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

async function tryExtractPlainText(bytes: Uint8Array): Promise<string> {
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return text;
  } catch { return ""; }
}

async function callLovableAI(body: Record<string, unknown>): Promise<Response> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function aiExtractFromMultimodal(args: {
  fileName: string;
  mimeType: string;
  base64: string;
}): Promise<any | null> {
  // Use Gemini with inline file part to OCR & extract from PDFs and images directly.
  const { fileName, mimeType, base64 } = args;
  const sysPrompt = `You are an expert legal document indexer for an Iraqi law firm. Read the provided document and return a strict JSON object describing it. Do not include any prose outside the JSON.`;
  const userPrompt = `File name: ${fileName}\n\nReturn JSON with this exact shape:\n{\n  "language": "en"|"ar"|"mixed"|"other",\n  "doc_type": short label (e.g. "Contract","Power of Attorney","Court Judgment","Invoice","ID Card"),\n  "summary": one to two sentence neutral summary,\n  "people": [full names of individuals],\n  "organizations": [companies, ministries, courts, banks],\n  "places": [cities, governorates, addresses],\n  "dates": [{"date":"YYYY-MM-DD or original","type":"signed|effective|expiry|hearing|filed|issued|other","label":""}],\n  "tags": [5-10 short topical keywords],\n  "extracted_text": full readable text (or best-effort OCR), trimmed to ~30000 chars\n}\nIf a field is unknown use [] or "" appropriately. Names should be in their original script (Arabic stays Arabic).`;

  const resp = await callLovableAI({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: sysPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ],
    temperature: 0.1,
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI multimodal error:", resp.status, t);
    return null;
  }
  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const block = extractFirstJsonBlock(content);
  if (!block) return null;
  return safeJsonParse(block);
}

async function aiExtractFromText(args: { fileName: string; text: string }): Promise<any | null> {
  const { fileName, text } = args;
  const truncated = text.slice(0, MAX_TEXT_CHARS);
  const sysPrompt = `You are an expert legal document indexer for an Iraqi law firm. Return strict JSON only.`;
  const userPrompt = `File name: ${fileName}\n\nDocument text:\n"""\n${truncated}\n"""\n\nReturn JSON exactly in this shape:\n{\n  "language": "en"|"ar"|"mixed"|"other",\n  "doc_type": "",\n  "summary": "",\n  "people": [],\n  "organizations": [],\n  "places": [],\n  "dates": [{"date":"","type":"signed|effective|expiry|hearing|filed|issued|other","label":""}],\n  "tags": [],\n  "extracted_text": ""\n}\nKeep extracted_text under 30000 chars. Names in their original script.`;

  const resp = await callLovableAI({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: sysPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
  });
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI text error:", resp.status, t);
    return null;
  }
  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const block = extractFirstJsonBlock(content);
  return block ? safeJsonParse(block) : null;
}

function normalizeArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(x => typeof x === "string").map(s => s.trim()).filter(Boolean).slice(0, 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: doc, error: docErr } = await admin
      .from("documents")
      .select("id, organization_id, file_name, file_path, file_type, mime_type, file_size_bytes, indexing_attempts")
      .eq("id", document_id)
      .maybeSingle();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("documents").update({
      indexing_status: "processing",
      indexing_attempts: (doc.indexing_attempts || 0) + 1,
      indexing_error: null,
    } as any).eq("id", document_id);

    const ext = (doc.file_type || doc.file_name.split(".").pop() || "").toLowerCase();
    const mime = doc.mime_type || (ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream");

    // Skip very large files
    if ((doc.file_size_bytes || 0) > MAX_BYTES_INLINE) {
      await admin.from("documents").update({
        indexing_status: "skipped",
        indexing_error: `File too large for inline AI indexing (${doc.file_size_bytes} bytes)`,
      } as any).eq("id", document_id);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download file from storage
    const { data: blob, error: dlErr } = await admin.storage.from("documents").download(doc.file_path);
    if (dlErr || !blob) {
      await admin.from("documents").update({
        indexing_status: "failed",
        indexing_error: dlErr?.message || "Failed to download file",
      } as any).eq("id", document_id);
      return new Response(JSON.stringify({ error: "Download failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());

    let extracted: any | null = null;

    if (TEXT_EXTS.has(ext)) {
      const text = await tryExtractPlainText(bytes);
      extracted = await aiExtractFromText({ fileName: doc.file_name, text });
    } else if (IMAGE_EXTS.has(ext) || ext === "pdf") {
      // Multimodal: Gemini handles PDFs and images directly
      const b64 = bytesToBase64(bytes);
      extracted = await aiExtractFromMultimodal({ fileName: doc.file_name, mimeType: mime, base64: b64 });
    } else if (OFFICE_EXTS.has(ext)) {
      // Office docs: best effort plain-text decode (works for many docx/xlsx exports if they include readable text);
      // otherwise fall back to multimodal which often still produces useful metadata from filename + heuristics.
      const text = await tryExtractPlainText(bytes);
      const looksTexty = text && /\w{3,}/.test(text) && text.replace(/[^\x20-\x7E]/g, "").length > 200;
      if (looksTexty) {
        extracted = await aiExtractFromText({ fileName: doc.file_name, text });
      } else {
        const b64 = bytesToBase64(bytes);
        extracted = await aiExtractFromMultimodal({ fileName: doc.file_name, mimeType: mime, base64: b64 });
      }
    } else {
      // Unknown type — try plain text
      const text = await tryExtractPlainText(bytes);
      extracted = await aiExtractFromText({ fileName: doc.file_name, text });
    }

    if (!extracted || typeof extracted !== "object") {
      await admin.from("documents").update({
        indexing_status: "failed",
        indexing_error: "AI returned no parseable metadata",
      } as any).eq("id", document_id);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: Record<string, unknown> = {
      ai_summary: typeof extracted.summary === "string" ? extracted.summary.slice(0, 2000) : null,
      ai_doc_type: typeof extracted.doc_type === "string" ? extracted.doc_type.slice(0, 120) : null,
      ai_people: normalizeArr(extracted.people),
      ai_organizations: normalizeArr(extracted.organizations),
      ai_places: normalizeArr(extracted.places),
      ai_tags: normalizeArr(extracted.tags),
      ai_dates: Array.isArray(extracted.dates) ? extracted.dates.slice(0, 50) : [],
      ai_language: typeof extracted.language === "string" ? extracted.language.slice(0, 16) : null,
      extracted_text: typeof extracted.extracted_text === "string" ? extracted.extracted_text.slice(0, 100_000) : null,
      indexing_status: "done",
      indexed_at: new Date().toISOString(),
      indexing_error: null,
    };

    const { error: upErr } = await admin.from("documents").update(update as any).eq("id", document_id);
    if (upErr) {
      await admin.from("documents").update({
        indexing_status: "failed", indexing_error: upErr.message,
      } as any).eq("id", document_id);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, document_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("index-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
