// Bootstrap a single SUPER_ADMIN account. Only succeeds if no SUPER_ADMIN exists yet.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let email = Deno.env.get("SUPER_ADMIN_EMAIL") || "";
    let password = Deno.env.get("SUPER_ADMIN_PASSWORD") || "";
    let nom = Deno.env.get("SUPER_ADMIN_NOM") || "";
    let prenom = Deno.env.get("SUPER_ADMIN_PRENOM") || "";

    try {
      const body = await req.json();
      if (body?.email) email = body.email;
      if (body?.password) password = body.password;
      if (body?.nom) nom = body.nom;
      if (body?.prenom) prenom = body.prenom;
    } catch {/* no body */}

    if (!email || !password || !nom || !prenom) {
      return new Response(JSON.stringify({ error: "Identifiants Super Admin manquants (env ou body)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refuse if a SUPER_ADMIN already exists
    const { data: existing } = await admin.from("user_roles").select("user_id").eq("role", "SUPER_ADMIN").limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Un compte SUPER_ADMIN existe déjà" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { nom, prenom, role: "SUPER_ADMIN" },
    });
    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The handle_new_user trigger creates profile + user_role from metadata.
    // Make sure the role is SUPER_ADMIN (in case metadata didn't propagate).
    const userId = created.user!.id;
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role: "SUPER_ADMIN" });

    return new Response(JSON.stringify({ success: true, user_id: userId, email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
