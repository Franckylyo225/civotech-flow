import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatutDemandeAchat =
  | "BROUILLON" | "SOUMISE" | "DEVIS_EN_COURS" | "SOUMISE_DG"
  | "VALIDEE_DG" | "REFUSEE_DG" | "DECAISSEMENT" | "PAYEE" | "CLOTUREE";

export interface DemandeAchatRow {
  id: string;
  reference: string;
  maintenance_id: string | null;
  designation: string;
  description: string;
  quantite: number;
  montant_estime: number;
  urgence: string;
  statut: StatutDemandeAchat;
  commentaire_dg: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUT_DA_CONFIG: Record<StatutDemandeAchat, { label: string; color: string; bgColor: string }> = {
  BROUILLON: { label: "Brouillon", color: "text-muted-foreground", bgColor: "bg-muted" },
  SOUMISE: { label: "Soumise", color: "text-info", bgColor: "bg-info/10" },
  DEVIS_EN_COURS: { label: "Devis en cours", color: "text-warning", bgColor: "bg-warning/10" },
  SOUMISE_DG: { label: "Soumise au DG", color: "text-primary", bgColor: "bg-primary/10" },
  VALIDEE_DG: { label: "Validée DG", color: "text-success", bgColor: "bg-success/10" },
  REFUSEE_DG: { label: "Refusée DG", color: "text-destructive", bgColor: "bg-destructive/10" },
  DECAISSEMENT: { label: "Décaissement", color: "text-warning", bgColor: "bg-warning/10" },
  PAYEE: { label: "Payée", color: "text-success", bgColor: "bg-success/10" },
  CLOTUREE: { label: "Clôturée", color: "text-muted-foreground", bgColor: "bg-muted" },
};

export const URGENCE_OPTIONS = [
  { value: "BASSE", label: "Basse" },
  { value: "NORMALE", label: "Normale" },
  { value: "HAUTE", label: "Haute" },
  { value: "CRITIQUE", label: "Critique" },
];

export function useDemandesAchatStore() {
  const [demandes, setDemandes] = useState<DemandeAchatRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("demandes_achat")
      .select("*")
      .order("created_at", { ascending: false });
    setDemandes((data || []) as DemandeAchatRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDemandes(); }, [fetchDemandes]);

  const addDemande = useCallback(async (d: Partial<DemandeAchatRow>) => {
    const { error } = await supabase.from("demandes_achat").insert({ ...d, reference: "" } as any);
    if (error) throw error;
    await fetchDemandes();
  }, [fetchDemandes]);

  const updateDemande = useCallback(async (id: string, updates: Partial<DemandeAchatRow>) => {
    const { error } = await supabase.from("demandes_achat").update(updates as any).eq("id", id);
    if (error) throw error;
    await fetchDemandes();
  }, [fetchDemandes]);

  const deleteDemande = useCallback(async (id: string) => {
    const { error } = await supabase.from("demandes_achat").delete().eq("id", id);
    if (error) throw error;
    await fetchDemandes();
  }, [fetchDemandes]);

  const stats = {
    total: demandes.length,
    enCours: demandes.filter(d => !["CLOTUREE", "REFUSEE_DG"].includes(d.statut)).length,
    attenteValidation: demandes.filter(d => d.statut === "SOUMISE_DG").length,
    montantTotal: demandes.reduce((s, d) => s + d.montant_estime, 0),
  };

  return { demandes, loading, stats, addDemande, updateDemande, deleteDemande, refetch: fetchDemandes };
}
