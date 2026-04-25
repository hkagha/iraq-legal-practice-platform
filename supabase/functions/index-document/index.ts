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
  const sysPrompt = INDEXER_SYSTEM_PROMPT;
  const userPrompt = INDEXER_USER_PROMPT(fileName);

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
  const sysPrompt = INDEXER_SYSTEM_PROMPT;
  const userPrompt = `${INDEXER_USER_PROMPT(fileName)}\n\nDocument text:\n"""\n${truncated}\n"""`;

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

// =============================================================================
// Indexer prompts — shared between text and multimodal paths so output schema
// stays consistent regardless of how the document is read.
// =============================================================================

const INDEXER_SYSTEM_PROMPT = `You are an expert legal-document indexer working inside an Iraqi law firm. Your job is to read a document the firm has uploaded and produce a STRICT, CLEAN JSON metadata record so the firm can later find this document by searching for any of the people, places, dates, parties, statutes, monetary amounts, or topics it contains.

The firm will upload thousands of documents over time. Your indexing must be PRECISE and CONSISTENT so search across the whole archive works. Apply these rules:

A. NAMES
   - Extract every personal name that appears (parties, signatories, witnesses, judges, lawyers, notaries, witnesses).
   - Keep names in their ORIGINAL SCRIPT (Arabic stays Arabic, English stays English). Don't transliterate.
   - Normalise titles by stripping them: "السيد محمد كاظم" → "محمد كاظم"; "Mr. John Smith" → "John Smith".
   - Don't deduplicate by language: include both the Arabic and English form if the document shows both.

B. ORGANISATIONS
   - Extract companies, ministries, government departments, courts, banks, embassies, NGOs.
   - Use the FULL official name (e.g. "محكمة بداءة الكرخ", "وزارة العدل العراقية", "Ministry of Justice — Republic of Iraq").
   - Identify the court name as both an organisation AND, when applicable, surface the court_type field.

C. PLACES
   - Extract cities, governorates, neighbourhoods, complete addresses, plot numbers (المقاطعة، الزقاق، الدار), country names.
   - For Iraqi addresses prefer the Arabic name; preserve plot/registration numbers verbatim.

D. DATES
   - Extract every date that appears: signing date, effective date, expiry, hearing date, filing date, issuance date, deadlines.
   - Output dates in ISO YYYY-MM-DD format whenever possible. Convert Hijri dates to Gregorian if both are present; otherwise keep the original string.
   - Always tag each date with its type: "signed" | "effective" | "expiry" | "hearing" | "filed" | "issued" | "due" | "executed" | "other".
   - Include a short label describing what the date refers to.

E. STATUTORY REFERENCES (very important for Iraqi legal search)
   - Extract every law cited: official name + law number + year + article number(s).
   - Examples: "القانون المدني العراقي رقم 40 لسنة 1951 — المادة 234", "قانون العقوبات رقم 111 لسنة 1969 — المادة 432".

F. CASE / FILE NUMBERS
   - Extract every case, file, registration, contract, or transaction number that uniquely identifies a record.

G. MONETARY AMOUNTS
   - Extract amounts with currency: "5,000,000 IQD", "12,500 USD", "100,000 دينار عراقي".

H. PARTIES (for legal documents)
   - Identify which person/entity plays which role: plaintiff (المدّعي), defendant (المدّعى عليه), buyer/seller, lessor/lessee, principal/attorney-in-fact, etc.

I. DOC TYPE
   - Use a precise short label: "Power of Attorney", "Sale Contract", "Lease Agreement", "Court Judgment", "Court Pleading", "Court Decision", "Investigation Statement", "Marriage Contract", "Divorce Decree", "Birth Certificate", "Civil ID", "Passport", "Commercial Registration", "Invoice", "Receipt", "Internal Memo", etc.

J. SUMMARY
   - Two to four sentences, neutral, factual. State who the parties are, what the document does, and any key date/amount.

K. TAGS
   - 5–12 short topical keywords that a lawyer would use to search later.

Return STRICT JSON only — no prose, no code fences, no explanation outside the JSON.`;

const INDEXER_USER_PROMPT = (fileName: string) =>
  `File name: ${fileName}

Return JSON in this exact schema. Use [] or "" for unknown values.

{
  "language": "ar" | "en" | "mixed" | "other",
  "doc_type": "",
  "summary": "",
  "people": [],
  "organizations": [],
  "places": [],
  "dates": [{"date":"","type":"signed|effective|expiry|hearing|filed|issued|due|executed|other","label":""}],
  "statutes": [{"name":"","number":"","year":"","article":""}],
  "case_numbers": [],
  "amounts": [{"value":"","currency":""}],
  "parties": [{"name":"","role":""}],
  "tags": [],
  "extracted_text": "(full readable text trimmed to ~30,000 chars)"
}`;


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
      ai_statutes: Array.isArray(extracted.statutes) ? extracted.statutes.slice(0, 50) : [],
      ai_case_numbers: normalizeArr(extracted.case_numbers),
      ai_amounts: Array.isArray(extracted.amounts) ? extracted.amounts.slice(0, 50) : [],
      ai_parties: Array.isArray(extracted.parties) ? extracted.parties.slice(0, 50) : [],
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
