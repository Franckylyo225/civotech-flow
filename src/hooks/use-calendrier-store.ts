import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const fetchEvenements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("evenements_calendrier")
      .select("*")
      .order("date_debut", { ascending: true });
    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les événements", variant: "destructive" });
    } else {
      setEvenements(data as EvenementCalendrier[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchEvenements(); }, [fetchEvenements]);

  const addEvenement = async (input: EvenementInput) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("evenements_calendrier").insert({
      ...input,
      created_by: userData.user?.id || null,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Événement ajouté" });
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Événement modifié" });
    await fetchEvenements();
    return true;
  };

  const deleteEvenement = async (id: string) => {
    const { error } = await supabase.from("evenements_calendrier").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Événement supprimé" });
    await fetchEvenements();
    return true;
  };

  return { evenements, loading, fetchEvenements, addEvenement, updateEvenement, deleteEvenement };
}
