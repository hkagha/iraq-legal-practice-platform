import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const body = await req.json();
    const { provider, base_url, model, organization_id } = body;
    let { api_key } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify firm admin of org
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await adminClient.from("profiles")
      .select("organization_id, role").eq("id", userId).maybeSingle();
    if (!profile || profile.organization_id !== organization_id || profile.role !== "firm_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If api_key not provided, load stored encrypted key
    if (!api_key) {
      const { data: keyData } = await adminClient.rpc("get_org_ai_key", { _org_id: organization_id });
      api_key = (keyData as string) || null;
    }
    if (!api_key) {
      return new Response(JSON.stringify({ error: "No API key provided or stored" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let url = "";
    let isAnthropic = false;
    let testModel = model || "";
    if (provider === "openai") {
      url = "https://api.openai.com/v1/chat/completions";
      testModel ||= "gpt-5-nano";
    } else if (provider === "google") {
      url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      testModel ||= "gemini-2.5-flash-lite";
    } else if (provider === "anthropic") {
      url = "https://api.anthropic.com/v1/messages";
      isAnthropic = true;
      testModel ||= "claude-haiku-4-5-20251001";
    } else if (provider === "custom") {
      const base = (base_url || "").replace(/\/+$/, "");
      if (!base) {
        return new Response(JSON.stringify({ error: "base_url required for custom provider" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      url = `${base}/chat/completions`;
      testModel ||= "gpt-4o-mini";
    } else {
      return new Response(JSON.stringify({ error: "Unsupported provider" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resp: Response;
    if (isAnthropic) {
      resp = await fetch(url, {
        method: "POST",
        headers: { "x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: testModel, max_tokens: 16, messages: [{ role: "user", content: "ping" }] }),
      });
    } else {
      resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: testModel, max_tokens: 16, messages: [{ role: "user", content: "ping" }] }),
      });
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return new Response(JSON.stringify({ ok: false, status: resp.status, error: text.slice(0, 500) }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, model: testModel }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
