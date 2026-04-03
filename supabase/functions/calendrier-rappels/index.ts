import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Find events starting within their rappel_minutes window that haven't been notified yet
  const now = new Date();
  
  const { data: events, error } = await supabase
    .from("evenements_calendrier")
    .select("*")
    .eq("rappel_envoye", false)
    .gte("date_debut", now.toISOString());

  if (error) {
    console.error("Error fetching events:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;

  for (const ev of events || []) {
    const eventStart = new Date(ev.date_debut);
    const rappelMinutes = ev.rappel_minutes || 30;
    const rappelTime = new Date(eventStart.getTime() - rappelMinutes * 60 * 1000);

    // If we're past the reminder time but before the event
    if (now >= rappelTime && now < eventStart) {
      // Get all DG and ASSISTANTE users
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["DG", "ASSISTANTE"]);

      const userIds = (roles || []).map((r: any) => r.user_id);

      // Format time for notification
      const heureDebut = eventStart.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const dateDebut = eventStart.toLocaleDateString("fr-FR");

      const TYPE_LABELS: Record<string, string> = {
        REUNION: "Réunion",
        RDV: "Rendez-vous",
        DEPLACEMENT: "Déplacement",
        RAPPEL: "Rappel",
        AUTRE: "Événement",
      };

      const typeLabel = TYPE_LABELS[ev.type_evenement] || "Événement";

      // Create notifications for each user
      const notifications = userIds.map((uid: string) => ({
        user_id: uid,
        titre: `Rappel : ${typeLabel} dans ${rappelMinutes} min`,
        message: `${ev.titre} - ${dateDebut} à ${heureDebut}${ev.lieu ? ` (${ev.lieu})` : ""}`,
        type: "RAPPEL",
        lien: "/calendrier",
      }));

      if (notifications.length > 0) {
        const { error: insertErr } = await supabase.from("notifications").insert(notifications);
        if (insertErr) {
          console.error("Error inserting notifications:", insertErr.message);
        }
      }

      // Mark reminder as sent
      await supabase
        .from("evenements_calendrier")
        .update({ rappel_envoye: true })
        .eq("id", ev.id);

      sent++;
    }
  }

  return new Response(JSON.stringify({ ok: true, reminders_sent: sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
