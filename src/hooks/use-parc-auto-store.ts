import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatutCamion = "DISPONIBLE" | "EN_MISSION" | "EN_MAINTENANCE";

export interface CamionRow {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type_vehicule: string;
  capacite_tonnes: number;
  annee: number;
  km_actuel: number;
  statut: StatutCamion;
  created_at: string;
  updated_at: string;
}

export interface CamionStats {
  total: number;
  disponible: number;
  enMission: number;
  enMaintenance: number;
}

export const STATUT_CAMION_CONFIG: Record<StatutCamion, { label: string; color: string; bgColor: string }> = {
  DISPONIBLE: { label: "Disponible", color: "text-success", bgColor: "bg-success/10" },
  EN_MISSION: { label: "En mission", color: "text-info", bgColor: "bg-info/10" },
  EN_MAINTENANCE: { label: "Maintenance", color: "text-warning", bgColor: "bg-warning/10" },
};

export function useParcAutoStore() {
  const [camions, setCamions] = useState<CamionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCamions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("camions").select("*").order("immatriculation");
    setCamions((data || []) as CamionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCamions(); }, [fetchCamions]);

  const stats: CamionStats = {
    total: camions.length,
    disponible: camions.filter(c => c.statut === "DISPONIBLE").length,
    enMission: camions.filter(c => c.statut === "EN_MISSION").length,
    enMaintenance: camions.filter(c => c.statut === "EN_MAINTENANCE").length,
  };

  const addCamion = useCallback(async (camion: Omit<CamionRow, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("camions").insert({
      immatriculation: camion.immatriculation,
      marque: camion.marque,
      modele: camion.modele,
      type_vehicule: camion.type_vehicule,
      capacite_tonnes: camion.capacite_tonnes,
      annee: camion.annee,
      km_actuel: camion.km_actuel,
      statut: camion.statut as any,
    });
    if (error) throw error;
    await fetchCamions();
  }, [fetchCamions]);

  const updateCamion = useCallback(async (id: string, updates: Partial<Omit<CamionRow, "id" | "created_at" | "updated_at">>) => {
    const dbUpdates: any = {};
    if (updates.immatriculation !== undefined) dbUpdates.immatriculation = updates.immatriculation;
    if (updates.marque !== undefined) dbUpdates.marque = updates.marque;
    if (updates.modele !== undefined) dbUpdates.modele = updates.modele;
    if (updates.type_vehicule !== undefined) dbUpdates.type_vehicule = updates.type_vehicule;
    if (updates.capacite_tonnes !== undefined) dbUpdates.capacite_tonnes = updates.capacite_tonnes;
    if (updates.annee !== undefined) dbUpdates.annee = updates.annee;
    if (updates.km_actuel !== undefined) dbUpdates.km_actuel = updates.km_actuel;
    if (updates.statut !== undefined) dbUpdates.statut = updates.statut;
    const { error } = await supabase.from("camions").update(dbUpdates).eq("id", id);
    if (error) throw error;
    await fetchCamions();
  }, [fetchCamions]);

  const deleteCamion = useCallback(async (id: string) => {
    const { error } = await supabase.from("camions").delete().eq("id", id);
    if (error) throw error;
    await fetchCamions();
  }, [fetchCamions]);

  return { camions, loading, stats, addCamion, updateCamion, deleteCamion, refetch: fetchCamions };
}
