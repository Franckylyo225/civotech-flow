import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StockBureauStatut =
  | "BROUILLON"
  | "SOUMISE_DG"
  | "VALIDEE_DG"
  | "REFUSEE_DG"
  | "PAYEE";

export type StockBureauCategorie =
  | "BUREAUTIQUE"
  | "CONSOMMABLES"
  | "MOBILIER"
  | "INFORMATIQUE"
  | "ENTRETIEN"
  | "AUTRE";

export interface StockBureauRow {
  id: string;
  reference: string;
  designation: string;
  description: string;
  categorie: StockBureauCategorie;
  urgence: string;
  quantite: number;
  montant: number;
  justificatif_url: string | null;
  statut: StockBureauStatut;
  commentaire_dg: string;
  decaissement_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STOCK_BUREAU_STATUT_CONFIG: Record<StockBureauStatut, { label: string; color: string; bg: string }> = {
  BROUILLON: { label: "Brouillon", color: "text-muted-foreground", bg: "bg-muted" },
  SOUMISE_DG: { label: "En attente DG", color: "text-warning", bg: "bg-warning/10" },
  VALIDEE_DG: { label: "Validée DG", color: "text-primary", bg: "bg-primary/10" },
  REFUSEE_DG: { label: "Refusée", color: "text-destructive", bg: "bg-destructive/10" },
  PAYEE: { label: "Payée", color: "text-success", bg: "bg-success/10" },
};

export const STOCK_BUREAU_CATEGORIES: { value: StockBureauCategorie; label: string }[] = [
  { value: "BUREAUTIQUE", label: "Bureautique" },
  { value: "CONSOMMABLES", label: "Consommables" },
  { value: "MOBILIER", label: "Mobilier" },
  { value: "INFORMATIQUE", label: "Informatique" },
  { value: "ENTRETIEN", label: "Entretien" },
  { value: "AUTRE", label: "Autre" },
];

export const STOCK_BUREAU_URGENCES = ["BASSE", "NORMALE", "HAUTE", "CRITIQUE"];

export function useStockBureauStore() {
  const [items, setItems] = useState<StockBureauRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_bureau_demandes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erreur chargement stock bureau");
    else setItems((data || []) as StockBureauRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const uploadJustificatif = useCallback(async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("stock-bureau-justificatifs").upload(path, file);
    if (error) {
      toast.error("Erreur upload : " + error.message);
      return null;
    }
    return path;
  }, []);

  const getJustificatifUrl = useCallback(async (path: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from("stock-bureau-justificatifs")
      .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  }, []);

  const create = useCallback(async (values: {
    designation: string;
    description: string;
    categorie: StockBureauCategorie;
    urgence: string;
    quantite: number;
    montant: number;
    file?: File | null;
    submit?: boolean;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    let justificatif_url: string | null = null;
    if (values.file) {
      justificatif_url = await uploadJustificatif(values.file);
    }
    const { error } = await supabase.from("stock_bureau_demandes").insert({
      designation: values.designation,
      description: values.description,
      categorie: values.categorie,
      urgence: values.urgence,
      quantite: values.quantite,
      montant: values.montant,
      justificatif_url,
      statut: values.submit ? "SOUMISE_DG" : "BROUILLON",
      created_by: user?.id,
      reference: "",
    } as any);
    if (error) { toast.error("Erreur création : " + error.message); return false; }
    toast.success(values.submit ? "Demande soumise au DG" : "Brouillon enregistré");
    await fetch();
    return true;
  }, [fetch, uploadJustificatif]);

  const update = useCallback(async (id: string, updates: Partial<StockBureauRow>) => {
    const { error } = await supabase
      .from("stock_bureau_demandes")
      .update(updates as any)
      .eq("id", id);
    if (error) { toast.error("Erreur : " + error.message); return false; }
    await fetch();
    return true;
  }, [fetch]);

  const submit = useCallback(async (id: string) => {
    const ok = await update(id, { statut: "SOUMISE_DG" });
    if (ok) toast.success("Demande soumise au DG");
    return ok;
  }, [update]);

  const validate = useCallback(async (id: string, commentaire?: string) => {
    const ok = await update(id, { statut: "VALIDEE_DG", commentaire_dg: commentaire || "" });
    if (ok) toast.success("Demande validée — décaissement créé");
    return ok;
  }, [update]);

  const reject = useCallback(async (id: string, commentaire: string) => {
    const ok = await update(id, { statut: "REFUSEE_DG", commentaire_dg: commentaire });
    if (ok) toast.success("Demande refusée");
    return ok;
  }, [update]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("stock_bureau_demandes").delete().eq("id", id);
    if (error) { toast.error("Erreur suppression : " + error.message); return false; }
    toast.success("Demande supprimée");
    await fetch();
    return true;
  }, [fetch]);

  return {
    items,
    loading,
    refresh: fetch,
    create,
    update,
    submit,
    validate,
    reject,
    remove,
    uploadJustificatif,
    getJustificatifUrl,
  };
}
