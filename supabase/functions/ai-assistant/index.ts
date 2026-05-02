import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-ai-fallback, x-ai-provider",
};

interface OrgAIConfig {
  ai_enabled: boolean;
  ai_provider: string;
  ai_base_url: string | null;
  ai_model: string | null;
  ai_fallback_to_platform: boolean;
  ai_platform_disabled_by_admin: boolean;
  apiKey: string | null;
}

async function loadOrgAIConfig(organization_id: string): Promise<OrgAIConfig | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: rows } = await adminClient.rpc("org_ai_runtime_settings", { _org_id: organization_id });
    const row: any = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return null;

    let apiKey: string | null = null;
    if (row.ai_provider && row.ai_provider !== "lovable") {
      const { data: keyData } = await adminClient.rpc("get_org_ai_key", { _org_id: organization_id });
      apiKey = (keyData as string) || null;
    }
    return {
      ai_enabled: row.ai_enabled ?? false,
      ai_provider: row.ai_provider || "lovable",
      ai_base_url: row.ai_base_url,
      ai_model: row.ai_model,
      ai_fallback_to_platform: row.ai_fallback_to_platform ?? true,
      ai_platform_disabled_by_admin: row.ai_platform_disabled_by_admin ?? false,
      apiKey,
    };
  } catch (e) {
    console.error("loadOrgAIConfig error:", e);
    return null;
  }
}

function resolveProviderEndpoint(cfg: OrgAIConfig): { url: string; model: string; isAnthropic: boolean } {
  const provider = cfg.ai_provider;
  const model = cfg.ai_model || "";
  if (provider === "openai") {
    return { url: "https://api.openai.com/v1/chat/completions", model: model || "gpt-4o", isAnthropic: false };
  }
  if (provider === "google") {
    return { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: model || "gemini-2.5-flash", isAnthropic: false };
  }
  if (provider === "anthropic") {
    return { url: "https://api.anthropic.com/v1/messages", model: model || "claude-sonnet-4-5-20250929", isAnthropic: true };
  }
  // custom: OpenAI-compatible
  const base = (cfg.ai_base_url || "").replace(/\/+$/, "");
  return { url: `${base}/chat/completions`, model: model || "gpt-4o", isAnthropic: false };
}

async function callOpenAICompatible(url: string, apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    }),
  });
}

