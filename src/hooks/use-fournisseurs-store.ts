import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CategorieFournisseur = "PIECES_AUTO" | "CARBURANT" | "PNEUMATIQUES" | "SERVICES" | "AUTRE";

export interface FournisseurRow {
  id: string;
  nom: string;
  contact: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  categorie: CategorieFournisseur;
  actif: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIE_FOURNISSEUR_CONFIG: Record<CategorieFournisseur, { label: string; color: string; bgColor: string }> = {
  PIECES_AUTO: { label: "Pièces auto", color: "text-primary", bgColor: "bg-primary/10" },
  CARBURANT: { label: "Carburant", color: "text-warning", bgColor: "bg-warning/10" },
  PNEUMATIQUES: { label: "Pneumatiques", color: "text-info", bgColor: "bg-info/10" },
  SERVICES: { label: "Services", color: "text-success", bgColor: "bg-success/10" },
  AUTRE: { label: "Autre", color: "text-muted-foreground", bgColor: "bg-muted" },
};

export function useFournisseursStore() {
  const [fournisseurs, setFournisseurs] = useState<FournisseurRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFournisseurs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("fournisseurs").select("*").order("nom");
    setFournisseurs((data || []) as FournisseurRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFournisseurs(); }, [fetchFournisseurs]);

  const addFournisseur = useCallback(async (f: Omit<FournisseurRow, "id" | "created_at" | "updated_at" | "created_by">) => {
    const { error } = await supabase.from("fournisseurs").insert(f as any);
    if (error) throw error;
    await fetchFournisseurs();
  }, [fetchFournisseurs]);

  const updateFournisseur = useCallback(async (id: string, updates: Partial<FournisseurRow>) => {
    const { error } = await supabase.from("fournisseurs").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchFournisseurs();
  }, [fetchFournisseurs]);

  const deleteFournisseur = useCallback(async (id: string) => {
    const { error } = await supabase.from("fournisseurs").delete().eq("id", id);
    if (error) throw error;
    await fetchFournisseurs();
  }, [fetchFournisseurs]);

  return { fournisseurs, loading, addFournisseur, updateFournisseur, deleteFournisseur, refetch: fetchFournisseurs };
}
