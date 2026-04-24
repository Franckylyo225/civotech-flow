import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ExternalLink, FileText, History, FilePlus, Send, Layers,
  CheckCircle2, Banknote, FileCheck, PackageCheck, Archive, ArrowRight,
} from "lucide-react";
import {
  useSupplierInvoicesStore,
  useSupplierInvoiceHistory,
  STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
  type SupplierInvoiceStatus,
} from "@/hooks/use-supplier-invoices-store";
import { cn } from "@/lib/utils";

const EVENT_META: Record<SupplierInvoiceStatus, { icon: typeof FilePlus; label: string; description: string }> = {
  received:             { icon: FilePlus,     label: "Facture créée",            description: "Réception de la facture fournisseur" },
  processing:           { icon: Send,         label: "Transmise comptabilité",   description: "Transmise au service comptabilité pour traitement" },
  pending_DG:           { icon: Layers,       label: "Lot soumis au DG",         description: "Intégrée à un lot de paiement, en attente de validation DG" },
  approved_for_payment: { icon: CheckCircle2, label: "Approuvée par le DG",      description: "Validée pour paiement par la Direction Générale" },
  cheque_ready:         { icon: FileCheck,    label: "Chèque préparé",           description: "Décaissement enregistré, chèque prêt à remettre" },
  paid:                 { icon: Banknote,     label: "Virement effectué",        description: "Paiement par virement enregistré, trésorerie débitée" },
  delivered:            { icon: PackageCheck, label: "Chèque remis",             description: "Remise du chèque au fournisseur confirmée" },
  archived:             { icon: Archive,      label: "Archivée",                 description: "Dossier clôturé et archivé" },
};

interface Props {
  invoiceId: string | null;
  onClose: () => void;
  supplierMap: Record<string, string>;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmtDT = (d: string) => new Date(d).toLocaleString("fr-FR");

export function SupplierInvoiceDetailDialog({ invoiceId, onClose, supplierMap }: Props) {
  const { invoices, getFileUrl } = useSupplierInvoicesStore();
  const inv = invoices.find(i => i.id === invoiceId);
  const { history } = useSupplierInvoiceHistory(invoiceId);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (inv?.file_url) {
      getFileUrl(inv.file_url).then(setFileUrl);
    } else {
      setFileUrl(null);
    }
  }, [inv?.file_url, getFileUrl]);

  if (!invoiceId || !inv) return null;
  const cfg = STATUS_CONFIG[inv.status as SupplierInvoiceStatus];

  return (
    <Dialog open={!!invoiceId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Facture {inv.reference}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-medium", cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
            {inv.payment_method && (
              <span className="text-xs text-muted-foreground">
                Paiement : {PAYMENT_METHOD_LABELS[inv.payment_method]}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Fournisseur" value={supplierMap[inv.supplier_id] || "—"} />
            <Info label="Montant" value={fmt(inv.amount)} />
            <Info label="Date facture" value={fmtDate(inv.invoice_date)} />
            <Info label="Date échéance" value={fmtDate(inv.due_date)} />
          </div>

          {inv.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{inv.description}</p>
            </div>
          )}

          {fileUrl && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Document</p>
              <Button asChild variant="outline" size="sm">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="h-4 w-4" /> Ouvrir le fichier
                </a>
              </Button>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Journal des événements
            </p>
            <div className="relative space-y-0">
              {history.length === 0 && <p className="text-xs text-muted-foreground">Aucun événement.</p>}
              {history.map((h, idx) => {
                const meta = EVENT_META[h.nouveau_statut];
                const newCfg = STATUS_CONFIG[h.nouveau_statut];
                const Icon = meta?.icon || History;
                const isLast = idx === history.length - 1;
                return (
                  <div key={h.id} className="relative flex gap-3 pb-4">
                    {!isLast && (
                      <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden />
                    )}
                    <div className={cn(
                      "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                      newCfg.bg, newCfg.color, "border-border"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">
                          {meta?.label || newCfg.label}
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDT(h.created_at)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {meta?.description || ""}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Par</span>
                        <span className="font-medium text-foreground">{h.user_nom?.trim() || "Système"}</span>
                        {h.ancien_statut && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              {STATUS_CONFIG[h.ancien_statut].label}
                              <ArrowRight className="h-3 w-3" />
                              <span className={cn("font-medium", newCfg.color)}>{newCfg.label}</span>
                            </span>
                          </>
                        )}
                      </div>
                      {h.commentaire && (
                        <p className="mt-1 text-xs italic text-muted-foreground bg-muted/50 rounded px-2 py-1">
                          « {h.commentaire} »
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
