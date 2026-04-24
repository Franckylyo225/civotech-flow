import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupplierInvoicesStore, type SupplierInvoiceRow } from "@/hooks/use-supplier-invoices-store";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoices: SupplierInvoiceRow[];
  supplierMap: Record<string, string>;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

export function PaymentBatchDialog({ open, onOpenChange, invoices, supplierMap }: Props) {
  const { createPaymentBatch } = useSupplierInvoicesStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === invoices.length) setSelected(new Set());
    else setSelected(new Set(invoices.map(i => i.id)));
  };

  const total = useMemo(() =>
    invoices.filter(i => selected.has(i.id)).reduce((s, i) => s + Number(i.amount), 0),
  [invoices, selected]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const ok = await createPaymentBatch(Array.from(selected));
    setSubmitting(false);
    if (ok) { setSelected(new Set()); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un lot de paiement</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les factures à soumettre au DG pour validation.
          </p>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={invoices.length > 0 && selected.size === invoices.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map(inv => (
              <TableRow key={inv.id}>
                <TableCell>
                  <Checkbox checked={selected.has(inv.id)} onCheckedChange={() => toggle(inv.id)} />
                </TableCell>
                <TableCell className="font-mono text-xs">{inv.reference}</TableCell>
                <TableCell>{supplierMap[inv.supplier_id] || "—"}</TableCell>
                <TableCell className="text-right">{fmt(inv.amount)}</TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucune facture en traitement.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">{selected.size} sélectionnée(s)</span>
          <span className="text-lg font-bold text-primary">Total : {fmt(total)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={selected.size === 0 || submitting}>
            {submitting ? "Envoi…" : `Soumettre au DG (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
