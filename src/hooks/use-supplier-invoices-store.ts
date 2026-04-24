import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SupplierInvoiceStatus =
  | "received"
  | "processing"
  | "pending_DG"
  | "approved_for_payment"
  | "cheque_ready"
  | "paid"
  | "delivered"
  | "archived";

export type SupplierInvoicePaymentMethod = "cheque" | "virement";

export interface SupplierInvoiceRow {
  id: string;
  reference: string;
  supplier_id: string;
  amount: number;
  invoice_date: string;
  due_date: string | null;
  file_url: string | null;
  status: SupplierInvoiceStatus;
  payment_method: SupplierInvoicePaymentMethod | null;
  description: string | null;
  demande_achat_id: string | null;
  maintenance_id: string | null;
  decaissement_id: string | null;
  payment_batch_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceHistoryRow {
  id: string;
  supplier_invoice_id: string;
  ancien_statut: SupplierInvoiceStatus | null;
  nouveau_statut: SupplierInvoiceStatus;
  commentaire: string | null;
  user_id: string | null;
  user_nom: string | null;
  created_at: string;
}

export const STATUS_CONFIG: Record<SupplierInvoiceStatus, { label: string; color: string; bg: string }> = {
  received: { label: "Reçue", color: "text-muted-foreground", bg: "bg-muted" },
  processing: { label: "En traitement", color: "text-info", bg: "bg-info/10" },
  pending_DG: { label: "Attente DG", color: "text-warning", bg: "bg-warning/10" },
  approved_for_payment: { label: "Approuvée", color: "text-primary", bg: "bg-primary/10" },
  cheque_ready: { label: "Chèque prêt", color: "text-info", bg: "bg-info/10" },
  paid: { label: "Payée", color: "text-success", bg: "bg-success/10" },
  delivered: { label: "Remise", color: "text-success", bg: "bg-success/10" },
  archived: { label: "Archivée", color: "text-muted-foreground", bg: "bg-muted" },
};

export const PAYMENT_METHOD_LABELS: Record<SupplierInvoicePaymentMethod, string> = {
  cheque: "Chèque",
  virement: "Virement",
};

export function useSupplierInvoicesStore() {
  const [invoices, setInvoices] = useState<SupplierInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("supplier_invoices")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erreur chargement factures fournisseurs");
    else setInvoices((data || []) as SupplierInvoiceRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("supplier-invoices").upload(path, file);
    if (error) {
      toast.error("Erreur upload fichier : " + error.message);
      return null;
    }
    return path;
  }, []);

