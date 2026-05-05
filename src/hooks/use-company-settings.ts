import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySettings {
  id: string;
  nom: string;
  logo_url: string;
  adresse: string;
  telephone: string;
  email: string;
  site_web: string;
  devise: string;
  format_date: string;
  fuseau_horaire: string;
  langue: string;
  taux_tva: number;
  conditions_paiement: string;
  prefixe_facture: string;
  prefixe_devis: string;
  prefixe_operation: string;
  prefixe_decaissement: string;
  prefixe_demande_achat: string;
  types_vehicules: string[];
  types_prestations: string[];
  categories_depenses: string[];
  modes_paiement: string[];
  conditions_devis: string;
  afficher_maj_devis: boolean;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();
    if (data) setSettings(data as unknown as CompanySettings);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const update = useCallback(async (updates: Partial<CompanySettings>) => {
    if (!settings) return;
    const { error } = await supabase
      .from("company_settings")
      .update(updates as any)
      .eq("id", settings.id);
    if (error) throw error;
    await fetch();
  }, [settings, fetch]);

  return { settings, loading, update, refetch: fetch };
}
