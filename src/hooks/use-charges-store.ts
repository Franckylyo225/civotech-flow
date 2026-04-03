import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CategorieCharge = "LOYER" | "SALAIRES" | "ASSURANCES_TAXES" | "CARBURANT_ENTRETIEN" | "AUTRE";

export interface ChargeFixe {
  id: string;
  designation: string;
  categorie: CategorieCharge;
  montant: number;
  actif: boolean;
  created_at: string;
}

export interface ChargeMensuelle {
  id: string;
  charge_fixe_id: string;
  mois: string; // YYYY-MM
  montant: number;
  payee: boolean;
  date_paiement: string | null;
  notes: string | null;
  created_at: string;
}

export const CATEGORIE_CHARGE_CONFIG: Record<CategorieCharge, { label: string; icon: string }> = {
  LOYER: { label: "Loyer / Location", icon: "🏢" },
  SALAIRES: { label: "Salaires / Personnel", icon: "👥" },
  ASSURANCES_TAXES: { label: "Assurances / Taxes", icon: "📋" },
  CARBURANT_ENTRETIEN: { label: "Carburant / Entretien", icon: "⛽" },
  AUTRE: { label: "Autre", icon: "📦" },
};

export function useChargesStore() {
  const [chargesFixes, setChargesFixes] = useState<ChargeFixe[]>([]);
  const [chargesMensuelles, setChargesMensuelles] = useState<ChargeMensuelle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cfRes, cmRes] = await Promise.all([
      supabase.from("charges_fixes").select("*").order("designation"),
      supabase.from("charges_mensuelles").select("*").order("mois", { ascending: false }),
    ]);
    setChargesFixes((cfRes.data || []) as ChargeFixe[]);
    setChargesMensuelles((cmRes.data || []) as ChargeMensuelle[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addChargeFixe = useCallback(async (cf: Omit<ChargeFixe, "id" | "created_at">) => {
    const { error } = await supabase.from("charges_fixes").insert(cf as any);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const updateChargeFixe = useCallback(async (id: string, updates: Partial<ChargeFixe>) => {
    const { error } = await supabase.from("charges_fixes").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deleteChargeFixe = useCallback(async (id: string) => {
    const { error } = await supabase.from("charges_fixes").delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const generateMois = useCallback(async (mois: string) => {
    // Generate monthly instances for all active fixed charges
    const actives = chargesFixes.filter(c => c.actif);
    const existing = chargesMensuelles.filter(cm => cm.mois === mois);
    const toInsert = actives
      .filter(cf => !existing.some(e => e.charge_fixe_id === cf.id))
      .map(cf => ({
        charge_fixe_id: cf.id,
        mois,
        montant: cf.montant,
      }));
    if (toInsert.length === 0) return 0;
    const { error } = await supabase.from("charges_mensuelles").insert(toInsert as any);
    if (error) throw error;
    await fetchAll();
    return toInsert.length;
  }, [fetchAll, chargesFixes, chargesMensuelles]);

  const updateChargeMensuelle = useCallback(async (id: string, updates: Partial<ChargeMensuelle>) => {
    const { error } = await supabase.from("charges_mensuelles").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deleteChargeMensuelle = useCallback(async (id: string) => {
    const { error } = await supabase.from("charges_mensuelles").delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  return {
    chargesFixes,
    chargesMensuelles,
    loading,
    addChargeFixe,
    updateChargeFixe,
    deleteChargeFixe,
    generateMois,
    updateChargeMensuelle,
    deleteChargeMensuelle,
    refetch: fetchAll,
  };
}
