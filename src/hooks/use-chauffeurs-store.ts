import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatutChauffeur = "DISPONIBLE" | "EN_MISSION" | "EN_REPOS" | "INDISPONIBLE";

export interface ChauffeurRow {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  numero_permis: string | null;
  type_permis: string | null;
  date_expiration_permis: string | null;
  experience_annees: number;
  disponible: boolean;
  statut: StatutChauffeur;
  camion_assigne_id: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUT_CHAUFFEUR_CONFIG: Record<StatutChauffeur, { label: string; color: string; bgColor: string }> = {
  DISPONIBLE: { label: "Disponible", color: "text-success", bgColor: "bg-success/10" },
  EN_MISSION: { label: "En mission", color: "text-info", bgColor: "bg-info/10" },
  EN_REPOS: { label: "En repos", color: "text-warning", bgColor: "bg-warning/10" },
  INDISPONIBLE: { label: "Indisponible", color: "text-destructive", bgColor: "bg-destructive/10" },
};

export function useChauffeursStore() {
  const [chauffeurs, setChauffeurs] = useState<ChauffeurRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChauffeurs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("chauffeurs").select("*").order("nom");
    setChauffeurs((data || []) as ChauffeurRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchChauffeurs(); }, [fetchChauffeurs]);

  const stats = {
    total: chauffeurs.length,
    disponible: chauffeurs.filter(c => c.statut === "DISPONIBLE").length,
    enMission: chauffeurs.filter(c => c.statut === "EN_MISSION").length,
    permisExpirant: chauffeurs.filter(c => {
      if (!c.date_expiration_permis) return false;
      const exp = new Date(c.date_expiration_permis);
      const inThirtyDays = new Date();
      inThirtyDays.setDate(inThirtyDays.getDate() + 30);
      return exp <= inThirtyDays;
    }).length,
  };

  const addChauffeur = useCallback(async (c: Omit<ChauffeurRow, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("chauffeurs").insert(c as any);
    if (error) throw error;
    await fetchChauffeurs();
  }, [fetchChauffeurs]);

  const updateChauffeur = useCallback(async (id: string, updates: Partial<ChauffeurRow>) => {
    const { error } = await supabase.from("chauffeurs").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchChauffeurs();
  }, [fetchChauffeurs]);

  const deleteChauffeur = useCallback(async (id: string) => {
    const { error } = await supabase.from("chauffeurs").delete().eq("id", id);
    if (error) throw error;
    await fetchChauffeurs();
  }, [fetchChauffeurs]);

  return { chauffeurs, loading, stats, addChauffeur, updateChauffeur, deleteChauffeur, refetch: fetchChauffeurs };
}
