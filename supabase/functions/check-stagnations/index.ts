import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEVIS_FINAL = ["VALIDE", "REFUSE", "ARCHIVE", "EXPIRE"];
const DA_FINAL = ["PAYEE", "CLOTUREE", "REFUSEE_DG"];

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();

  // Cible : DG (et COMMERCIAL pour devis, ACHATS pour DA)
  const { data: rolesAll } = await supabase.from("user_roles").select("user_id, role");
  const dgIds = (rolesAll || []).filter((r: any) => r.role === "DG").map((r: any) => r.user_id);
  const commercialIds = (rolesAll || []).filter((r: any) => r.role === "COMMERCIAL").map((r: any) => r.user_id);
  const achatsIds = (rolesAll || []).filter((r: any) => r.role === "ACHATS").map((r: any) => r.user_id);

  let created = 0;

  // ============ DEVIS stagnants > 7j ============
  const { data: devis } = await supabase.from("devis").select("id, reference, statut, updated_at, montant");
  const stagnantDevis = (devis || []).filter(
    (d: any) => !DEVIS_FINAL.includes(d.statut) && daysBetween(now, new Date(d.updated_at)) >= 7
  );

  for (const d of stagnantDevis) {
    const lien = `/devis/${d.id}`;
    const targets = Array.from(new Set([...dgIds, ...commercialIds]));
    for (const uid of targets) {
      // Anti-doublon : vérifier qu'aucune notif non lue pour ce lien n'existe déjà
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", uid)
        .eq("lien", lien)
        .eq("lue", false)
        .limit(1);
      if (existing && existing.length > 0) continue;

      const days = daysBetween(now, new Date(d.updated_at));
      await supabase.from("notifications").insert({
        user_id: uid,
        titre: `Devis stagnant depuis ${days}j`,
        message: `Le devis ${d.reference} n'a pas évolué depuis ${days} jours (statut: ${d.statut}).`,
        type: "ALERTE",
        lien,
      });
      created++;
    }
  }

  // ============ DEMANDES D'ACHAT > 30j ============
  const { data: das } = await supabase
    .from("demandes_achat")
    .select("id, reference, statut, created_at, designation");
  const oldDas = (das || []).filter(
    (d: any) => !DA_FINAL.includes(d.statut) && daysBetween(now, new Date(d.created_at)) >= 30
  );

  for (const d of oldDas) {
    const lien = `/achats?demande=${d.id}`;
    const targets = Array.from(new Set([...dgIds, ...achatsIds]));
    for (const uid of targets) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", uid)
        .eq("lien", lien)
        .eq("lue", false)
        .limit(1);
      if (existing && existing.length > 0) continue;

      const days = daysBetween(now, new Date(d.created_at));
      await supabase.from("notifications").insert({
        user_id: uid,
        titre: `Demande d'achat en retard (${days}j)`,
        message: `${d.reference} — ${d.designation} : ouverte depuis ${days} jours sans clôture.`,
        type: "ALERTE",
        lien,
      });
      created++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, notifications_created: created, devis_stagnants: stagnantDevis.length, da_anciennes: oldDas.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
