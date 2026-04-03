import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TypeMaintenance = "PREVENTIVE" | "CORRECTIVE" | "REMPLACEMENT";
export type StatutMaintenance = "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "ANNULEE";

export interface MaintenanceRow {
  id: string;
  camion_id: string;
  type: TypeMaintenance;
  description: string;
  pieces_changees: string | null;
  cout_estime: number;
  cout_reel: number | null;
  date_prevue: string;
  date_debut: string | null;
  date_fin: string | null;
  statut: StatutMaintenance;
  km_declenchement: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const TYPE_MAINTENANCE_CONFIG: Record<TypeMaintenance, { label: string; color: string; bgColor: string }> = {
  PREVENTIVE: { label: "Préventive", color: "text-info", bgColor: "bg-info/10" },
  CORRECTIVE: { label: "Corrective", color: "text-warning", bgColor: "bg-warning/10" },
  REMPLACEMENT: { label: "Remplacement", color: "text-destructive", bgColor: "bg-destructive/10" },
};

export const STATUT_MAINTENANCE_CONFIG: Record<StatutMaintenance, { label: string; color: string; bgColor: string }> = {
  PLANIFIEE: { label: "Planifiée", color: "text-info", bgColor: "bg-info/10" },
  EN_COURS: { label: "En cours", color: "text-warning", bgColor: "bg-warning/10" },
  TERMINEE: { label: "Terminée", color: "text-success", bgColor: "bg-success/10" },
  ANNULEE: { label: "Annulée", color: "text-muted-foreground", bgColor: "bg-muted" },
};

export function useMaintenancesStore() {
  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaintenances = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("maintenances").select("*").order("date_prevue", { ascending: false });
    setMaintenances((data || []) as MaintenanceRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMaintenances(); }, [fetchMaintenances]);

  const stats = {
    total: maintenances.length,
    planifiee: maintenances.filter(m => m.statut === "PLANIFIEE").length,
    enCours: maintenances.filter(m => m.statut === "EN_COURS").length,
    terminee: maintenances.filter(m => m.statut === "TERMINEE").length,
    coutTotal: maintenances.reduce((s, m) => s + (m.cout_reel || m.cout_estime), 0),
  };

  const addMaintenance = useCallback(async (m: Omit<MaintenanceRow, "id" | "created_at" | "updated_at" | "created_by">): Promise<MaintenanceRow> => {
    const { data, error } = await supabase.from("maintenances").insert(m as any).select().single();
    if (error) throw error;
    await fetchMaintenances();
    return data as MaintenanceRow;
  }, [fetchMaintenances]);

  const updateMaintenance = useCallback(async (id: string, updates: Partial<MaintenanceRow>) => {
    const { error } = await supabase.from("maintenances").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchMaintenances();
  }, [fetchMaintenances]);

  const deleteMaintenance = useCallback(async (id: string) => {
    const { error } = await supabase.from("maintenances").delete().eq("id", id);
    if (error) throw error;
    await fetchMaintenances();
  }, [fetchMaintenances]);

  return { maintenances, loading, stats, addMaintenance, updateMaintenance, deleteMaintenance, refetch: fetchMaintenances };
}
