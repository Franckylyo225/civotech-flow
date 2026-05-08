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
  km_max: number;
  date_assurance: string | null;
  date_visite_tech: string | null;
  date_vignette: string | null;
  date_ajout: string;
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

const FIELDS = [
  "immatriculation","marque","modele","type_vehicule","capacite_tonnes","annee",
  "km_actuel","km_max","date_assurance","date_visite_tech","date_vignette","date_ajout","statut",
] as const;

export function useParcAutoStore() {
  const [camions, setCamions] = useState<CamionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCamions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("camions").select("*").order("immatriculation");
    setCamions((data || []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCamions(); }, [fetchCamions]);

  const stats: CamionStats = {
    total: camions.length,
    disponible: camions.filter(c => c.statut === "DISPONIBLE").length,
    enMission: camions.filter(c => c.statut === "EN_MISSION").length,
    enMaintenance: camions.filter(c => c.statut === "EN_MAINTENANCE").length,
  };

  const buildPayload = (input: Partial<CamionRow>) => {
    const out: any = {};
    FIELDS.forEach(f => { if (input[f] !== undefined) out[f] = (input as any)[f]; });
    return out;
  };

  const addCamion = useCallback(async (camion: Partial<CamionRow>) => {
    const { error } = await supabase.from("camions").insert(buildPayload(camion));
    if (error) throw error;
    await fetchCamions();
  }, [fetchCamions]);

  const updateCamion = useCallback(async (id: string, updates: Partial<CamionRow>) => {
    const { error } = await supabase.from("camions").update(buildPayload(updates)).eq("id", id);
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
