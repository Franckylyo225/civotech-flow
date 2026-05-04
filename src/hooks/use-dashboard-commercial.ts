import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Periode = "7jours" | "mois" | "trimestre" | "annee";

export interface CommercialDashboardData {
  periode: Periode;
  kpis: {
    caSigne: number;
    caSignePrecedent: number;
    evolutionCaPct: number;
    nbDevisTotal: number;
    nbDevisValides: number;
    nbDevisRefuses: number;
    tauxConversion: number;
    panierMoyen: number;
  };
  pipeline: {
    brouillon: number;
    soumis: number;
    envoye: number;
    valide: number;
    refuse: number;
    valeurTotale: number;
  };
  evolutionCA: { mois: string; caFCFA: number }[];
  topClients: { id: string; nom: string; total: number }[];
  suiviPaiements: SuiviPaiement[];
  alertes: Alerte[];
  operationsRecentes: OperationRecente[];
}

export interface SuiviPaiement {
  id: string;
  reference: string;
  client: string;
  montant: number;
  dateEmission: string;
  statut: "PAYEE" | "EN_ATTENTE" | "EN_RETARD";
  joursRetard?: number;
}

export interface Alerte {
  id: string;
  niveau: "DANGER" | "WARNING" | "INFO" | "SUCCESS";
  message: string;
  sousTexte?: string;
  date: string;
  lien?: string;
}

export interface OperationRecente {
  id: string;
  reference: string;
  client: string;
  trajet: string;
  statut: string;
  date: string;
}

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jui", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function getPeriodeRange(periode: Periode): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  switch (periode) {
    case "7jours":
      start = new Date(now); start.setDate(now.getDate() - 7); break;
    case "trimestre": {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1); break;
    }
    case "annee":
      start = new Date(now.getFullYear(), 0, 1); break;
    case "mois":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1); break;
  }
  const ms = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - ms);
  return { start, end, previousStart, previousEnd };
}

