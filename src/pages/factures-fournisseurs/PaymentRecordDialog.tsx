import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useComptesStore } from "@/hooks/use-tresorerie-store";
import type { SupplierInvoicePaymentMethod } from "@/hooks/use-supplier-invoices-store";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string | null;
  onPay: (id: string, method: SupplierInvoicePaymentMethod, compteId: string) => Promise<boolean>;
}

export function PaymentRecordDialog({ open, onOpenChange, invoiceId, onPay }: Props) {
  const { comptes } = useComptesStore();
  const [method, setMethod] = useState<SupplierInvoicePaymentMethod>("virement");
  const [compteId, setCompteId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod("virement");
      const def = comptes.find(c => c.actif && c.type === "BANQUE") || comptes.find(c => c.actif);
      setCompteId(def?.id || "");
    }
  }, [open, comptes]);

  const handleSubmit = async () => {
    if (!invoiceId || !compteId) return;
    setSubmitting(true);
    const ok = await onPay(invoiceId, method, compteId);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer le paiement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Mode de paiement</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as SupplierInvoicePaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="virement">Virement bancaire</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Compte source</Label>
            <Select value={compteId} onValueChange={setCompteId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                {comptes.filter(c => c.actif).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nom} ({c.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {method === "cheque" && (
            <p className="text-xs text-muted-foreground bg-info/5 border border-info/20 rounded p-2">
              Le chèque sera marqué « prêt à remettre ». L'assistante confirmera la remise au fournisseur.
            </p>
          )}
          {method === "virement" && (
            <p className="text-xs text-muted-foreground bg-success/5 border border-success/20 rounded p-2">
              Le décaissement sera créé et la trésorerie automatiquement mise à jour.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!compteId || submitting}>
            {submitting ? "Enregistrement…" : "Confirmer le paiement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
