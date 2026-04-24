import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CategorieDepense } from "@/types/operations";

export interface DepenseConsolidation {
  id: string;
  operationId: string;
  consolidationId?: string;
  libelle: string;
  categorie: CategorieDepense;
  montant: number;
  date: string;
  statutValidation: "EN_ATTENTE" | "APPROUVE" | "PAYE" | "REJETE";
  decaissementId?: string;
  commentaire?: string;
  createdAt: string;
}

export interface Consolidation {
  id: string;
  operationId: string;
  totalRecettes: number;
  totalDepensesTerrain: number;
  totalDepensesConsolidation: number;
  marge: number;
  notes: string;
  terminee: boolean;
  dateCloture?: string;
  createdAt: string;
  updatedAt: string;
}

function mapCons(row: any): Consolidation {
  return {
    id: row.id,
    operationId: row.operation_id,
    totalRecettes: Number(row.total_recettes),
    totalDepensesTerrain: Number(row.total_depenses_terrain),
    totalDepensesConsolidation: Number(row.total_depenses_consolidation),
    marge: Number(row.marge),
    notes: row.notes || "",
    terminee: row.terminee,
    dateCloture: row.date_cloture || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDep(row: any): DepenseConsolidation {
  return {
    id: row.id,
    operationId: row.operation_id,
    consolidationId: row.consolidation_id || undefined,
    libelle: row.libelle,
    categorie: row.categorie as CategorieDepense,
    montant: Number(row.montant),
    date: row.date,
    statutValidation: row.statut_validation,
    decaissementId: row.decaissement_id || undefined,
    commentaire: row.commentaire || "",
    createdAt: row.created_at,
  };
}

export function useConsolidationsStore() {
  const [consolidations, setConsolidations] = useState<Consolidation[]>([]);
  const [depenses, setDepenses] = useState<DepenseConsolidation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [cRes, dRes] = await Promise.all([
      supabase.from("consolidations_operations" as any).select("*"),
      supabase.from("depenses_consolidation" as any).select("*").order("created_at", { ascending: false }),
    ]);
    setConsolidations(((cRes.data as any[]) || []).map(mapCons));
    setDepenses(((dRes.data as any[]) || []).map(mapDep));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("consolidations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "consolidations_operations" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "depenses_consolidation" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  /** Get or create a consolidation for an operation */
  const ensureConsolidation = useCallback(async (operationId: string, totalRecettes: number, totalDepensesTerrain: number) => {
    const existing = consolidations.find(c => c.operationId === operationId);
    if (existing) return existing;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase.from("consolidations_operations" as any).insert({
      operation_id: operationId,
      total_recettes: totalRecettes,
      total_depenses_terrain: totalDepensesTerrain,
      total_depenses_consolidation: 0,
      marge: totalRecettes - totalDepensesTerrain,
      created_by: user?.id,
    } as any).select("*").single() as any);
    if (error) throw error;
    await fetchAll();
    return mapCons(data);
  }, [consolidations, fetchAll]);

  const addDepense = useCallback(async (operationId: string, payload: {
    libelle: string;
    categorie: CategorieDepense;
    montant: number;
    date: string;
    commentaire?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const cons = consolidations.find(c => c.operationId === operationId);
    const { error } = await (supabase.from("depenses_consolidation" as any).insert({
      operation_id: operationId,
      consolidation_id: cons?.id || null,
      libelle: payload.libelle,
      categorie: payload.categorie,
      montant: payload.montant,
      date: payload.date,
      commentaire: payload.commentaire || "",
      created_by: user?.id,
    } as any) as any);
    if (error) throw error;
    await fetchAll();
  }, [consolidations, fetchAll]);

  const deleteDepense = useCallback(async (id: string) => {
    await (supabase.from("depenses_consolidation" as any).delete().eq("id", id) as any);
    await fetchAll();
  }, [fetchAll]);

  const updateConsolidation = useCallback(async (id: string, updates: { notes?: string }) => {
    await (supabase.from("consolidations_operations" as any).update(updates as any).eq("id", id) as any);
    await fetchAll();
  }, [fetchAll]);

  const terminerConsolidation = useCallback(async (operationId: string, totals: {
    totalRecettes: number;
    totalDepensesTerrain: number;
    totalDepensesConsolidation: number;
    notes?: string;
  }) => {
    const cons = await ensureConsolidation(operationId, totals.totalRecettes, totals.totalDepensesTerrain);
    const marge = totals.totalRecettes - totals.totalDepensesTerrain - totals.totalDepensesConsolidation;
    await (supabase.from("consolidations_operations" as any).update({
      total_recettes: totals.totalRecettes,
      total_depenses_terrain: totals.totalDepensesTerrain,
      total_depenses_consolidation: totals.totalDepensesConsolidation,
      marge,
      notes: totals.notes || cons.notes,
      terminee: true,
      date_cloture: new Date().toISOString(),
    } as any).eq("id", cons.id) as any);
    // Marquer l'opération comme CONSOLIDEE
    await (supabase.from("operations").update({ statut: "CONSOLIDEE" as any }).eq("id", operationId) as any);
    await fetchAll();
  }, [ensureConsolidation, fetchAll]);

  return {
    consolidations,
    depenses,
    loading,
    ensureConsolidation,
    addDepense,
    deleteDepense,
    updateConsolidation,
    terminerConsolidation,
    refetch: fetchAll,
  };
}
