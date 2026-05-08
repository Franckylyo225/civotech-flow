import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Periode = "7j" | "mois" | "trimestre" | "annee";

export interface DashboardDGApprobation {
  id: string;
  type: "DEVIS" | "ACHAT" | "FACTURE_FOURN";
  reference: string;
  titre: string;
  montantFCFA: number;
  soumisParPrenom: string;
  createdAt: string;
  joursAttente: number;
  urgent: boolean;
  lien: string;
}

export interface DashboardDGOperation {
  id: string;
  reference: string;
  client: string;
  trajet: string;
  chauffeur: string;
  camion: string;
  statut: string;
}

export interface DashboardDGData {
  kpis: {
    caMoisFCFA: number;
    caMoisPrecedentFCFA: number;
    evolutionCaPct: number | null;
    nbDevisEnCours: number;
    nbDevisAValider: number;
    nbMissionsActives: number;
    nbMissionsPlanifiees: number;
    facturesImpayeesFCFA: number;
    nbClientsDebiteurs: number;
    nbApprobationsEnAttente: number;
  };
  alertesUrgentes: { type: string; count: number; label: string }[];
  evolutionCA: { mois: string; caFCFA: number; objectifFCFA: number }[];
  approbations: DashboardDGApprobation[];
  operationsEnCours: DashboardDGOperation[];
  statsOperations: { enCours: number; planifiees: number; terminees: number; aFacturer: number };
  clientsDebiteurs: { clientNom: string; factureRef: string; montantFCFA: number; joursRetard: number }[];
  topClients: { clientNom: string; caFCFA: number; nbOperations: number }[];
  repartitionTrajet: { interVillesPct: number; portPct: number; localPct: number };
  parcStatus: {
    disponibles: number; enMission: number; enMaintenance: number; total: number;
    docsExpirant: number; maintRetard: number; maintRetardJoursMax: number;
  };
  agenda: { id: string; titre: string; dateDebut: string; lieu: string | null; type: string }[];
}

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const OBJECTIF_DEFAUT = 15_000_000;

function periodeBornes(periode: Periode): { debut: Date; debutPrec: Date; fin: Date } {
  const now = new Date();
  const fin = now;
  let debut: Date, debutPrec: Date;
  switch (periode) {
    case "7j":
      debut = new Date(now); debut.setDate(now.getDate() - 7);
      debutPrec = new Date(debut); debutPrec.setDate(debut.getDate() - 7);
      break;
    case "trimestre":
      debut = new Date(now); debut.setMonth(now.getMonth() - 3);
      debutPrec = new Date(debut); debutPrec.setMonth(debut.getMonth() - 3);
      break;
    case "annee":
      debut = new Date(now.getFullYear(), 0, 1);
      debutPrec = new Date(now.getFullYear() - 1, 0, 1);
      break;
    case "mois":
    default:
      debut = new Date(now.getFullYear(), now.getMonth(), 1);
      debutPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }
  return { debut, debutPrec, fin };
}

function trajetCategory(lieuDep: string, lieuLiv: string): "port" | "interVilles" | "local" {
  const t = `${lieuDep} ${lieuLiv}`.toLowerCase();
  if (t.includes("port") || t.includes("san-pédro") || t.includes("san pedro")) return "port";
  // local si même ville (heuristique simple)
  const dep = lieuDep.split(/[,\-→]/)[0].trim().toLowerCase();
  const liv = lieuLiv.split(/[,\-→]/)[0].trim().toLowerCase();
  if (dep && dep === liv) return "local";
  return "interVilles";
}

