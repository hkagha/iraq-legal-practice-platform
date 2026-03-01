import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Determine which API to call
    let apiUrl = "";
    let apiKey = "";
    let model = "";

    // Try org's custom AI config
    if (organization_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        const { data: org } = await adminClient
          .from("organizations")
          .select("ai_enabled, ai_provider, ai_api_key_encrypted, ai_model")
          .eq("id", organization_id)
          .single();

        if (org?.ai_enabled && org?.ai_api_key_encrypted) {
          const provider = org.ai_provider || "openai";
          apiKey = org.ai_api_key_encrypted;

          if (provider === "openai") {
            apiUrl = "https://api.openai.com/v1/chat/completions";
            model = org.ai_model || "gpt-4o";
          } else if (provider === "anthropic") {
            apiUrl = "https://api.openai.com/v1/chat/completions";
            model = org.ai_model || "gpt-4o";
          } else if (provider === "azure_openai") {
            apiUrl = "https://api.openai.com/v1/chat/completions";
            model = org.ai_model || "gpt-4o";
          }
        }
      } catch (e) {
        console.error("Failed to fetch org AI config:", e);
      }
    }

    // Fallback to Lovable gateway
    if (!apiUrl || !apiKey) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "AI service not configured. Please add your API key in Settings > AI Configuration." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = LOVABLE_API_KEY;
      model = "google/gemini-3-flash-preview";
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid AI API key. Please check your key in Settings > AI Configuration." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
