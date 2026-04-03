import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DevisFournisseurRow {
  id: string;
  demande_achat_id: string;
  fournisseur_id: string;
  montant: number;
  delai_livraison_jours: number;
  conditions: string | null;
  document_url: string | null;
  retenu: boolean;
  commentaire: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDevisFournisseursStore(demandeAchatId?: string) {
  const [devisFournisseurs, setDevisFournisseurs] = useState<DevisFournisseurRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevis = useCallback(async () => {
    if (!demandeAchatId) { setDevisFournisseurs([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("devis_fournisseurs")
      .select("*")
      .eq("demande_achat_id", demandeAchatId)
      .order("montant", { ascending: true });
    setDevisFournisseurs((data || []) as DevisFournisseurRow[]);
    setLoading(false);
  }, [demandeAchatId]);

  useEffect(() => { fetchDevis(); }, [fetchDevis]);

  const addDevis = useCallback(async (d: Omit<DevisFournisseurRow, "id" | "created_at" | "updated_at" | "created_by">) => {
    const { error } = await supabase.from("devis_fournisseurs").insert(d as any);
    if (error) throw error;
    await fetchDevis();
  }, [fetchDevis]);

  const updateDevis = useCallback(async (id: string, updates: Partial<DevisFournisseurRow>) => {
    const { error } = await supabase.from("devis_fournisseurs").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchDevis();
  }, [fetchDevis]);

  const deleteDevis = useCallback(async (id: string) => {
    const { error } = await supabase.from("devis_fournisseurs").delete().eq("id", id);
    if (error) throw error;
    await fetchDevis();
  }, [fetchDevis]);

  const selectDevis = useCallback(async (id: string) => {
    // Unselect all others, select this one
    if (!demandeAchatId) return;
    await supabase.from("devis_fournisseurs").update({ retenu: false } as any).eq("demande_achat_id", demandeAchatId);
    await supabase.from("devis_fournisseurs").update({ retenu: true } as any).eq("id", id);
    await fetchDevis();
  }, [demandeAchatId, fetchDevis]);

  return { devisFournisseurs, loading, addDevis, updateDevis, deleteDevis, selectDevis, refetch: fetchDevis };
}