  const getFileUrl = useCallback(async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from("supplier-invoices").createSignedUrl(path, 3600);
    if (error) return null;
    return data?.signedUrl || null;
  }, []);

  const create = useCallback(async (values: {
    supplier_id: string;
    amount: number;
    invoice_date: string;
    due_date?: string | null;
    description?: string;
    demande_achat_id?: string | null;
    maintenance_id?: string | null;
    file?: File | null;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    let file_url: string | null = null;
    if (values.file) {
      file_url = await uploadFile(values.file);
    }
    const { error } = await supabase.from("supplier_invoices").insert({
      supplier_id: values.supplier_id,
      amount: values.amount,
      invoice_date: values.invoice_date,
      due_date: values.due_date || null,
      description: values.description || "",
      demande_achat_id: values.demande_achat_id || null,
      maintenance_id: values.maintenance_id || null,
      file_url,
      status: "received",
      created_by: user?.id,
      reference: "",
    } as any);
    if (error) { toast.error("Erreur création : " + error.message); return false; }
    toast.success("Facture créée");
    await fetchInvoices();
    return true;
  }, [fetchInvoices, uploadFile]);

  const updateStatus = useCallback(async (id: string, status: SupplierInvoiceStatus, extra?: Partial<SupplierInvoiceRow>) => {
    const { error } = await supabase
      .from("supplier_invoices")
      .update({ status, ...(extra || {}) } as any)
      .eq("id", id);
    if (error) { toast.error("Erreur : " + error.message); return false; }
    await fetchInvoices();
    return true;
  }, [fetchInvoices]);

  const updateMany = useCallback(async (ids: string[], updates: Partial<SupplierInvoiceRow>) => {
    const { error } = await supabase
      .from("supplier_invoices")
      .update(updates as any)
      .in("id", ids);
    if (error) { toast.error("Erreur : " + error.message); return false; }
    await fetchInvoices();
    return true;
  }, [fetchInvoices]);

  const update = useCallback(async (id: string, updates: Partial<SupplierInvoiceRow>) => {
    const { error } = await supabase
      .from("supplier_invoices")
      .update(updates as any)
      .eq("id", id);
    if (error) { toast.error("Erreur : " + error.message); return false; }
    await fetchInvoices();
    return true;
  }, [fetchInvoices]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("supplier_invoices").delete().eq("id", id);
    if (error) { toast.error("Erreur suppression : " + error.message); return false; }
    toast.success("Facture supprimée");
    await fetchInvoices();
    return true;
  }, [fetchInvoices]);

  /**
   * Crée un lot de paiement à partir d'un ensemble d'IDs de factures.
   * Les factures passent à "pending_DG" avec un même payment_batch_id.
   */
  const createPaymentBatch = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return false;
    const batchId = crypto.randomUUID();
    const { error } = await supabase
      .from("supplier_invoices")
      .update({ payment_batch_id: batchId, status: "pending_DG" } as any)
      .in("id", ids);
    if (error) { toast.error("Erreur création lot : " + error.message); return false; }
    toast.success(`Lot de ${ids.length} facture(s) soumis au DG`);
    await fetchInvoices();
    return true;
  }, [fetchInvoices]);

  /**
   * Le DG approuve un sous-ensemble de factures (parmi celles "pending_DG").
   * Approuvées → approved_for_payment ; non sélectionnées → repassent à "processing".
   */
  const dgApprove = useCallback(async (approvedIds: string[], allBatchIds: string[]) => {
    const rejectedIds = allBatchIds.filter(id => !approvedIds.includes(id));
    if (approvedIds.length > 0) {
      const { error } = await supabase
        .from("supplier_invoices")
        .update({ status: "approved_for_payment" } as any)
        .in("id", approvedIds);
      if (error) { toast.error("Erreur approbation : " + error.message); return false; }
    }
    if (rejectedIds.length > 0) {
      await supabase
        .from("supplier_invoices")
        .update({ status: "processing", payment_batch_id: null } as any)
        .in("id", rejectedIds);
    }
    toast.success(`${approvedIds.length} facture(s) approuvée(s)`);
    await fetchInvoices();
    return true;
  }, [fetchInvoices]);

  /**
   * Enregistre le paiement.
   * - Virement → crée un décaissement PAYE (le trigger DB crée la transaction trésorerie)
   * - Chèque   → crée un décaissement PAYE + statut cheque_ready (en attente remise)
   */
  const recordPayment = useCallback(async (
    id: string,
    method: SupplierInvoicePaymentMethod,
    compteSourceId: string,
  ) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return false;
    const { data: { user } } = await supabase.auth.getUser();

    // Récupère le nom du fournisseur pour le motif
    const { data: supplier } = await supabase
      .from("fournisseurs").select("nom").eq("id", inv.supplier_id).single();
    const supplierName = supplier?.nom || "Fournisseur";

    const { data: dec, error: decErr } = await supabase
      .from("decaissements")
      .insert({
        montant: inv.amount,
        motif: `Facture fournisseur ${inv.reference} - ${supplierName}`,
        statut: "PAYE",
        date_paiement: new Date().toISOString().slice(0, 10),
        compte_source_id: compteSourceId,
        reference_paiement: method === "virement" ? "Virement" : "Chèque",
        created_by: user?.id,
        reference: "",
      } as any)
      .select()
      .single();

    if (decErr || !dec) { toast.error("Erreur décaissement : " + (decErr?.message || "")); return false; }

    const newStatus: SupplierInvoiceStatus = method === "virement" ? "paid" : "cheque_ready";
    const { error } = await supabase
      .from("supplier_invoices")
      .update({
        status: newStatus,
        payment_method: method,
        decaissement_id: (dec as any).id,
      } as any)
      .eq("id", id);

    if (error) { toast.error("Erreur : " + error.message); return false; }
    toast.success(method === "virement" ? "Virement enregistré" : "Chèque préparé");
    await fetchInvoices();
    return true;
  }, [invoices, fetchInvoices]);

  const confirmDelivery = useCallback(async (id: string) => {
    return updateStatus(id, "delivered");
  }, [updateStatus]);

  const archive = useCallback(async (id: string) => {
    return updateStatus(id, "archived");
  }, [updateStatus]);

  return {
    invoices,
    loading,
    fetchInvoices,
    create,
    update,
    updateStatus,
    updateMany,
    remove,
    createPaymentBatch,
    dgApprove,
    recordPayment,
    confirmDelivery,
    archive,
    uploadFile,
    getFileUrl,
  };
}

export function useSupplierInvoiceHistory(invoiceId: string | null) {
  const [history, setHistory] = useState<SupplierInvoiceHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invoiceId) { setHistory([]); return; }
    setLoading(true);
    supabase
      .from("supplier_invoice_history")
      .select("*")
      .eq("supplier_invoice_id", invoiceId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setHistory((data || []) as SupplierInvoiceHistoryRow[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`supplier_invoice_history:${invoiceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "supplier_invoice_history", filter: `supplier_invoice_id=eq.${invoiceId}` },
        (payload) => {
          setHistory((prev) => [...prev, payload.new as SupplierInvoiceHistoryRow]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [invoiceId]);

  return { history, loading };
}
