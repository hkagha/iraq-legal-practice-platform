import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-ai-fallback, x-ai-provider",
};

interface OrgAIConfig {
  ai_provider: string;
  ai_base_url: string | null;
  ai_model: string | null;
  ai_fallback_to_platform: boolean;
  apiKey: string | null;
}

async function loadOrgAIConfig(organization_id: string): Promise<OrgAIConfig | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: org } = await adminClient
      .from("organizations")
      .select("ai_provider, ai_base_url, ai_model, ai_fallback_to_platform")
      .eq("id", organization_id)
      .maybeSingle();

    if (!org) return null;

    let apiKey: string | null = null;
    if (org.ai_provider && org.ai_provider !== "lovable") {
      const { data: keyData } = await adminClient.rpc("get_org_ai_key", { _org_id: organization_id });
      apiKey = (keyData as string) || null;
    }
    return {
      ai_provider: org.ai_provider || "lovable",
      ai_base_url: org.ai_base_url,
      ai_model: org.ai_model,
      ai_fallback_to_platform: org.ai_fallback_to_platform ?? true,
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
    return { url: "https://api.openai.com/v1/chat/completions", model: model || "gpt-5", isAnthropic: false };
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

// Anthropic adapter: convert Anthropic SSE → OpenAI-style SSE deltas
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feature, prompt, context, language, caseData, clientData, organization_id } = await req.json();

    let systemPrompt = "";
    let userPrompt = prompt || "";

    switch (feature) {
      case "document_draft": {
        systemPrompt = `You are a professional Iraqi legal document drafter. You draft precise, well-formatted legal documents following Iraqi legal standards and conventions.\nAlways use proper Iraqi legal terminology. Format documents with clear sections, numbered clauses, and professional structure.\nOutput in ${language === "ar" ? "Arabic" : language === "bilingual" ? "both Arabic and English" : "English"}.`;
        if (caseData) {
          userPrompt += `\n\nCase Context:\n- Case: ${caseData.title} (${caseData.case_number})\n- Type: ${caseData.case_type}\n- Court: ${caseData.court_name || "N/A"} (${caseData.court_type || "N/A"})`;
          if (clientData) userPrompt += `\n- Client: ${clientData.name}`;
          if (caseData.opposing_party_name) userPrompt += `\n- Opposing Party: ${caseData.opposing_party_name}`;
          if (caseData.judge_name) userPrompt += `\n- Judge: ${caseData.judge_name}`;
        }
        if (context) userPrompt += `\n\nAdditional Context: ${context}`;
        break;
      }
      case "case_summary": {
        systemPrompt = `You are a legal case analyst for an Iraqi law firm. Provide comprehensive case summaries.\nOutput in ${language === "ar" ? "Arabic" : "English"}. Use Iraqi legal terminology.\nReturn a valid JSON object with keys: overview, keyFacts, timeline, currentStatus, nextSteps, riskAssessment.`;
        userPrompt = `Summarize this legal case:\n\n${prompt}`;
        break;
      }
      case "legal_research": {
        systemPrompt = `You are a legal research assistant specializing in Iraqi law. Provide detailed, accurate research based on Iraqi legislation.\nAlways cite relevant Iraqi laws by their official names and numbers.\nOutput in ${language === "ar" ? "Arabic" : "English"}.\nInclude a disclaimer that this is AI-generated and should be verified.`;
        break;
      }
      case "chat": {
        systemPrompt = `You are a legal AI assistant for an Iraqi law firm using the Qanuni platform.\nRespond in ${language === "ar" ? "Arabic" : "English"}. Use Iraqi legal terminology when appropriate.\n${context ? `\nContext: ${context}` : ""}`;
        break;
      }
      default: {
        systemPrompt = `You are a helpful legal assistant for an Iraqi law firm. Respond professionally.\nOutput in ${language === "ar" ? "Arabic" : "English"}.`;
      }
    }

    // Resolve provider
    const cfg = organization_id ? await loadOrgAIConfig(organization_id) : null;
    const useByok = !!(cfg && cfg.ai_provider !== "lovable" && cfg.apiKey);

    const callPlatform = async (): Promise<Response> => {
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
          if (cfg.ai_fallback_to_platform) {
            response = await callPlatform();
            usedFallback = true;
            providerLabel = "lovable";
          } else {
            return new Response(
              JSON.stringify({ error: `Your AI provider returned an error (${response.status}). Check your API key, model, or quota in Settings → AI.` }),
              { status: response.status === 401 ? 401 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      } catch (e) {
        console.error("BYOK call threw:", e);
        if (cfg.ai_fallback_to_platform) {
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
