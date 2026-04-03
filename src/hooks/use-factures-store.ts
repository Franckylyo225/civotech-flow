import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatutFacture = "BROUILLON" | "ENVOYEE" | "PARTIELLEMENT_PAYEE" | "PAYEE" | "ANNULEE";

export interface FactureRow {
  id: string;
  reference: string;
  operation_id: string | null;
  client_id: string | null;
  montant_ht: number;
  taux_tva: number;
  montant_tva: number;
  montant_ttc: number;
  date_emission: string;
  date_echeance: string | null;
  statut: StatutFacture;
  montant_paye: number;
  mode_paiement: string | null;
  reference_paiement: string | null;
  date_paiement: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUT_FACTURE_CONFIG: Record<StatutFacture, { label: string; color: string; bgColor: string }> = {
  BROUILLON: { label: "Brouillon", color: "text-muted-foreground", bgColor: "bg-muted" },
  ENVOYEE: { label: "Envoyée", color: "text-info", bgColor: "bg-info/10" },
  PARTIELLEMENT_PAYEE: { label: "Partielle", color: "text-warning", bgColor: "bg-warning/10" },
  PAYEE: { label: "Payée", color: "text-success", bgColor: "bg-success/10" },
  ANNULEE: { label: "Annulée", color: "text-destructive", bgColor: "bg-destructive/10" },
};

export function useFacturesStore() {
  const [factures, setFactures] = useState<FactureRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFactures = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("factures").select("*").order("created_at", { ascending: false });
    setFactures((data || []) as FactureRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFactures(); }, [fetchFactures]);

  const addFacture = useCallback(async (f: Partial<FactureRow>) => {
    const { error } = await supabase.from("factures").insert({ ...f, reference: "" } as any);
    if (error) throw error;
    await fetchFactures();
  }, [fetchFactures]);

  const updateFacture = useCallback(async (id: string, updates: Partial<FactureRow>) => {
    const { error } = await supabase.from("factures").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchFactures();
  }, [fetchFactures]);

  const deleteFacture = useCallback(async (id: string) => {
    const { error } = await supabase.from("factures").delete().eq("id", id);
    if (error) throw error;
    await fetchFactures();
  }, [fetchFactures]);

  const stats = {
    total: factures.length,
    enAttente: factures.filter(f => f.statut === "ENVOYEE" || f.statut === "PARTIELLEMENT_PAYEE").length,
    payees: factures.filter(f => f.statut === "PAYEE").length,
    caTotal: factures.filter(f => f.statut !== "ANNULEE").reduce((s, f) => s + f.montant_ttc, 0),
    resteAEncaisser: factures.filter(f => ["ENVOYEE", "PARTIELLEMENT_PAYEE"].includes(f.statut)).reduce((s, f) => s + (f.montant_ttc - f.montant_paye), 0),
  };

  return { factures, loading, stats, addFacture, updateFacture, deleteFacture, refetch: fetchFactures };
}
