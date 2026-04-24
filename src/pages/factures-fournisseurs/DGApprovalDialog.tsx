import { useState, useMemo, useEffect } from "react";
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

export function DGApprovalDialog({ open, onOpenChange, invoices, supplierMap }: Props) {
  const { dgApprove } = useSupplierInvoicesStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Sélection par défaut : toutes
  useEffect(() => {
    if (open) setSelected(new Set(invoices.map(i => i.id)));
  }, [open, invoices]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const total = useMemo(() =>
    invoices.filter(i => selected.has(i.id)).reduce((s, i) => s + Number(i.amount), 0),
  [invoices, selected]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const ok = await dgApprove(Array.from(selected), invoices.map(i => i.id));
    setSubmitting(false);
    if (ok) { onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Validation DG — Factures fournisseurs</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cochez les factures à approuver. Les factures non cochées repasseront en traitement.
          </p>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
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
          </TableBody>
        </Table>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">{selected.size}/{invoices.length} approuvée(s)</span>
          <span className="text-lg font-bold text-primary">Total approuvé : {fmt(total)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Validation…" : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
