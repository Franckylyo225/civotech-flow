import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Operation, OperationStatut, Camion, Chauffeur, LigneDepense, CategorieDepense, TimelineEvent, Incident, TypeIncident, GraviteIncident } from "@/types/operations";

// Map DB row to app type
function mapCamion(row: any): Camion {
  return {
    id: row.id,
    immatriculation: row.immatriculation,
    marque: row.marque,
    modele: row.modele,
    capaciteTonnes: Number(row.capacite_tonnes),
    annee: row.annee,
    statut: row.statut,
  };
}

function mapChauffeur(row: any): Chauffeur {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    telephone: row.telephone || "",
    numeroPermis: row.numero_permis || "",
    disponible: row.disponible,
  };
}

function mapOperation(row: any, camions: Camion[], chauffeurs: Chauffeur[], timeline: TimelineEvent[], depenses: LigneDepense[], incidents: Incident[]): Operation {
  return {
    id: row.id,
    reference: row.reference,
    devisReference: row.devis_reference || undefined,
    clientNom: row.client_nom,
    camionId: row.camion_id || undefined,
    camion: row.camion_id ? camions.find(c => c.id === row.camion_id) : undefined,
    chauffeurId: row.chauffeur_id || undefined,
    chauffeur: row.chauffeur_id ? chauffeurs.find(c => c.id === row.chauffeur_id) : undefined,
    lieuEmbarquement: row.lieu_embarquement,
    lieuLivraison: row.lieu_livraison,
    dateDepart: row.date_depart || undefined,
    dateLivraisonEstimee: row.date_livraison_estimee || undefined,
    dateLivraisonReelle: row.date_livraison_reelle || undefined,
    dureeEstimeeHeures: row.duree_estimee_heures || undefined,
    statut: row.statut as OperationStatut,
    montantDevis: Number(row.montant_devis),
    poidsKg: row.poids_kg ? Number(row.poids_kg) : undefined,
    nombreColis: row.nombre_colis || undefined,
    bonLivraisonUrl: row.bon_livraison_url || undefined,
    depenses,
    incidents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timeline,
  };
}

