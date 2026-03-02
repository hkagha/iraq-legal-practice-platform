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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerAuth }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !callerAuth) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", callerAuth.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only super_admin and firm_admin can create users
    if (!["super_admin", "firm_admin"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Only administrators can create users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, first_name, last_name, role, organization_id, phone } = await req.json();

    if (!email || !password || !first_name || !last_name || !role || !organization_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // firm_admin can only create users in their own org
    if (callerProfile.role === "firm_admin" && organization_id !== callerProfile.organization_id) {
      return new Response(JSON.stringify({ error: "Cannot create users outside your organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // firm_admin cannot create super_admin or firm_admin
    if (callerProfile.role === "firm_admin" && ["super_admin", "firm_admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions to create this role" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or recover auth user (for previously invitation-created / unconfirmed accounts)
    let targetUserId: string | null = null;

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role },
    });

    if (createError) {
      const alreadyExists =
        createError.message?.toLowerCase().includes("already") ||
        createError.message?.toLowerCase().includes("registered");

      if (!alreadyExists) {
        console.error("User creation failed:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Recover existing user by email and force-confirm + reset password
      const { data: usersPage, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) {
        return new Response(JSON.stringify({ error: "Failed to load existing users" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingUser = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!existingUser) {
        return new Response(JSON.stringify({ error: "Existing user not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id, role, organization_id")
        .eq("id", existingUser.id)
        .maybeSingle();

      if (callerProfile.role === "firm_admin") {
        if (existingProfile?.organization_id && existingProfile.organization_id !== callerProfile.organization_id) {
          return new Response(JSON.stringify({ error: "Cannot manage users outside your organization" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (existingProfile?.role && ["super_admin", "firm_admin"].includes(existingProfile.role)) {
          return new Response(JSON.stringify({ error: "Insufficient permissions to manage this role" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error: recoverError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, role },
      });

      if (recoverError) {
        return new Response(JSON.stringify({ error: recoverError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      targetUserId = existingUser.id;
    } else {
      targetUserId = createdUser.user.id;
      // Wait for trigger to create profile for new users
      await new Promise(r => setTimeout(r, 1000));
    }

    // Update profile with org, role, phone
    await adminClient.from("profiles").update({
      organization_id,
      role,
      first_name,
      last_name,
      phone: phone || null,
      password_set_by_admin: true,
      password_last_changed_at: new Date().toISOString(),
      password_changed_by: callerProfile.id,
    }).eq("id", targetUserId);

    // Audit log for super_admin
    if (callerProfile.role === "super_admin") {
      await adminClient.from("admin_audit_log").insert({
        admin_id: callerProfile.id,
        action: "user_created",
        target_type: "user",
        target_id: targetUserId,
        target_name: email,
        details: { role, organization_id },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: targetUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-create-user error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