export function useDashboardDG(periode: Periode) {
  const [data, setData] = useState<DashboardDGData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const { debut, debutPrec, fin } = periodeBornes(periode);
      const debutISO = debut.toISOString().slice(0, 10);
      const debutPrecISO = debutPrec.toISOString().slice(0, 10);
      const finISO = fin.toISOString().slice(0, 10);
      const now = new Date();

      const [
        facturesPeriodeRes, facturesPrecRes, facturesImpayeesRes,
        devisAllRes, opsAllRes, opsListRes,
        daSoumisesRes, supplierInvPendingRes,
        camionsRes, maintenancesRes,
        eventsRes, profilesRes, clientsRes, fournisseursRes,
      ] = await Promise.all([
        supabase.from("factures").select("montant_ttc, client_id, date_paiement, date_emission")
          .eq("statut", "PAYEE")
          .gte("date_paiement", debutISO).lte("date_paiement", finISO),
        supabase.from("factures").select("montant_ttc, date_paiement")
          .eq("statut", "PAYEE")
          .gte("date_paiement", debutPrecISO).lt("date_paiement", debutISO),
        supabase.from("factures").select("id, reference, montant_ttc, montant_paye, date_echeance, client_id, statut")
          .in("statut", ["ENVOYEE", "PARTIELLEMENT_PAYEE"]),
        supabase.from("devis").select("id, reference, statut, description, montant, created_at, commercial_id, client_id"),
        supabase.from("operations").select("id, statut, date_livraison_reelle"),
        supabase.from("operations").select("id, reference, client_nom, client_id, lieu_embarquement, lieu_livraison, statut, montant_devis, camion_id, chauffeur_id, date_depart")
          .order("created_at", { ascending: false }).limit(40),
        supabase.from("demandes_achat").select("id, reference, designation, description, montant_estime, created_at, statut, created_by"),
        supabase.from("supplier_invoices").select("id, reference, amount, invoice_date, status, supplier_id, created_by, created_at")
          .eq("status", "pending_DG"),
        supabase.from("camions").select("id, immatriculation, statut, date_assurance, date_vignette, date_visite_tech"),
        supabase.from("maintenances").select("id, date_prevue, statut")
          .in("statut", ["PLANIFIEE", "EN_COURS"]),
        supabase.from("evenements_calendrier").select("id, titre, date_debut, lieu, type_evenement")
          .gte("date_debut", new Date().toISOString())
          .order("date_debut", { ascending: true }).limit(5),
        supabase.from("profiles").select("id, prenom, nom"),
        supabase.from("clients").select("id, nom"),
        supabase.from("fournisseurs").select("id, nom"),
      ]);

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.id] = p.prenom || p.nom || "—"; });
      const clientMap: Record<string, string> = {};
      (clientsRes.data || []).forEach((c: any) => { clientMap[c.id] = c.nom; });
      const fournMap: Record<string, string> = {};
      (fournisseursRes.data || []).forEach((f: any) => { fournMap[f.id] = f.nom; });

      // KPIs
      const caMois = (facturesPeriodeRes.data || []).reduce((s: number, f: any) => s + Number(f.montant_ttc || 0), 0);
      const caPrec = (facturesPrecRes.data || []).reduce((s: number, f: any) => s + Number(f.montant_ttc || 0), 0);
      const evolutionCaPct = caPrec === 0 ? null : Math.round(((caMois - caPrec) / caPrec) * 1000) / 10;

      const devisList = devisAllRes.data || [];
      const DEVIS_FINAL = ["VALIDE_CLIENT", "REFUSE_CLIENT", "REFUSE_DG", "ARCHIVE"];
      const devisEnCours = devisList.filter((d: any) => !DEVIS_FINAL.includes(d.statut));
      const devisAValider = devisList.filter((d: any) => d.statut === "SOUMIS_DG");

      const opsAll = opsAllRes.data || [];
      const missionsActives = opsAll.filter((o: any) => o.statut === "EN_COURS").length;
      const missionsPlanifiees = opsAll.filter((o: any) => o.statut === "PLANIFIEE").length;
      const missionsTerminees = opsAll.filter((o: any) => o.statut === "TERMINEE").length;
      // À facturer: TERMINEE sans facture - approximation = TERMINEE
      const aFacturer = missionsTerminees;

      const facturesImpayees = facturesImpayeesRes.data || [];
      const facturesImpayeesTotal = facturesImpayees.reduce((s: number, f: any) => s + (Number(f.montant_ttc || 0) - Number(f.montant_paye || 0)), 0);
      const debiteurClientIds = new Set(facturesImpayees.map((f: any) => f.client_id).filter(Boolean));

      const daList = daSoumisesRes.data || [];
      const daEnAttenteDG = daList.filter((d: any) => d.statut === "SOUMISE_DG");
      const daRetard = daList.filter((d: any) => {
        if (["PAYEE", "CLOTUREE", "REFUSEE_DG"].includes(d.statut)) return false;
        const age = (now.getTime() - new Date(d.created_at).getTime()) / 86400000;
        return age > 7;
      });

      const supplierInvPending = supplierInvPendingRes.data || [];

      const nbApprobationsEnAttente = devisAValider.length + daEnAttenteDG.length + supplierInvPending.length;

      // Alertes urgentes
      const alertesUrgentes: { type: string; count: number; label: string }[] = [];
      if (devisAValider.length > 0) alertesUrgentes.push({ type: "devis", count: devisAValider.length, label: `${devisAValider.length} devis à valider` });
      if (daRetard.length > 0) alertesUrgentes.push({ type: "achat", count: daRetard.length, label: `${daRetard.length} achat${daRetard.length > 1 ? "s" : ""} urgent${daRetard.length > 1 ? "s" : ""}` });
      if (supplierInvPending.length > 0) alertesUrgentes.push({ type: "facture_fourn", count: supplierInvPending.length, label: `${supplierInvPending.length} facture${supplierInvPending.length > 1 ? "s" : ""} fournisseur à approuver` });

      // Évolution CA 6 derniers mois (factures payées)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const { data: facturesEvolRes } = await supabase
        .from("factures")
        .select("montant_ttc, date_paiement")
        .eq("statut", "PAYEE")
        .gte("date_paiement", sixMonthsAgo.toISOString().slice(0, 10));
      const evolutionCA: { mois: string; caFCFA: number; objectifFCFA: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        evolutionCA.push({ mois: MOIS_LABELS[d.getMonth()], caFCFA: 0, objectifFCFA: OBJECTIF_DEFAUT });
      }
      (facturesEvolRes || []).forEach((f: any) => {
        if (!f.date_paiement) return;
        const d = new Date(f.date_paiement);
        const idx = evolutionCA.findIndex(p => p.mois === MOIS_LABELS[d.getMonth()]);
        if (idx >= 0) evolutionCA[idx].caFCFA += Number(f.montant_ttc || 0);
      });

      // Approbations
      const approbations: DashboardDGApprobation[] = [];
      devisAValider.forEach((d: any) => {
        const age = Math.floor((now.getTime() - new Date(d.created_at).getTime()) / 86400000);
        approbations.push({
          id: d.id, type: "DEVIS", reference: d.reference,
          titre: `${d.reference} · ${clientMap[d.client_id] || d.description || "Devis"}`,
          montantFCFA: Number(d.montant || 0),
          soumisParPrenom: profileMap[d.commercial_id] || "Commercial",
          createdAt: d.created_at, joursAttente: age, urgent: age > 7,
          lien: `/devis/${d.id}`,
        });
      });
      daList.filter((d: any) => d.statut === "SOUMISE_DG").forEach((d: any) => {
        const age = Math.floor((now.getTime() - new Date(d.created_at).getTime()) / 86400000);
        approbations.push({
          id: d.id, type: "ACHAT", reference: d.reference,
          titre: `${d.reference} · ${d.designation || d.description || "Demande d'achat"}`,
          montantFCFA: Number(d.montant_estime || 0),
          soumisParPrenom: profileMap[d.created_by] || "Service Achats",
          createdAt: d.created_at, joursAttente: age, urgent: age > 7,
          lien: "/achats",
        });
      });
      supplierInvPending.forEach((d: any) => {
        const age = Math.floor((now.getTime() - new Date(d.created_at).getTime()) / 86400000);
        approbations.push({
          id: d.id, type: "FACTURE_FOURN", reference: d.reference,
          titre: `${d.reference} · ${fournMap[d.supplier_id] || "Fournisseur"}`,
          montantFCFA: Number(d.amount || 0),
          soumisParPrenom: profileMap[d.created_by] || "Finance",
          createdAt: d.created_at, joursAttente: age, urgent: age > 7,
          lien: "/factures-fournisseurs",
        });
      });
      approbations.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Opérations en cours (table)
      const opsList = opsListRes.data || [];
      const camionMap: Record<string, string> = {};
      (camionsRes.data || []).forEach((c: any) => { camionMap[c.id] = c.immatriculation; });
      const chauffeurIds = [...new Set(opsList.filter((o: any) => o.chauffeur_id).map((o: any) => o.chauffeur_id))];
      const { data: chauffeursRes } = chauffeurIds.length > 0
        ? await supabase.from("chauffeurs").select("id, nom, prenom").in("id", chauffeurIds as any)
        : { data: [] as any[] };
      const chauffeurMap: Record<string, string> = {};
      (chauffeursRes || []).forEach((c: any) => {
        chauffeurMap[c.id] = `${c.prenom} ${(c.nom || "").charAt(0)}.`;
      });
      const opsActives = opsList.filter((o: any) => ["EN_COURS", "PLANIFIEE"].includes(o.statut)).slice(0, 5);
      const operationsEnCours: DashboardDGOperation[] = opsActives.map((o: any) => ({
        id: o.id, reference: o.reference,
        client: o.client_nom || clientMap[o.client_id] || "—",
        trajet: `${o.lieu_embarquement} → ${o.lieu_livraison}`,
        chauffeur: o.chauffeur_id ? (chauffeurMap[o.chauffeur_id] || "—") : "—",
        camion: o.camion_id ? (camionMap[o.camion_id] || "—") : "—",
        statut: o.statut,
      }));

      // Clients débiteurs
      const debiteursMap: Record<string, { nom: string; ref: string; montant: number; jours: number }> = {};
      facturesImpayees.forEach((f: any) => {
        const cid = f.client_id || "—";
        const reste = Number(f.montant_ttc || 0) - Number(f.montant_paye || 0);
        const jours = f.date_echeance ? Math.max(0, Math.floor((now.getTime() - new Date(f.date_echeance).getTime()) / 86400000)) : 0;
        if (reste <= 0) return;
        if (!debiteursMap[cid] || debiteursMap[cid].montant < reste) {
          debiteursMap[cid] = { nom: clientMap[cid] || "—", ref: f.reference, montant: reste, jours };
        }
      });
      const clientsDebiteurs = Object.values(debiteursMap)
        .sort((a, b) => b.montant - a.montant).slice(0, 5)
        .map(d => ({ clientNom: d.nom, factureRef: d.ref, montantFCFA: d.montant, joursRetard: d.jours }));

      // Top clients (sur la période — par CA payé)
      const topClientsMap: Record<string, { ca: number; nb: Set<string> }> = {};
      (facturesPeriodeRes.data || []).forEach((f: any) => {
        const cid = f.client_id || "—";
        if (!topClientsMap[cid]) topClientsMap[cid] = { ca: 0, nb: new Set() };
        topClientsMap[cid].ca += Number(f.montant_ttc || 0);
      });
      // Compte d'opérations sur la période
      const { data: opsPeriodeRes } = await supabase.from("operations")
        .select("id, client_id, lieu_embarquement, lieu_livraison")
        .gte("created_at", debutISO);
      (opsPeriodeRes || []).forEach((o: any) => {
        const cid = o.client_id || "—";
        if (topClientsMap[cid]) topClientsMap[cid].nb.add(o.id);
      });
      const topClients = Object.entries(topClientsMap)
        .map(([cid, v]) => ({ clientNom: clientMap[cid] || "—", caFCFA: v.ca, nbOperations: v.nb.size }))
        .sort((a, b) => b.caFCFA - a.caFCFA).slice(0, 5);

      // Répartition trajets sur la période
      const repCount = { interVilles: 0, port: 0, local: 0 };
      (opsPeriodeRes || []).forEach((o: any) => {
        const cat = trajetCategory(o.lieu_embarquement || "", o.lieu_livraison || "");
        repCount[cat]++;
      });
      const totalTraj = repCount.interVilles + repCount.port + repCount.local || 1;
      const repartitionTrajet = {
        interVillesPct: Math.round((repCount.interVilles / totalTraj) * 100),
        portPct: Math.round((repCount.port / totalTraj) * 100),
        localPct: Math.round((repCount.local / totalTraj) * 100),
      };

      // Parc status
      const camions = camionsRes.data || [];
      const totalCam = camions.length;
      const dispo = camions.filter((c: any) => c.statut === "DISPONIBLE").length;
      const enMission = camions.filter((c: any) => c.statut === "EN_MISSION").length;
      const enMaint = camions.filter((c: any) => c.statut === "EN_MAINTENANCE").length;
      // Docs expirant dans 30j
      const in30 = new Date(now.getTime() + 30 * 86400000);
      const docsExpirant = camions.filter((c: any) => {
        return [c.date_assurance, c.date_vignette, c.date_visite_tech]
          .some(d => d && new Date(d) <= in30);
      }).length;
      const maintList = maintenancesRes.data || [];
      const maintRetard = maintList.filter((m: any) => new Date(m.date_prevue) < now).length;
      const maintRetardJoursMax = maintList.reduce((max: number, m: any) => {
        const j = Math.floor((now.getTime() - new Date(m.date_prevue).getTime()) / 86400000);
        return j > max ? j : max;
      }, 0);

      // Agenda
      const agenda = (eventsRes.data || []).map((e: any) => ({
        id: e.id, titre: e.titre, dateDebut: e.date_debut, lieu: e.lieu, type: e.type_evenement,
      }));

      setData({
        kpis: {
          caMoisFCFA: caMois,
          caMoisPrecedentFCFA: caPrec,
          evolutionCaPct,
          nbDevisEnCours: devisEnCours.length,
          nbDevisAValider: devisAValider.length,
          nbMissionsActives: missionsActives,
          nbMissionsPlanifiees: missionsPlanifiees,
          facturesImpayeesFCFA: facturesImpayeesTotal,
          nbClientsDebiteurs: debiteurClientIds.size,
          nbApprobationsEnAttente,
        },
        alertesUrgentes,
        evolutionCA,
        approbations,
        operationsEnCours,
        statsOperations: {
          enCours: missionsActives,
          planifiees: missionsPlanifiees,
          terminees: missionsTerminees,
          aFacturer,
        },
        clientsDebiteurs,
        topClients,
        repartitionTrajet,
        parcStatus: {
          disponibles: dispo, enMission, enMaintenance: enMaint, total: totalCam,
          docsExpirant, maintRetard, maintRetardJoursMax,
        },
        agenda,
      });
    } catch (e) {
      console.error("[useDashboardDG]", e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [periode]);

  useEffect(() => {
    fetchAll();
    const id = window.setInterval(fetchAll, 3 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [fetchAll]);

  return useMemo(() => ({ data, isLoading, isError, refetch: fetchAll }), [data, isLoading, isError, fetchAll]);
}

export const OBJECTIF_CA_DEFAUT = OBJECTIF_DEFAUT;