export function useOperationsStore() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [camions, setCamions] = useState<Camion[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [opsRes, camRes, chRes, depRes, tlRes, incRes] = await Promise.all([
      supabase.from("operations").select("*").order("created_at", { ascending: false }),
      supabase.from("camions").select("*"),
      supabase.from("chauffeurs").select("*"),
      supabase.from("depenses").select("*"),
      supabase.from("timeline_events").select("*").order("created_at", { ascending: true }),
      supabase.from("incidents").select("*").order("date_incident", { ascending: false }),
    ]);

    const camionsList = (camRes.data || []).map(mapCamion);
    const chauffeursList = (chRes.data || []).map(mapChauffeur);
    const allDepenses = depRes.data || [];
    const allTimeline = tlRes.data || [];
    const allIncidents = incRes.data || [];

    setCamions(camionsList);
    setChauffeurs(chauffeursList);

    const ops = (opsRes.data || []).map(row => {
      const opDepenses: LigneDepense[] = allDepenses
        .filter(d => d.operation_id === row.id)
        .map(d => ({
          id: d.id,
          operationId: d.operation_id,
          categorie: d.categorie as CategorieDepense,
          description: d.description,
          montant: Number(d.montant),
          date: d.date,
        }));

      const opTimeline: TimelineEvent[] = allTimeline
        .filter(t => t.operation_id === row.id)
        .map(t => ({
          id: t.id,
          date: t.date,
          heure: t.heure,
          titre: t.titre,
          description: t.description,
          statut: t.statut as "done" | "current" | "pending",
        }));

      const opIncidents: Incident[] = allIncidents
        .filter((i: any) => i.operation_id === row.id)
        .map((i: any) => ({
          id: i.id,
          operationId: i.operation_id,
          type: i.type as TypeIncident,
          description: i.description,
          gravite: i.gravite as GraviteIncident,
          dateIncident: i.date_incident,
          resolu: i.resolu,
          createdAt: i.created_at,
        }));

      return mapOperation(row, camionsList, chauffeursList, opTimeline, opDepenses, opIncidents);
    });

    setOperations(ops);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    // Realtime subscription
    const channel = supabase
      .channel("operations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "operations" }, () => {
        fetchAll();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const updateStatut = useCallback(async (opId: string, statut: OperationStatut) => {
    const updates: any = { statut };
    if (statut === "TERMINEE") updates.date_livraison_reelle = new Date().toISOString();
    if (statut === "EN_COURS") updates.date_depart = new Date().toISOString();

    await supabase.from("operations").update(updates).eq("id", opId);

    // Add timeline event
    const now = new Date();
    const titreMap: Record<string, string> = {
      PLANIFIEE: "Demande validée",
      EN_COURS: "Mission démarrée",
      TERMINEE: "Mission terminée",
    };
    if (titreMap[statut]) {
      await supabase.from("timeline_events").insert({
        operation_id: opId,
        date: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        titre: titreMap[statut],
        description: `Statut mis à jour`,
        statut: "done",
      });
    }

    await fetchAll();
  }, [fetchAll]);

  const affecterOperation = useCallback(async (opId: string, camionId: string, chauffeurId: string) => {
    await supabase.from("operations").update({
      camion_id: camionId,
      chauffeur_id: chauffeurId,
    }).eq("id", opId);

    // Update camion status
    await supabase.from("camions").update({ statut: "EN_MISSION" as any }).eq("id", camionId);
    await supabase.from("chauffeurs").update({ disponible: false }).eq("id", chauffeurId);

    // Timeline
    const cam = camions.find(c => c.id === camionId);
    const ch = chauffeurs.find(c => c.id === chauffeurId);
    const now = new Date();
    await supabase.from("timeline_events").insert({
      operation_id: opId,
      date: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      titre: "Camion & chauffeur affectés",
      description: `${cam?.marque} ${cam?.modele} — ${cam?.immatriculation} / ${ch?.prenom} ${ch?.nom}`,
      statut: "done",
    });

    await fetchAll();
  }, [fetchAll, camions, chauffeurs]);

  const addDepense = useCallback(async (opId: string, depense: Omit<LigneDepense, "id" | "operationId">) => {
    await supabase.from("depenses").insert({
      operation_id: opId,
      categorie: depense.categorie as any,
      description: depense.description,
      montant: depense.montant,
      date: depense.date,
    });
    await fetchAll();
  }, [fetchAll]);

  const planifierOperation = useCallback(async (opId: string, lieuEmbarquement: string, dateDepart: string, dateLivraisonEstimee?: string) => {
    const updates: any = {
      lieu_embarquement: lieuEmbarquement,
      date_depart: dateDepart,
      statut: "PLANIFIEE",
    };
    if (dateLivraisonEstimee) updates.date_livraison_estimee = dateLivraisonEstimee;

    await supabase.from("operations").update(updates).eq("id", opId);

    const now = new Date();
    let desc = `Lieu: ${lieuEmbarquement} — Départ: ${new Date(dateDepart).toLocaleDateString("fr-FR")}`;
    if (dateLivraisonEstimee) desc += ` — Livraison estimée: ${new Date(dateLivraisonEstimee).toLocaleDateString("fr-FR")}`;

    await supabase.from("timeline_events").insert({
      operation_id: opId,
      date: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      titre: "Mission planifiée",
      description: desc,
      statut: "done",
    });

    await fetchAll();
  }, [fetchAll]);

  const addIncident = useCallback(async (opId: string, incident: { type: TypeIncident; description: string; gravite: GraviteIncident }) => {
    await supabase.from("incidents").insert({
      operation_id: opId,
      type: incident.type as any,
      description: incident.description,
      gravite: incident.gravite as any,
    });

    // Timeline event
    const now = new Date();
    await supabase.from("timeline_events").insert({
      operation_id: opId,
      date: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      titre: `Incident signalé`,
      description: `${incident.type} — ${incident.description}`,
      statut: "done",
    });

    await fetchAll();
  }, [fetchAll]);

  const toggleIncidentResolu = useCallback(async (incidentId: string, resolu: boolean) => {
    await supabase.from("incidents").update({ resolu }).eq("id", incidentId);
    await fetchAll();
  }, [fetchAll]);

  return { operations, camions, chauffeurs, loading, updateStatut, affecterOperation, addDepense, planifierOperation, addIncident, toggleIncidentResolu, refetch: fetchAll };
}
