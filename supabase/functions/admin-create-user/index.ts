import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Not authenticated" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: callerAuth },
      error: authError,
    } = await adminClient.auth.getUser(token);
    if (authError || !callerAuth) return jsonResponse({ error: "Invalid token" }, 401);

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", callerAuth.id)
      .single();

    if (!callerProfile) return jsonResponse({ error: "Profile not found" }, 403);

    if (!["super_admin", "sales_admin", "firm_admin"].includes(callerProfile.role)) {
      return jsonResponse({ error: "Only administrators can create users" }, 403);
    }

    const body = await req.json();
    const { email, password, first_name, last_name, role, organization_id, phone, person_id } = body;

    if (!email || !password || !role || !organization_id) {
      return jsonResponse({ error: "Missing required fields (email, password, role, organization_id)" }, 400);
    }

    if (password.length < 8) {
      return jsonResponse({ error: "Password must be at least 8 characters" }, 400);
    }

    const allowedRoles = ["super_admin", "sales_admin", "firm_admin", "lawyer", "paralegal", "secretary", "accountant", "client"];
    if (!allowedRoles.includes(role)) {
      return jsonResponse({ error: `Invalid role: ${role}` }, 400);
    }

    if (callerProfile.role === "firm_admin" && organization_id !== callerProfile.organization_id) {
      return jsonResponse({ error: "Cannot create users outside your organization" }, 403);
    }

    if (callerProfile.role === "firm_admin" && ["super_admin", "sales_admin", "firm_admin"].includes(role)) {
      return jsonResponse({ error: "Insufficient permissions to create this role" }, 403);
    }

    if (callerProfile.role === "sales_admin" && role !== "firm_admin") {
      return jsonResponse({ error: "Sales admins can only create the first firm administrator" }, 403);
    }

    if (role === "client" && !person_id) {
      return jsonResponse({ error: "A linked individual client is required for client accounts" }, 400);
    }

    if (role === "client") {
      const { data: person, error: personError } = await adminClient
        .from("persons")
        .select("id, organization_id")
        .eq("id", person_id)
        .maybeSingle();

      if (personError) {
        return jsonResponse({ error: `Failed to validate linked client: ${personError.message}` }, 500);
      }

      if (!person || person.organization_id !== organization_id) {
        return jsonResponse({ error: "The selected individual client does not belong to this organization" }, 400);
      }
    }

    let targetUserId: string | null = null;

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: first_name || "", last_name: last_name || "", role },
    });

    if (createError) {
      const msg = createError.message?.toLowerCase() || "";
      const alreadyExists = msg.includes("already") || msg.includes("registered") || msg.includes("exists");

      if (!alreadyExists) {
        console.error("createUser failed:", createError);
        return jsonResponse({ error: `Auth create failed: ${createError.message}` }, 400);
      }

      const { data: usersPage, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) return jsonResponse({ error: `Failed to load existing users: ${usersError.message}` }, 500);

      const existingUser = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!existingUser) return jsonResponse({ error: "Existing user not found by email" }, 404);

      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id, role, organization_id")
        .eq("id", existingUser.id)
        .maybeSingle();

      if (callerProfile.role === "firm_admin") {
        if (existingProfile?.organization_id && existingProfile.organization_id !== callerProfile.organization_id) {
          return jsonResponse({ error: "Cannot manage users outside your organization" }, 403);
        }
        if (existingProfile?.role && ["super_admin", "sales_admin", "firm_admin"].includes(existingProfile.role)) {
          return jsonResponse({ error: "Insufficient permissions to manage this role" }, 403);
        }
      }

      const { error: recoverError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: { first_name: first_name || "", last_name: last_name || "", role },
      });

      if (recoverError) return jsonResponse({ error: `Update failed: ${recoverError.message}` }, 400);

      targetUserId = existingUser.id;
    } else {
      targetUserId = createdUser.user.id;
    }

    if (!targetUserId) return jsonResponse({ error: "Failed to obtain user id" }, 500);

    if (role === "client") {
      // Keep a lightweight role=client profile so shared tables with profile FKs
      // (for example documents.uploaded_by) can still reference portal users.
      // AuthContext ignores role=client profiles and resolves portal_users next.
      const { error: clientProfileError } = await adminClient.from("profiles").upsert(
        {
          id: targetUserId,
          email,
          organization_id,
          role: "client",
          first_name: first_name || "",
          last_name: last_name || "",
          phone: phone || null,
          is_active: true,
        },
        { onConflict: "id" },
      );
      if (clientProfileError) {
        console.error("Client profile upsert failed:", clientProfileError);
        return jsonResponse({ error: `Client profile setup failed: ${clientProfileError.message}` }, 500);
      }
    } else {
      const { error: profileError } = await adminClient.from("profiles").upsert(
        {
          id: targetUserId,
          email,
          organization_id,
          role,
          first_name: first_name || "",
          last_name: last_name || "",
          phone: phone || null,
          is_active: true,
          password_set_by_admin: true,
          password_last_changed_at: new Date().toISOString(),
          password_changed_by: callerProfile.id,
        },
        { onConflict: "id" },
      );

      if (profileError) {
        console.error("Profile upsert failed:", profileError);
        return jsonResponse({ error: `Profile setup failed: ${profileError.message}` }, 500);
      }
    }

    if (role === "client") {
      const displayName = [first_name, last_name].filter(Boolean).join(" ").trim() || null;

      const { data: portalUser, error: portalUserError } = await adminClient
        .from("portal_users")
        .upsert(
          {
            auth_user_id: targetUserId,
            email,
            full_name: displayName,
            phone: phone || null,
            last_selected_org_id: organization_id,
          },
          { onConflict: "auth_user_id" },
        )
        .select("id")
        .single();

      if (portalUserError || !portalUser) {
        console.error("portal_users upsert failed:", portalUserError);
        return jsonResponse({ error: `Portal account setup failed: ${portalUserError?.message || "Unknown error"}` }, 500);
      }

      const { error: linkError } = await adminClient.from("portal_user_links").upsert(
        {
          portal_user_id: portalUser.id,
          organization_id,
          person_id,
          is_active: true,
        },
        { onConflict: "portal_user_id,organization_id,person_id" },
      );

      if (linkError) {
        console.error("portal_user_links upsert failed:", linkError);
        return jsonResponse({ error: `Portal access link failed: ${linkError.message}` }, 500);
      }
    }

    await adminClient.from("firm_audit_log").insert({
      organization_id,
      actor_id: callerProfile.id,
      actor_role: callerProfile.role,
      event_type: "user_created",
      target_table: role === "client" ? "portal_users" : "profiles",
      target_id: targetUserId,
      target_name: email,
      details: { role, person_id: person_id || null, created_by_edge_function: true },
    });

    if (["super_admin", "sales_admin"].includes(callerProfile.role)) {
      await adminClient.from("admin_audit_log").insert({
        admin_id: callerProfile.id,
        action: "user_created",
        target_type: "user",
        target_id: targetUserId,
        target_name: email,
        details: { role, organization_id, person_id: person_id || null },
      });
    }

    return jsonResponse({ success: true, user_id: targetUserId }, 200);
  } catch (e: any) {
    console.error("admin-create-user error:", e);
    return jsonResponse({ error: e?.message || String(e) || "Internal error" }, 500);
  }
});
