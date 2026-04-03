import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  devisEnCours: number;
  missionsActives: number;
  caMois: number;
  caMoisPrecedent: number;
  devisTrend: number;
  missionsTrend: number;
}

export interface OperationEnCours {
  id: string;
  reference: string;
  client_nom: string;
  trajet: string;
  camion: string;
  chauffeur: string;
  statut: string;
  date_depart: string | null;
  date_livraison_estimee: string | null;
}

export interface ChartDataPoint {
  mois: string;
  entrees: number;
  sorties: number;
}

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    devisEnCours: 0, missionsActives: 0, caMois: 0, caMoisPrecedent: 0, devisTrend: 0, missionsTrend: 0,
  });
  const [operations, setOperations] = useState<OperationEnCours[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const moisActuel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const moisPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const moisPrecedent = `${moisPrec.getFullYear()}-${String(moisPrec.getMonth() + 1).padStart(2, "0")}`;

    const [devisRes, opsActiveRes, facturesMoisRes, facturesPrecRes, opsListRes, decMoisRes, decPrecRes] = await Promise.all([
      // Devis en cours (non archivés, non refusés)
      supabase.from("devis").select("id", { count: "exact", head: true })
        .in("statut", ["BROUILLON", "SOUMIS_DG", "APPROUVE_DG", "ENVOYE_CLIENT"]),
      // Missions actives
      supabase.from("operations").select("id", { count: "exact", head: true })
        .in("statut", ["EN_COURS", "PLANIFIEE"]),
      // CA du mois (factures payées ce mois)
      supabase.from("factures").select("montant_ttc")
        .in("statut", ["PAYEE", "PARTIELLEMENT_PAYEE"])
        .gte("date_emission", `${moisActuel}-01`),
      // CA mois précédent
      supabase.from("factures").select("montant_ttc")
        .in("statut", ["PAYEE", "PARTIELLEMENT_PAYEE"])
        .gte("date_emission", `${moisPrecedent}-01`)
        .lt("date_emission", `${moisActuel}-01`),
      // Opérations en cours avec détails
      supabase.from("operations").select("id, reference, client_nom, lieu_embarquement, lieu_livraison, statut, date_depart, date_livraison_estimee, camion_id, chauffeur_id")
        .in("statut", ["EN_COURS", "PLANIFIEE"])
        .order("date_depart", { ascending: true })
        .limit(5),
      // Décaissements du mois
      supabase.from("decaissements").select("montant")
        .eq("statut", "PAYE")
        .gte("date_paiement", `${moisActuel}-01`),
      // Décaissements mois précédent
      supabase.from("decaissements").select("montant")
        .eq("statut", "PAYE")
        .gte("date_paiement", `${moisPrecedent}-01`)
        .lt("date_paiement", `${moisActuel}-01`),
    ]);

    const caMois = (facturesMoisRes.data || []).reduce((s: number, f: any) => s + (f.montant_ttc || 0), 0);
    const caPrec = (facturesPrecRes.data || []).reduce((s: number, f: any) => s + (f.montant_ttc || 0), 0);

    setStats({
      devisEnCours: devisRes.count || 0,
      missionsActives: opsActiveRes.count || 0,
      caMois,
      caMoisPrecedent: caPrec,
      devisTrend: 0,
      missionsTrend: 0,
    });

    // Fetch camion/chauffeur names for operations
    const opsList = opsListRes.data || [];
    const camionIds = [...new Set(opsList.filter((o: any) => o.camion_id).map((o: any) => o.camion_id))];
    const chauffeurIds = [...new Set(opsList.filter((o: any) => o.chauffeur_id).map((o: any) => o.chauffeur_id))];

    const [camionsRes, chauffeursRes] = await Promise.all([
      camionIds.length > 0 ? supabase.from("camions").select("id, immatriculation").in("id", camionIds) : { data: [] },
      chauffeurIds.length > 0 ? supabase.from("chauffeurs").select("id, nom, prenom").in("id", chauffeurIds) : { data: [] },
    ]);

    const camionMap: Record<string, string> = {};
    (camionsRes.data || []).forEach((c: any) => { camionMap[c.id] = c.immatriculation; });
    const chauffeurMap: Record<string, string> = {};
    (chauffeursRes.data || []).forEach((c: any) => { chauffeurMap[c.id] = `${c.prenom} ${c.nom}`; });

    setOperations(opsList.map((o: any) => ({
      id: o.id,
      reference: o.reference,
      client_nom: o.client_nom || "—",
      trajet: `${o.lieu_embarquement} → ${o.lieu_livraison}`,
      camion: o.camion_id ? (camionMap[o.camion_id] || "—") : "—",
      chauffeur: o.chauffeur_id ? (chauffeurMap[o.chauffeur_id] || "—") : "—",
      statut: o.statut,
      date_depart: o.date_depart,
      date_livraison_estimee: o.date_livraison_estimee,
    })));

    // Chart: 6 derniers mois entrées/sorties
    const chartPoints: ChartDataPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const moisKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const moisFin = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
      chartPoints.push({ mois: MOIS_LABELS[d.getMonth()], entrees: 0, sorties: 0 });
    }

    // Fetch all factures and decaissements for last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
    const [allFactRes, allDecRes] = await Promise.all([
      supabase.from("factures").select("montant_ttc, montant_paye, date_emission, statut")
        .gte("date_emission", sixMonthsAgo)
        .in("statut", ["PAYEE", "PARTIELLEMENT_PAYEE", "ENVOYEE"]),
      supabase.from("decaissements").select("montant, date_paiement, statut, created_at")
        .eq("statut", "PAYE")
        .gte("created_at", sixMonthsAgo),
    ]);

    (allFactRes.data || []).forEach((f: any) => {
      const d = new Date(f.date_emission);
      const idx = chartPoints.findIndex(p => p.mois === MOIS_LABELS[d.getMonth()]);
      if (idx >= 0) chartPoints[idx].entrees += f.montant_paye || f.montant_ttc || 0;
    });

    (allDecRes.data || []).forEach((d: any) => {
      const date = new Date(d.date_paiement || d.created_at);
      const idx = chartPoints.findIndex(p => p.mois === MOIS_LABELS[date.getMonth()]);
      if (idx >= 0) chartPoints[idx].sorties += d.montant || 0;
    });

    setChartData(chartPoints);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { stats, operations, chartData, loading, refetch: fetchAll };
}