async function callAnthropicAsOpenAISSE(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<Response> {
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) return upstream;

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
        return;
      }
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (!json) continue;
        try {
          const evt = JSON.parse(json);
          if (evt.type === "content_block_delta" && evt.delta?.text) {
            const oai = { choices: [{ delta: { content: evt.delta.text } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(oai)}\n\n`));
          }
        } catch { /* ignore */ }
      }
    },
  });

  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

// =============================================================================
//                        IRAQI LEGAL AI — UNIFIED PROMPTING
// =============================================================================
//
// All AI features in Qanuni route through this Edge Function. Every model the
// firm chooses (platform default, OpenAI, Anthropic, Google, custom) sees the
// SAME persona prefix below. This guarantees a consistent, professional voice
// regardless of which provider is in use.
//
// The persona is calibrated as a senior Iraqi advocate (محامٍ أقدم) with
// deep knowledge of Iraqi law, courts, drafting conventions, and procedure.
// =============================================================================

const QANUNI_PERSONA_PREFIX = `You are "Qanuni" — a senior Iraqi advocate (محامٍ أقدم) with two decades of practice in Iraqi courts at every level. You are the in-firm legal AI for an Iraqi law office and you assist staff (lawyers, paralegals, secretaries) in their professional work.

YOUR EXPERTISE
You have deep, practical, current knowledge of:
• The Iraqi Civil Code (القانون المدني العراقي رقم 40 لسنة 1951) and its amendments.
• The Iraqi Penal Code (قانون العقوبات العراقي رقم 111 لسنة 1969).
• The Personal Status Law (قانون الأحوال الشخصية رقم 188 لسنة 1959) and Sharia jurisprudence as applied by Iraqi personal-status courts.
• The Code of Civil Procedure (قانون المرافعات المدنية رقم 83 لسنة 1969).
• The Code of Criminal Procedure (قانون أصول المحاكمات الجزائية رقم 23 لسنة 1971).
• Commercial law, the Companies Law (قانون الشركات رقم 21 لسنة 1997 وتعديلاته), Labour Law (قانون العمل رقم 37 لسنة 2015), Tax Law, Customs Law, Real Estate Registration Law.
• The structure of Iraqi courts: Court of First Instance (محكمة البداءة), Misdemeanour Court (محكمة الجنح), Felony Court (محكمة الجنايات), Personal Status Court (محكمة الأحوال الشخصية), Labour Court (محكمة العمل), Court of Appeal (محكمة الاستئناف), Court of Cassation (محكمة التمييز), Federal Supreme Court (المحكمة الاتحادية العليا), Investigation Court (محكمة التحقيق), Central Criminal Court (المحكمة الجنائية المركزية).
• Iraqi government institutions relevant to legal practice — the Real Estate Registration Department, the Companies Registrar, the General Directorate of Notaries, the Ministry of Interior, etc.
• Iraqi legal drafting conventions: opening salutation to the court, proper styling of the parties (المدّعي، المدّعى عليه، الطاعن، المطعون ضده), numbered clauses (أولاً، ثانياً، ثالثاً), citation form for laws and articles ("استناداً إلى المادة (X) من القانون (Y) رقم (N) لسنة (YYYY)"), and a formal closing.

YOUR VOICE
• Professional, precise, deferential to the court, confident with clients, never casual.
• When writing in Arabic: classical formal Arabic (الفصحى), correct grammar. Never use dialect.
• When writing in English: formal British/legal register, no colloquialisms.
• When writing bilingually: side-by-side Arabic and English, with Arabic taking visual primacy in Iraqi-court-facing documents.

YOUR HONESTY DISCIPLINE
• If a question depends on a specific law, cite it by its official name AND number AND year (e.g. "المادة 234 من القانون المدني العراقي رقم 40 لسنة 1951").
• If you are not certain a law or article exists or is current, say so plainly. NEVER fabricate statute numbers, case names, or judicial precedents. Iraqi law evolves; always advise verification with the latest official Gazette ("الوقائع العراقية").
• Distinguish clearly between (a) settled black-letter law, (b) common practice in Iraqi courts that is not codified, and (c) your own reasoned view.
• When the question crosses into Sharia or personal-status matters, note the relevant school (predominantly Hanafi or Ja'fari depending on confession of the parties) and how it interacts with the Personal Status Law.
• Do not give the client legal advice on behalf of the firm. Your output is a professional draft for the supervising lawyer to review and adopt.

YOUR FORMAT
• Use clear section headings. Use numbered points (أولاً/ثانياً in Arabic, 1./2. in English). Avoid Markdown bullets in formal documents — use full sentences and paragraphs in legal-document outputs.
• When asked to draft a court submission, follow Iraqi pleading structure: heading (court, case number, parties, classification), facts (الوقائع), legal grounds (الأسباب القانونية), prayer for relief (الطلبات), and signature block.
• Never include placeholder text like "[insert date]" without flagging it as TO BE COMPLETED.
• Always end research/advice outputs with a one-line disclaimer that the work is AI-assisted and must be reviewed by a qualified Iraqi lawyer admitted to practice.`;

function langDirective(language: string | undefined): string {
  if (language === "ar") return "OUTPUT LANGUAGE: Arabic only (العربية). All content in formal classical Arabic.";
  if (language === "bilingual") return "OUTPUT LANGUAGE: Bilingual. Provide the Arabic version first, then the English version below it.";
  return "OUTPUT LANGUAGE: English only.";
}

function buildSystemPrompt(feature: string, language: string | undefined, context?: string): string {
  let featureBlock = "";
  switch (feature) {
    case "document_draft":
      featureBlock = `TASK: Draft a complete Iraqi legal document. Follow the structural conventions of the document type the user requests (power of attorney, contract, complaint, defence brief, motion, settlement agreement, engagement letter, etc.). Insert proper salutation, numbered clauses, and a signature block. Use Iraqi statutory references where appropriate.`;
      break;
    case "case_summary":
      featureBlock = `TASK: Produce a comprehensive case summary. RETURN A VALID JSON OBJECT with these keys exactly: overview, keyFacts, timeline, currentStatus, nextSteps, riskAssessment. The overview is a one-paragraph executive summary; keyFacts is an array of strings; timeline is an array of {date, event}; currentStatus is a single string; nextSteps is an array of strings; riskAssessment briefly evaluates litigation risks and possible outcomes. Output JSON only, no preamble.`;
      break;
    case "legal_research":
      featureBlock = `TASK: Conduct legal research grounded in Iraqi law. Identify the controlling statutes and articles, explain the rule, then apply it to the facts the user provides. Cite every law by its official name and number ("القانون المدني العراقي رقم 40 لسنة 1951") and the specific article number where applicable. If the answer involves practice rather than codified law, say so. End with the AI-assistance disclaimer.`;
      break;
    case "translate":
      featureBlock = `TASK: Translate legal text between Arabic and English. Preserve exact legal meaning. Keep proper names, statute citations, court names, and party designations in the original form (with the translation in parentheses on first occurrence only). Maintain the document's structural formatting (headings, numbered clauses, signature blocks).`;
      break;
    case "chat":
      featureBlock = `TASK: Answer the staff member's question conversationally but with professional rigour. Keep answers focused; if multiple plausible interpretations exist, surface them and let the lawyer choose.`;
      break;
    default:
      featureBlock = `TASK: Provide a professional legal response appropriate to the request.`;
  }

  const ctxBlock = context ? `\n\nADDITIONAL CONTEXT FROM THE FIRM:\n${context}` : "";
  return `${QANUNI_PERSONA_PREFIX}\n\n${featureBlock}\n\n${langDirective(language)}${ctxBlock}`;
}

function buildUserPrompt(feature: string, prompt: string, caseData: any, clientData: any, context?: string): string {
  let user = prompt || "";
  if (feature === "document_draft" && caseData) {
    user += `\n\nCASE CONTEXT
Case number: ${caseData.case_number || "(unassigned)"}
Title: ${caseData.title || "(untitled)"}
Type: ${caseData.case_type || "(unspecified)"}
Court: ${caseData.court_name || "N/A"} (${caseData.court_type || "N/A"})
Court case number: ${caseData.court_case_number || "N/A"}`;
    if (clientData?.name) user += `\nClient: ${clientData.name}`;
    if (caseData.opposing_party_name) user += `\nOpposing party: ${caseData.opposing_party_name}`;
    if (caseData.judge_name) user += `\nJudge: ${caseData.judge_name}`;
    if (caseData.filing_date) user += `\nFiling date: ${caseData.filing_date}`;
  }
  if (feature === "case_summary") {
    user = `Summarise this Iraqi legal case as JSON per the required schema.\n\n${prompt}`;
  }
  if (context && feature !== "document_draft") {
    user += `\n\nAdditional context:\n${context}`;
  }
  return user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, organization_id, role, is_active, ai_features_disabled")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "AI is available to authenticated staff only." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.is_active === false) {
      return new Response(JSON.stringify({ error: "This staff account is inactive." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.ai_features_disabled) {
      return new Response(JSON.stringify({ error: "AI features are disabled for this staff account." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { feature, prompt, context, language, caseData, clientData } = body;
    const requestedOrgId = body.organization_id as string | undefined;
    const organization_id = profile.role === "super_admin" && requestedOrgId
      ? requestedOrgId
      : profile.organization_id;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "No organization is available for this AI request." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSystemPrompt(feature, language, context);
    const userPrompt = buildUserPrompt(feature, prompt || "", caseData, clientData, context);

    // Resolve org configuration
    const cfg = organization_id ? await loadOrgAIConfig(organization_id) : null;

    // Three-state AI control:
    //   1. ai_enabled = false                                 → AI disabled entirely
    //   2. ai_provider != 'lovable' AND apiKey present        → BYOK (user's own provider)
    //   3. otherwise                                          → Platform AI (Lovable gateway)
    //
    // Plus super-admin lever: ai_platform_disabled_by_admin can block #3 for an
    // org regardless of their own choice — they must configure BYOK or do without.

    if (cfg && !cfg.ai_enabled) {
      return new Response(
        JSON.stringify({ error: "AI is disabled for this organisation. Enable it in Settings → AI." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const useByok = !!(cfg && cfg.ai_provider !== "lovable" && cfg.apiKey);
    const platformAllowed = !cfg?.ai_platform_disabled_by_admin;

    const callPlatform = async (): Promise<Response> => {
      if (!platformAllowed) {
        return new Response(
          JSON.stringify({
            error: "Platform AI is disabled for this organisation by the platform administrator. Please configure your own AI provider in Settings → AI.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "Platform AI not configured." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return callOpenAICompatible(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        LOVABLE_API_KEY,
        "google/gemini-2.5-flash",
        systemPrompt,
        userPrompt,
      );
    };

    let response: Response;
    let usedFallback = false;
    let providerLabel = "lovable";

    if (useByok && cfg) {
      const { url, model, isAnthropic } = resolveProviderEndpoint(cfg);
      providerLabel = cfg.ai_provider;
      try {
        response = isAnthropic
          ? await callAnthropicAsOpenAISSE(cfg.apiKey!, model, systemPrompt, userPrompt)
          : await callOpenAICompatible(url, cfg.apiKey!, model, systemPrompt, userPrompt);

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          console.error(`BYOK provider ${cfg.ai_provider} failed:`, response.status, errText);
          if (cfg.ai_fallback_to_platform && platformAllowed) {
            response = await callPlatform();
            usedFallback = true;
            providerLabel = "lovable";
          } else {
            return new Response(
              JSON.stringify({
                error: !platformAllowed
                  ? "Your AI provider failed and platform fallback is disabled by the platform administrator. Check your API key, model, or quota in Settings → AI."
                  : `Your AI provider returned an error (${response.status}). Check your API key, model, or quota in Settings → AI.`,
              }),
              { status: response.status === 401 ? 401 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      } catch (e) {
        console.error("BYOK call threw:", e);
        if (cfg.ai_fallback_to_platform && platformAllowed) {
          response = await callPlatform();
          usedFallback = true;
          providerLabel = "lovable";
        } else {
          return new Response(JSON.stringify({ error: "Failed to reach your AI provider." }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else {
      // No BYOK configured → must use platform
      response = await callPlatform();
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "x-ai-provider": providerLabel,
        "x-ai-fallback": usedFallback ? "true" : "false",
      },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