async function fetchCommercialDashboard(periode: Periode, userId: string | undefined): Promise<CommercialDashboardData> {
  const { start, end, previousStart, previousEnd } = getPeriodeRange(periode);
  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const prevStartISO = previousStart.toISOString();
  const prevEndISO = previousEnd.toISOString();

  // Devis sur la période
  const { data: devisPeriode } = await supabase
    .from("devis")
    .select("id, montant, statut, client_id, created_at")
    .gte("created_at", startISO)
    .lte("created_at", endISO);

  const { data: devisPrev } = await supabase
    .from("devis")
    .select("montant, statut")
    .gte("created_at", prevStartISO)
    .lte("created_at", prevEndISO)
    .eq("statut", "VALIDE_CLIENT");

  // Pipeline = état actuel
  const { data: devisActifs } = await supabase
    .from("devis")
    .select("statut, montant");

  const periodeRows = devisPeriode || [];
  const valides = periodeRows.filter((d) => d.statut === "VALIDE_CLIENT");
  const refuses = periodeRows.filter((d) => d.statut === "REFUSE_CLIENT" || d.statut === "REFUSE_DG");
  const caSigne = valides.reduce((s, d) => s + (d.montant || 0), 0);
  const caPrev = (devisPrev || []).reduce((s, d) => s + (d.montant || 0), 0);
  const evolutionCaPct = caPrev > 0 ? ((caSigne - caPrev) / caPrev) * 100 : caSigne > 0 ? 100 : 0;
  const nbDevisTotal = periodeRows.length;
  const nbDevisValides = valides.length;
  const tauxConversion = nbDevisTotal > 0 ? (nbDevisValides / nbDevisTotal) * 100 : 0;
  const panierMoyen = caSigne / Math.max(nbDevisValides, 1);

  // Pipeline counts (état actuel)
  const actifs = devisActifs || [];
  const pipelineCount = (statuts: string[]) => actifs.filter((d) => statuts.includes(d.statut)).length;
  const pipelineSum = (statuts: string[]) =>
    actifs.filter((d) => statuts.includes(d.statut)).reduce((s, d) => s + (d.montant || 0), 0);
  const pipeline = {
    brouillon: pipelineCount(["BROUILLON"]),
    soumis: pipelineCount(["SOUMIS_DG", "APPROUVE_DG"]),
    envoye: pipelineCount(["ENVOYE_CLIENT"]),
    valide: pipelineCount(["VALIDE_CLIENT"]),
    refuse: pipelineCount(["REFUSE_DG", "REFUSE_CLIENT"]),
    valeurTotale: pipelineSum(["BROUILLON", "SOUMIS_DG", "APPROUVE_DG", "ENVOYE_CLIENT"]),
  };

  // Évolution CA — 6 derniers mois
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const { data: devis6mois } = await supabase
    .from("devis")
    .select("montant, created_at, statut")
    .eq("statut", "VALIDE_CLIENT")
    .gte("created_at", sixMonthsAgo.toISOString());

  const evolutionCA: { mois: string; caFCFA: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    evolutionCA.push({ mois: MOIS_LABELS[d.getMonth()], caFCFA: 0 });
  }
  (devis6mois || []).forEach((d) => {
    const dt = new Date(d.created_at);
    const idx = 5 - ((now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth()));
    if (idx >= 0 && idx < 6) evolutionCA[idx].caFCFA += d.montant || 0;
  });

  // Top clients (sur la période, validés)
  const clientTotals = new Map<string, number>();
  valides.forEach((d) => {
    if (!d.client_id) return;
    clientTotals.set(d.client_id, (clientTotals.get(d.client_id) || 0) + (d.montant || 0));
  });
  const topIds = [...clientTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const clientNames: Record<string, string> = {};
  if (topIds.length) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, nom")
      .in("id", topIds.map((t) => t[0]));
    (clients || []).forEach((c) => { clientNames[c.id] = c.nom; });
  }
  const topClients = topIds.map(([id, total]) => ({ id, nom: clientNames[id] || "—", total }));

  // Suivi paiements
  const { data: factures } = await supabase
    .from("factures")
    .select("id, reference, montant_ttc, date_emission, statut, client_id")
    .order("date_emission", { ascending: false })
    .limit(15);

  const factureRows = factures || [];
  const clientFactIds = [...new Set(factureRows.filter((f) => f.client_id).map((f) => f.client_id as string))];
  const clientFactNames: Record<string, string> = {};
  if (clientFactIds.length) {
    const { data: cl } = await supabase.from("clients").select("id, nom").in("id", clientFactIds);
    (cl || []).forEach((c) => { clientFactNames[c.id] = c.nom; });
  }
  const today = new Date();
  const suiviPaiements: SuiviPaiement[] = factureRows.map((f) => {
    const dEmission = new Date(f.date_emission);
    const jours = Math.floor((today.getTime() - dEmission.getTime()) / (1000 * 60 * 60 * 24));
    let statut: SuiviPaiement["statut"] = "EN_ATTENTE";
    if (f.statut === "PAYEE") statut = "PAYEE";
    else if (f.statut === "ENVOYEE" && jours > 30) statut = "EN_RETARD";
    return {
      id: f.id,
      reference: f.reference,
      client: f.client_id ? clientFactNames[f.client_id] || "—" : "—",
      montant: f.montant_ttc,
      dateEmission: f.date_emission,
      statut,
      joursRetard: statut === "EN_RETARD" ? jours - 30 : undefined,
    };
  });

  // Alertes
  const alertes: Alerte[] = [];
  suiviPaiements.filter((p) => p.statut === "EN_RETARD").slice(0, 3).forEach((p) => {
    alertes.push({
      id: `r-${p.id}`,
      niveau: "DANGER",
      message: `Facture ${p.reference} en retard`,
      sousTexte: `${p.client} · ${p.joursRetard} jours de retard`,
      date: p.dateEmission,
      lien: "/finance",
    });
  });

  const seuil48h = new Date(today.getTime() - 48 * 3600 * 1000).toISOString();
  const { data: devisSoumis } = await supabase
    .from("devis")
    .select("id, reference, created_at")
    .eq("statut", "SOUMIS_DG")
    .lt("updated_at", seuil48h)
    .limit(3);
  (devisSoumis || []).forEach((d) => {
    alertes.push({
      id: `s-${d.id}`,
      niveau: "WARNING",
      message: `Devis ${d.reference} en attente DG > 48h`,
      date: d.created_at,
      lien: `/devis/${d.id}`,
    });
  });

  const seuil5j = new Date(today.getTime() - 5 * 24 * 3600 * 1000).toISOString();
  const { data: devisEnvoyes } = await supabase
    .from("devis")
    .select("id, reference, updated_at")
    .eq("statut", "ENVOYE_CLIENT")
    .lt("updated_at", seuil5j)
    .limit(3);
  (devisEnvoyes || []).forEach((d) => {
    alertes.push({
      id: `e-${d.id}`,
      niveau: "INFO",
      message: `Devis ${d.reference} sans réponse client > 5j`,
      date: d.updated_at,
      lien: `/devis/${d.id}`,
    });
  });

  const seuil24h = new Date(today.getTime() - 24 * 3600 * 1000).toISOString();
  const { data: opsTerminees } = await supabase
    .from("operations")
    .select("id, reference, client_nom, updated_at, bon_livraison_url")
    .eq("statut", "TERMINEE")
    .gte("updated_at", seuil24h)
    .limit(3);
  (opsTerminees || []).forEach((o) => {
    if (o.bon_livraison_url) {
      alertes.push({
        id: `bl-${o.id}`,
        niveau: "SUCCESS",
        message: `BL uploadé · ${o.reference}`,
        sousTexte: o.client_nom,
        date: o.updated_at,
        lien: `/operations`,
      });
    }
  });

  // Opérations récentes
  const { data: opsRecentes } = await supabase
    .from("operations")
    .select("id, reference, client_nom, lieu_embarquement, lieu_livraison, statut, created_at")
    .order("created_at", { ascending: false })
    .limit(6);
  const operationsRecentes: OperationRecente[] = (opsRecentes || []).map((o) => ({
    id: o.id,
    reference: o.reference,
    client: o.client_nom || "—",
    trajet: `${o.lieu_embarquement} → ${o.lieu_livraison}`,
    statut: o.statut,
    date: o.created_at,
  }));

  return {
    periode,
    kpis: {
      caSigne,
      caSignePrecedent: caPrev,
      evolutionCaPct,
      nbDevisTotal,
      nbDevisValides,
      nbDevisRefuses: refuses.length,
      tauxConversion,
      panierMoyen,
    },
    pipeline,
    evolutionCA,
    topClients,
    suiviPaiements: suiviPaiements.slice(0, 6),
    alertes: alertes.slice(0, 6),
    operationsRecentes,
  };
}

export function useDashboardCommercial(periode: Periode, userId?: string) {
  return useQuery({
    queryKey: ["dashboard", "commercial", periode, userId],
    queryFn: () => fetchCommercialDashboard(periode, userId),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
