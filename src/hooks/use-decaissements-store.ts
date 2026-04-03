import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatutDecaissement = "EN_ATTENTE" | "APPROUVE" | "PAYE" | "REJETE";

export interface DecaissementRow {
  id: string;
  reference: string;
  demande_achat_id: string | null;
  devis_fournisseur_id: string | null;
  montant: number;
  statut: StatutDecaissement;
  motif: string | null;
  reference_paiement: string | null;
  date_paiement: string | null;
  commentaire: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUT_DECAISSEMENT_CONFIG: Record<StatutDecaissement, { label: string; color: string; bgColor: string }> = {
  EN_ATTENTE: { label: "En attente", color: "text-warning", bgColor: "bg-warning/10" },
  APPROUVE: { label: "Approuvé", color: "text-info", bgColor: "bg-info/10" },
  PAYE: { label: "Payé", color: "text-success", bgColor: "bg-success/10" },
  REJETE: { label: "Rejeté", color: "text-destructive", bgColor: "bg-destructive/10" },
};

export function useDecaissementsStore() {
  const [decaissements, setDecaissements] = useState<DecaissementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDecaissements = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("decaissements")
      .select("*")
      .order("created_at", { ascending: false });
    setDecaissements((data || []) as DecaissementRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDecaissements(); }, [fetchDecaissements]);

  const updateDecaissement = useCallback(async (id: string, updates: Partial<DecaissementRow>) => {
    const { error } = await supabase.from("decaissements").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchDecaissements();
  }, [fetchDecaissements]);

  const addDecaissement = useCallback(async (data: { montant: number; motif: string; commentaire?: string }) => {
    const { error } = await supabase.from("decaissements").insert({
      montant: data.montant,
      motif: data.motif,
      commentaire: data.commentaire || "",
      statut: "EN_ATTENTE",
    } as any);
    if (error) throw error;
    await fetchDecaissements();
  }, [fetchDecaissements]);

  const deleteDecaissement = useCallback(async (id: string) => {
    const { error } = await supabase.from("decaissements").delete().eq("id", id);
    if (error) throw error;
    await fetchDecaissements();
  }, [fetchDecaissements]);

  const stats = {
    total: decaissements.length,
    enAttente: decaissements.filter(d => d.statut === "EN_ATTENTE").length,
    approuve: decaissements.filter(d => d.statut === "APPROUVE").length,
    paye: decaissements.filter(d => d.statut === "PAYE").length,
    montantTotal: decaissements.filter(d => d.statut === "PAYE").reduce((s, d) => s + d.montant, 0),
    montantEnAttente: decaissements.filter(d => d.statut === "EN_ATTENTE" || d.statut === "APPROUVE").reduce((s, d) => s + d.montant, 0),
  };

  return { decaissements, loading, stats, updateDecaissement, addDecaissement, deleteDecaissement, refetch: fetchDecaissements };
}
