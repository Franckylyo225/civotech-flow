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
  /** Solde d'ouverture, hors mouvements. solde = solde_initial + mouvements. */
  solde_initial: number;
  actif: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FluxMensuel {
  mois: string;
  encaissements: number;
  decaissements: number;
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
      // Le solde d'ouverture doit être tracé séparément, sinon un recalcul
      // (solde_initial + mouvements) l'effacerait.
      solde_initial: values.solde || 0,
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

  /**
   * Recalcule les soldes depuis le grand livre (solde_initial + mouvements).
   * Utile après une correction en lot, ou pour vérifier qu'aucun écart ne
   * subsiste. Réservé à DG et FINANCE par la RLS.
   */
  const recalculerSoldes = async () => {
    const { data, error } = await supabase.rpc("recalculer_solde_comptes" as any);
    if (error) { toast.error("Erreur recalcul des soldes : " + error.message); return null; }
    const corriges = Number(data ?? 0);
    toast.success(corriges === 0 ? "Soldes déjà à jour" : `${corriges} solde(s) recalculé(s)`);
    await fetch();
    return corriges;
  };

  const soldeBanque = comptes.filter(c => c.type === "BANQUE" && c.actif).reduce((s, c) => s + c.solde, 0);
  const soldeCaisse = comptes.filter(c => c.type === "CAISSE" && c.actif).reduce((s, c) => s + c.solde, 0);
  const soldeTotal = soldeBanque + soldeCaisse;

  return { comptes, loading, fetch, create, update, remove, recalculerSoldes, soldeBanque, soldeCaisse, soldeTotal };
}

/**
 * Fenêtre d'affichage de la liste des transactions. Ce n'est qu'un plafond de
 * rendu : les totaux et le graphique viennent d'agrégats SQL et ne dépendent
 * donc plus du nombre de lignes chargées.
 */
const TRANSACTIONS_DISPLAY_LIMIT = 500;

export function useTransactionsStore() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [totaux, setTotaux] = useState({ totalEntrees: 0, totalSorties: 0 });
  const [fluxMensuels, setFluxMensuels] = useState<FluxMensuel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTotaux = useCallback(async () => {
    const [totauxRes, fluxRes] = await Promise.all([
      supabase.rpc("tresorerie_totaux" as any),
      supabase.rpc("tresorerie_flux_mensuels" as any, { _nb_mois: 6 }),
    ]);

    if (totauxRes.error) {
      toast.error("Erreur chargement des totaux de trésorerie");
    } else {
      const row = (totauxRes.data as any[])?.[0];
      setTotaux({
        totalEntrees: Number(row?.total_entrees ?? 0),
        totalSorties: Number(row?.total_sorties ?? 0),
      });
    }

    if (!fluxRes.error) {
      setFluxMensuels(((fluxRes.data as any[]) || []).map(r => ({
        mois: r.mois as string,
        encaissements: Number(r.encaissements ?? 0),
        decaissements: Number(r.decaissements ?? 0),
      })));
    }
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions_tresorerie")
      .select("*")
      .order("date_transaction", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(TRANSACTIONS_DISPLAY_LIMIT);
    if (error) toast.error("Erreur chargement transactions");
    else setTransactions((data || []) as unknown as TransactionRow[]);
    await fetchTotaux();
    setLoading(false);
  }, [fetchTotaux]);

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

  /**
   * Correction d'une transaction. Le trigger trg_update_solde_comptes annule
   * l'effet de l'ancienne ligne et applique la nouvelle, donc les soldes
   * suivent automatiquement, y compris si le compte ou le type change.
   * La modification est journalisée dans activity_logs.
   */
  const update = async (id: string, values: {
    type?: TypeTransaction;
    montant?: number;
    date_transaction?: string;
    compte_source_id?: string | null;
    compte_destination_id?: string | null;
    description?: string;
  }) => {
    const { error } = await supabase
      .from("transactions_tresorerie")
      .update(values as any)
      .eq("id", id);
    if (error) { toast.error("Erreur correction transaction : " + error.message); return false; }
    toast.success("Transaction corrigée");
    await fetch();
    return true;
  };

  /** Suppression d'une transaction. Les soldes sont dégrevés par le trigger. */
  const remove = async (id: string) => {
    const { error } = await supabase
      .from("transactions_tresorerie")
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erreur suppression transaction : " + error.message); return false; }
    toast.success("Transaction supprimée");
    await fetch();
    return true;
  };

  return {
    transactions,
    loading,
    fetch,
    create,
    update,
    remove,
    fluxMensuels,
    totalEntrees: totaux.totalEntrees,
    totalSorties: totaux.totalSorties,
  };
}
