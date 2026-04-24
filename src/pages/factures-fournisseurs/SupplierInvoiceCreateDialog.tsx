import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFournisseursStore } from "@/hooks/use-fournisseurs-store";
import { useSupplierInvoicesStore } from "@/hooks/use-supplier-invoices-store";
import { useDemandesAchatStore } from "@/hooks/use-demandes-achat-store";
import { useMaintenancesStore } from "@/hooks/use-maintenances-store";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SupplierInvoiceCreateDialog({ open, onOpenChange }: Props) {
  const { fournisseurs } = useFournisseursStore();
  const { create } = useSupplierInvoicesStore();
  const demandes = useTryDemandes();
  const maintenances = useTryMaintenances();

  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [demandeId, setDemandeId] = useState<string>("none");
  const [maintenanceId, setMaintenanceId] = useState<string>("none");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setSupplierId(""); setAmount(0); setInvoiceDate(new Date().toISOString().slice(0, 10));
    setDueDate(""); setDescription(""); setDemandeId("none"); setMaintenanceId("none"); setFile(null);
  };

  const handleSubmit = async () => {
    if (!supplierId || amount <= 0) return;
    setSubmitting(true);
    const ok = await create({
      supplier_id: supplierId,
      amount,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      description,
      demande_achat_id: demandeId === "none" ? null : demandeId,
      maintenance_id: maintenanceId === "none" ? null : maintenanceId,
      file,
    });
    setSubmitting(false);
    if (ok) { reset(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle facture fournisseur</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Fournisseur *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                {fournisseurs.filter(f => f.actif).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Montant (FCFA) *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Date facture *</Label>
              <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Date échéance</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          {demandes.length > 0 && (
            <div>
              <Label>Demande d'achat liée (optionnel)</Label>
              <Select value={demandeId} onValueChange={setDemandeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  {demandes.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.reference} — {d.designation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {maintenances.length > 0 && (
            <div>
              <Label>Maintenance liée (optionnel)</Label>
              <Select value={maintenanceId} onValueChange={setMaintenanceId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  {maintenances.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.description?.slice(0, 40) || m.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Fichier (PDF, image)</Label>
            <Input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!supplierId || amount <= 0 || submitting}>
            {submitting ? "Enregistrement…" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Wrappers résilients (au cas où ces hooks renvoient des shapes différents)
function useTryDemandes() {
  try {
    const r: any = useDemandesAchatStore();
    return r.demandes || r.demandesAchat || [];
  } catch { return []; }
}
function useTryMaintenances() {
  try {
    const r: any = useMaintenancesStore();
    return r.maintenances || [];
  } catch { return []; }
}
