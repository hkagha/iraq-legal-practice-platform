// Builds and enqueues daily/weekly digest emails for users who have opted in
// via notification_preferences. Designed to be called by cron or manually.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DigestRequest {
  frequency?: "daily" | "weekly";
  user_id?: string; // optional: send only to one user
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = (await req.json().catch(() => ({}))) as DigestRequest;
    const frequency = body.frequency || "daily";
    const lookbackHours = frequency === "weekly" ? 24 * 7 : 24;
    const since = new Date(Date.now() - lookbackHours * 3600_000).toISOString();

    // Find users who want this digest. Preference shape:
    // preferences.digest = { daily: true/false, weekly: true/false }
    let prefQuery = supabase
      .from("notification_preferences")
      .select("user_id, organization_id, preferences");
    if (body.user_id) prefQuery = prefQuery.eq("user_id", body.user_id);
    const { data: prefs, error: prefsErr } = await prefQuery;
    if (prefsErr) throw prefsErr;

    const targets = (prefs || []).filter((p: any) => {
      const d = p?.preferences?.digest || {};
      return d[frequency] === true;
    });

    let queued = 0;
    for (const t of targets) {
      // Fetch the user's profile (for email/name)
      const { data: prof } = await supabase
        .from("profiles")
        .select("email, first_name, last_name, language_preference")
        .eq("id", t.user_id)
        .maybeSingle();
      if (!prof?.email) continue;

      // Pull a few signals: unread notifications, upcoming hearings, due tasks
      const [{ data: notifs }, { data: hearings }, { data: tasks }] = await Promise.all([
        supabase
          .from("notifications")
          .select("title, title_ar, body, created_at, priority")
          .eq("user_id", t.user_id)
          .eq("is_read", false)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("case_hearings")
          .select("hearing_date, hearing_time, hearing_type, court_room")
          .eq("organization_id", t.organization_id)
          .gte("hearing_date", new Date().toISOString().slice(0, 10))
          .lte(
            "hearing_date",
            new Date(Date.now() + lookbackHours * 3600_000).toISOString().slice(0, 10),
          )
          .limit(20),
        supabase
          .from("tasks")
          .select("title, due_date, priority")
          .eq("organization_id", t.organization_id)
          .eq("assigned_to", t.user_id)
          .neq("status", "done")
          .limit(20),
      ]);

      const items = [
        ...(notifs || []).map((n: any) => `• ${n.title}`),
        ...(hearings || []).map(
          (h: any) => `• Hearing: ${h.hearing_type} on ${h.hearing_date}`,
        ),
        ...(tasks || []).map(
          (k: any) => `• Task: ${k.title}${k.due_date ? " (due " + k.due_date + ")" : ""}`,
        ),
      ];

      if (items.length === 0) continue;

      const subject = `Your ${frequency} digest — ${items.length} updates`;
      const greet = `Hi ${prof.first_name || ""},`;
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1B2A4A">
          <h2 style="color:#1B2A4A;margin:0 0 8px">${subject}</h2>
          <p style="margin:0 0 16px;color:#475569">${greet}</p>
          <p style="margin:0 0 12px">Here is what is new in your firm:</p>
          <ul style="line-height:1.7;padding-inline-start:18px">
            ${items.slice(0, 30).map((i) => `<li>${i.replace(/^•\s*/, "")}</li>`).join("")}
          </ul>
          <p style="margin-top:24px;color:#94a3b8;font-size:12px">
            You receive this email because you enabled the ${frequency} digest in notification preferences.
          </p>
        </div>`;

      await supabase.from("email_queue").insert({
        organization_id: t.organization_id,
        to_email: prof.email,
        to_name: `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || null,
        subject,
        body_html: html,
        body_text: items.join("\n"),
        status: "pending",
      });
      queued++;
    }

    return new Response(
      JSON.stringify({ ok: true, frequency, candidates: targets.length, queued }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
