import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Employe {
  id: string;
  nom: string;
  prenom: string;
  poste: string;
  telephone: string;
  salaire_base: number;
  taux_cotisations: number;
  actif: boolean;
  created_at: string;
}

export interface SalaireMensuel {
  id: string;
  employe_id: string;
  mois: string;
  salaire_base: number;
  primes: number;
  cotisations: number;
  avances: number;
  net_a_payer: number;
  paye: boolean;
  date_paiement: string | null;
  notes: string | null;
  created_at: string;
}

export function useMasseSalarialeStore() {
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [salaires, setSalaires] = useState<SalaireMensuel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [empRes, salRes] = await Promise.all([
      supabase.from("employes").select("*").order("nom"),
      supabase.from("salaires_mensuels").select("*").order("mois", { ascending: false }),
    ]);
    setEmployes((empRes.data || []) as Employe[]);
    setSalaires((salRes.data || []) as SalaireMensuel[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addEmploye = useCallback(async (e: Omit<Employe, "id" | "created_at">) => {
    const { error } = await supabase.from("employes").insert(e as any);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const updateEmploye = useCallback(async (id: string, updates: Partial<Employe>) => {
    const { error } = await supabase.from("employes").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deleteEmploye = useCallback(async (id: string) => {
    const { error } = await supabase.from("employes").delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const generateMois = useCallback(async (mois: string) => {
    const actifs = employes.filter(e => e.actif);
    const existing = salaires.filter(s => s.mois === mois);
    const toInsert = actifs
      .filter(e => !existing.some(s => s.employe_id === e.id))
      .map(e => {
        const cotisations = Math.round(e.salaire_base * e.taux_cotisations / 100);
        return {
          employe_id: e.id,
          mois,
          salaire_base: e.salaire_base,
          primes: 0,
          cotisations,
          avances: 0,
          net_a_payer: e.salaire_base - cotisations,
        };
      });
    if (toInsert.length === 0) return 0;
    const { error } = await supabase.from("salaires_mensuels").insert(toInsert as any);
    if (error) throw error;
    await fetchAll();
    return toInsert.length;
  }, [fetchAll, employes, salaires]);

  const updateSalaire = useCallback(async (id: string, updates: Partial<SalaireMensuel>) => {
    const { error } = await supabase.from("salaires_mensuels").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deleteSalaire = useCallback(async (id: string) => {
    const { error } = await supabase.from("salaires_mensuels").delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  return { employes, salaires, loading, addEmploye, updateEmploye, deleteEmploye, generateMois, updateSalaire, deleteSalaire, refetch: fetchAll };
}
