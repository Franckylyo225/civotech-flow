import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SidebarCounts {
  approbations: number;
  devis: number;
  operations: number;
  factures: number;
  achats: number;
  parcAuto: number;
  notifications: number;
}

export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>({
    approbations: 0, devis: 0, operations: 0, factures: 0, achats: 0, parcAuto: 0, notifications: 0,
  });

  const fetchCounts = useCallback(async () => {
    const [
      devisRes,
      opsRes,
      facturesRes,
      daRes,
      decRes,
      maintRes,
      notifRes,
    ] = await Promise.all([
      supabase.from("devis").select("id", { count: "exact", head: true }).eq("statut", "SOUMIS_DG"),
      supabase.from("operations").select("id", { count: "exact", head: true }).in("statut", ["DEMANDE", "PLANIFIEE", "EN_COURS"]),
      supabase.from("factures").select("id", { count: "exact", head: true }).in("statut", ["ENVOYEE", "PARTIELLEMENT_PAYEE"]),
      supabase.from("demandes_achat").select("id", { count: "exact", head: true }).eq("statut", "SOUMISE_DG"),
      supabase.from("decaissements").select("id", { count: "exact", head: true }).eq("statut", "EN_ATTENTE"),
      supabase.from("maintenances").select("id", { count: "exact", head: true }).in("statut", ["PLANIFIEE", "EN_COURS"]),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("lue", false),
    ]);

    setCounts({
      approbations: (devisRes.count || 0) + (daRes.count || 0) + (decRes.count || 0),
      devis: devisRes.count || 0,
      operations: opsRes.count || 0,
      factures: facturesRes.count || 0,
      achats: daRes.count || 0,
      parcAuto: maintRes.count || 0,
      notifications: notifRes.count || 0,
    });
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return { counts, refetch: fetchCounts };
}
