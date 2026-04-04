import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EvenementCalendrier {
  id: string;
  titre: string;
  description: string;
  date_debut: string;
  date_fin: string;
  lieu: string;
  type_evenement: "REUNION" | "RDV" | "DEPLACEMENT" | "RAPPEL" | "AUTRE";
  couleur: string;
  toute_journee: boolean;
  rappel_minutes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EvenementInput = Omit<EvenementCalendrier, "id" | "created_at" | "updated_at" | "created_by">;

export function useCalendrierStore() {
  const [evenements, setEvenements] = useState<EvenementCalendrier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvenements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("evenements_calendrier")
      .select("*")
      .order("date_debut", { ascending: true });
    if (error) {
      toast.error("Impossible de charger les événements");
    } else {
      setEvenements(data as EvenementCalendrier[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvenements(); }, [fetchEvenements]);

  const addEvenement = async (input: EvenementInput) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("evenements_calendrier").insert({
      ...input,
      created_by: userData.user?.id || null,
    } as any);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Événement ajouté");
    await fetchEvenements();
    return true;
  };

  const updateEvenement = async (id: string, input: Partial<EvenementInput>) => {
    const updateData: any = { ...input };
    if (input.date_debut || input.rappel_minutes !== undefined) {
      updateData.rappel_envoye = false;
    }
    const { error } = await supabase.from("evenements_calendrier").update(updateData).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Événement modifié");
    await fetchEvenements();
    return true;
  };

  const deleteEvenement = async (id: string) => {
    const { error } = await supabase.from("evenements_calendrier").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Événement supprimé");
    await fetchEvenements();
    return true;
  };

  return { evenements, loading, fetchEvenements, addEvenement, updateEvenement, deleteEvenement };
}
