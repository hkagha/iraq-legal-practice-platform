import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { feature, prompt, context, language, caseData, clientData } = await req.json();

    let systemPrompt = "";
    let userPrompt = prompt || "";

    switch (feature) {
      case "document_draft": {
        systemPrompt = `You are a professional Iraqi legal document drafter. You draft precise, well-formatted legal documents following Iraqi legal standards and conventions.
Always use proper Iraqi legal terminology. Format documents with clear sections, numbered clauses, and professional structure.
Output in ${language === "ar" ? "Arabic" : language === "bilingual" ? "both Arabic and English" : "English"}.`;

        if (caseData) {
          userPrompt += `\n\nCase Context:\n- Case: ${caseData.title} (${caseData.case_number})\n- Type: ${caseData.case_type}\n- Court: ${caseData.court_name || "N/A"} (${caseData.court_type || "N/A"})`;
          if (clientData) {
            userPrompt += `\n- Client: ${clientData.name}`;
          }
          if (caseData.opposing_party_name) {
            userPrompt += `\n- Opposing Party: ${caseData.opposing_party_name}`;
          }
          if (caseData.judge_name) {
            userPrompt += `\n- Judge: ${caseData.judge_name}`;
          }
        }
        if (context) {
          userPrompt += `\n\nAdditional Context: ${context}`;
        }
        break;
      }

      case "case_summary": {
        systemPrompt = `You are a legal case analyst for an Iraqi law firm. Provide comprehensive case summaries in structured sections.
Output in ${language === "ar" ? "Arabic" : "English"}. Use Iraqi legal terminology.

You MUST return a valid JSON object with these exact keys:
{
  "overview": "2-3 paragraph case overview",
  "keyFacts": ["fact 1", "fact 2", ...],
  "timeline": [{"date": "YYYY-MM-DD", "event": "description"}, ...],
  "currentStatus": "description of current status",
  "nextSteps": ["step 1", "step 2", ...],
  "riskAssessment": {"level": "high|medium|low", "factors": ["factor 1", "factor 2", ...]}
}`;

        userPrompt = `Summarize this legal case:\n\n${prompt}`;
        break;
      }

      case "legal_research": {
        systemPrompt = `You are a legal research assistant specializing in Iraqi law. Provide detailed, accurate research based on Iraqi legislation, regulations, and legal precedents.
Always cite relevant Iraqi laws by their official names and numbers.
Output in ${language === "ar" ? "Arabic" : "English"}.
Include a disclaimer that this is AI-generated research and should be verified with official sources.`;
        break;
      }

      default: {
        systemPrompt = `You are a helpful legal assistant for an Iraqi law firm. Respond professionally and accurately.
Output in ${language === "ar" ? "Arabic" : "English"}.`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
