import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TypeCompte = "BANQUE" | "CAISSE";
export type TypeTransaction = "ENCAISSEMENT" | "DECAISSEMENT" | "TRANSFERT";

export interface CompteRow {
  id: string;
  nom: string;
  type: TypeCompte;
  solde: number;
  actif: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  reference: string;
  type: TypeTransaction;
  montant: number;
  date_transaction: string;
  compte_source_id: string | null;
  compte_destination_id: string | null;
  facture_id: string | null;
  decaissement_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useComptesStore() {
  const [comptes, setComptes] = useState<CompteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comptes_tresorerie")
      .select("*")
      .order("type")
      .order("nom");
    if (error) toast.error("Erreur chargement comptes");
    else setComptes((data || []) as unknown as CompteRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: { nom: string; type: TypeCompte; solde?: number }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("comptes_tresorerie").insert({
      nom: values.nom,
      type: values.type,
      solde: values.solde || 0,
      created_by: user?.id,
    } as any);
    if (error) { toast.error("Erreur création compte"); return false; }
    toast.success("Compte créé");
    await fetch();
    return true;
  };

  const update = async (id: string, values: Partial<{ nom: string; actif: boolean }>) => {
    const { error } = await supabase.from("comptes_tresorerie").update(values as any).eq("id", id);
    if (error) { toast.error("Erreur mise à jour"); return false; }
    toast.success("Compte mis à jour");
    await fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("comptes_tresorerie").delete().eq("id", id);
    if (error) { toast.error("Erreur suppression"); return false; }
    toast.success("Compte supprimé");
    await fetch();
    return true;
  };

  const soldeBanque = comptes.filter(c => c.type === "BANQUE" && c.actif).reduce((s, c) => s + c.solde, 0);
  const soldeCaisse = comptes.filter(c => c.type === "CAISSE" && c.actif).reduce((s, c) => s + c.solde, 0);
  const soldeTotal = soldeBanque + soldeCaisse;

  return { comptes, loading, fetch, create, update, remove, soldeBanque, soldeCaisse, soldeTotal };
}

export function useTransactionsStore() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions_tresorerie")
      .select("*")
      .order("date_transaction", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Erreur chargement transactions");
    else setTransactions((data || []) as unknown as TransactionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: {
    type: TypeTransaction;
    montant: number;
    date_transaction?: string;
    compte_source_id?: string | null;
    compte_destination_id?: string | null;
    facture_id?: string | null;
    decaissement_id?: string | null;
    description?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("transactions_tresorerie").insert({
      ...values,
      created_by: user?.id,
    } as any);
    if (error) { toast.error("Erreur création transaction : " + error.message); return false; }
    toast.success("Transaction enregistrée");
    await fetch();
    return true;
  };

  const totalEntrees = transactions
    .filter(t => t.type === "ENCAISSEMENT")
    .reduce((s, t) => s + t.montant, 0);

  const totalSorties = transactions
    .filter(t => t.type === "DECAISSEMENT")
    .reduce((s, t) => s + t.montant, 0);

  return { transactions, loading, fetch, create, totalEntrees, totalSorties };
}
