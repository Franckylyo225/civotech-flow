import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Inbox, Send, ClipboardCheck, CreditCard, FileCheck, FileText, AlertTriangle, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSupplierInvoicesStore, STATUS_CONFIG, type SupplierInvoiceStatus } from "@/hooks/use-supplier-invoices-store";
import { useFournisseursStore } from "@/hooks/use-fournisseurs-store";
import { SupplierInvoiceCreateDialog } from "./SupplierInvoiceCreateDialog";
import { SupplierInvoiceDetailDialog } from "./SupplierInvoiceDetailDialog";
import { PaymentBatchDialog } from "./PaymentBatchDialog";
import { DGApprovalDialog } from "./DGApprovalDialog";
import { PaymentRecordDialog } from "./PaymentRecordDialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

// Statuts considérés comme "ouverts" : on calcule l'urgence d'échéance dessus uniquement
const OPEN_STATUSES: SupplierInvoiceStatus[] = ["received", "processing", "pending_DG", "approved_for_payment", "cheque_ready"];

type EcheanceLevel = "overdue" | "due_soon" | "ok" | "none" | "closed";

export function getEcheanceLevel(dueDate: string | null | undefined, status: string): EcheanceLevel {
  if (!OPEN_STATUSES.includes(status as SupplierInvoiceStatus)) return "closed";
  if (!dueDate) return "none";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "due_soon";
  return "ok";
}

export default function FacturesFournisseursModule() {
  const { user } = useAuth();
  const { invoices, loading, recordPayment, confirmDelivery, archive, updateStatus } = useSupplierInvoicesStore();
  const { fournisseurs } = useFournisseursStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = user?.role;
  const isDG = role === "DG";
  const isAssistante = role === "ASSISTANTE" || isDG;
  const isFinance = role === "FINANCE" || isDG;

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isDG) return "validation";
    if (role === "FINANCE") return "paiements";
    return "all";
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [echeanceFilter, setEcheanceFilter] = useState<string>("all"); // all | overdue | due_soon | open

  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [dgOpen, setDgOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(searchParams.get("id"));

  const supplierMap = useMemo(() => {
    const m: Record<string, string> = {};
    fournisseurs.forEach(f => { m[f.id] = f.nom; });
    return m;
  }, [fournisseurs]);

  const filtered = useMemo(() => {
    return invoices.filter(i => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (supplierFilter !== "all" && i.supplier_id !== supplierFilter) return false;
      if (echeanceFilter !== "all") {
        const lvl = getEcheanceLevel(i.due_date, i.status);
        if (echeanceFilter === "overdue" && lvl !== "overdue") return false;
        if (echeanceFilter === "due_soon" && lvl !== "due_soon") return false;
        if (echeanceFilter === "open" && !["overdue", "due_soon", "ok"].includes(lvl)) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const supName = (supplierMap[i.supplier_id] || "").toLowerCase();
        if (!i.reference.toLowerCase().includes(s) && !supName.includes(s)) return false;
      }
      return true;
    });
  }, [invoices, search, statusFilter, supplierFilter, echeanceFilter, supplierMap]);

  // Sous-ensembles métier
  const inProcessing = invoices.filter(i => i.status === "processing");
  const pendingDG = invoices.filter(i => i.status === "pending_DG");
  const approvedToPay = invoices.filter(i => i.status === "approved_for_payment");
  const chequesReady = invoices.filter(i => i.status === "cheque_ready");

  const overdueInvoices = useMemo(
    () => invoices.filter(i => getEcheanceLevel(i.due_date, i.status) === "overdue"),
    [invoices]
  );
  const dueSoonInvoices = useMemo(
    () => invoices.filter(i => getEcheanceLevel(i.due_date, i.status) === "due_soon"),
    [invoices]
  );

  const stats = {
    total: invoices.length,
    enAttenteDG: pendingDG.length,
    aPayer: approvedToPay.length,
    chequesARemettre: chequesReady.length,
    enRetard: overdueInvoices.length,
    bientotEchues: dueSoonInvoices.length,
    montantRetard: overdueInvoices.reduce((s, i) => s + Number(i.amount || 0), 0),
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    const p = new URLSearchParams(searchParams);
    p.set("id", id);
    setSearchParams(p, { replace: true });
  };

  const closeDetail = () => {
    setDetailId(null);
    const p = new URLSearchParams(searchParams);
    p.delete("id");
    setSearchParams(p, { replace: true });
  };

  const handleProcessing = async (id: string) => {
    await updateStatus(id, "processing");
  };

  const openPayment = (id: string) => {
    setPaymentInvoiceId(id);
    setPaymentOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Factures Fournisseurs</h1>
          <p className="text-muted-foreground">Réception, traitement, validation DG et paiement.</p>
        </div>
        {isAssistante && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Inbox className="h-4 w-4" /> Nouvelle facture
          </Button>
        )}
      </div>

      {/* Banner alerte échéances */}
      {(stats.enRetard > 0 || stats.bientotEchues > 0) && (
        <Card className={cn("border-l-4", stats.enRetard > 0 ? "border-l-destructive bg-destructive/5" : "border-l-warning bg-warning/5")}>
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <AlertTriangle className={cn("h-5 w-5 shrink-0", stats.enRetard > 0 ? "text-destructive" : "text-warning")} />
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-semibold text-foreground">
                {stats.enRetard > 0 && <>{stats.enRetard} facture{stats.enRetard > 1 ? "s" : ""} en retard ({fmt(stats.montantRetard)})</>}
                {stats.enRetard > 0 && stats.bientotEchues > 0 && " — "}
                {stats.bientotEchues > 0 && <>{stats.bientotEchues} échéance{stats.bientotEchues > 1 ? "s" : ""} dans les 3 prochains jours</>}
              </p>
              <p className="text-xs text-muted-foreground">À traiter en priorité.</p>
            </div>
            {stats.enRetard > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setActiveTab("all"); setEcheanceFilter("overdue"); setStatusFilter("all"); }}
              >
                Voir les retards
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Total factures" value={stats.total} icon={FileText} />
        <KpiCard label="En retard" value={stats.enRetard} icon={AlertTriangle} accent="destructive" />
        <KpiCard label="En attente DG" value={stats.enAttenteDG} icon={ClipboardCheck} accent="warning" />
        <KpiCard label="À payer" value={stats.aPayer} icon={CreditCard} accent="primary" />
        <KpiCard label="Chèques à remettre" value={stats.chequesARemettre} icon={FileCheck} accent="info" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="gap-1.5">
            <FileText className="h-4 w-4" /> Toutes
          </TabsTrigger>
          {(isFinance) && (
            <TabsTrigger value="lots" className="gap-1.5">
              <Send className="h-4 w-4" /> Préparer un lot
              {inProcessing.length > 0 && (
                <span className="ml-1 rounded-full bg-info/15 px-1.5 text-[10px] font-bold text-info">{inProcessing.length}</span>
              )}
            </TabsTrigger>
          )}
          {isDG && (
            <TabsTrigger value="validation" className="gap-1.5">
              <ClipboardCheck className="h-4 w-4" /> Validation DG
              {pendingDG.length > 0 && (
                <span className="ml-1 rounded-full bg-warning/15 px-1.5 text-[10px] font-bold text-warning">{pendingDG.length}</span>
              )}
            </TabsTrigger>
          )}
          {isFinance && (
            <TabsTrigger value="paiements" className="gap-1.5">
              <CreditCard className="h-4 w-4" /> Paiements
              {approvedToPay.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">{approvedToPay.length}</span>
              )}
            </TabsTrigger>
          )}
          {isAssistante && (
            <TabsTrigger value="cheques" className="gap-1.5">
              <FileCheck className="h-4 w-4" /> Chèques à remettre
              {chequesReady.length > 0 && (
                <span className="ml-1 rounded-full bg-info/15 px-1.5 text-[10px] font-bold text-info">{chequesReady.length}</span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Toutes */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Rechercher (référence, fournisseur)…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Fournisseur" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous fournisseurs</SelectItem>
                    {fournisseurs.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <InvoiceTable
                rows={filtered}
                loading={loading}
                supplierMap={supplierMap}
                onRowClick={openDetail}
                actions={(inv) => (
                  <div className="flex gap-1 justify-end">
                    {isAssistante && inv.status === "received" && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleProcessing(inv.id); }}>
                        Transmettre
                      </Button>
                    )}
                    {isAssistante && inv.status === "delivered" && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); archive(inv.id); }}>
                        Archiver
                      </Button>
                    )}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Préparer un lot (Finance) */}
        {isFinance && (
          <TabsContent value="lots">
            <Card>
              <CardHeader>
                <CardTitle>Factures à intégrer dans un lot</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez les factures en traitement à soumettre au DG pour validation.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-3">
                  <Button onClick={() => setBatchOpen(true)} disabled={inProcessing.length === 0}>
                    Créer un lot de paiement
                  </Button>
                </div>
                <InvoiceTable
                  rows={inProcessing}
                  loading={loading}
                  supplierMap={supplierMap}
                  onRowClick={openDetail}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Validation DG */}
        {isDG && (
          <TabsContent value="validation">
            <Card>
              <CardHeader>
                <CardTitle>Factures en attente de validation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez les factures à approuver pour paiement.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-3">
                  <Button onClick={() => setDgOpen(true)} disabled={pendingDG.length === 0}>
                    Examiner et approuver
                  </Button>
                </div>
                <InvoiceTable
                  rows={pendingDG}
                  loading={loading}
                  supplierMap={supplierMap}
                  onRowClick={openDetail}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Paiements (Finance) */}
        {isFinance && (
          <TabsContent value="paiements">
            <Card>
              <CardHeader>
                <CardTitle>Factures approuvées à payer</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceTable
                  rows={approvedToPay}
                  loading={loading}
                  supplierMap={supplierMap}
                  onRowClick={openDetail}
                  actions={(inv) => (
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); openPayment(inv.id); }}>
                      Enregistrer paiement
                    </Button>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Chèques à remettre (Assistante) */}
        {isAssistante && (
          <TabsContent value="cheques">
            <Card>
              <CardHeader>
                <CardTitle>Chèques préparés à remettre au fournisseur</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceTable
                  rows={chequesReady}
                  loading={loading}
                  supplierMap={supplierMap}
                  onRowClick={openDetail}
                  actions={(inv) => (
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); confirmDelivery(inv.id); }}>
                      Confirmer remise
                    </Button>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <SupplierInvoiceCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SupplierInvoiceDetailDialog
        invoiceId={detailId}
        onClose={closeDetail}
        supplierMap={supplierMap}
      />
      <PaymentBatchDialog open={batchOpen} onOpenChange={setBatchOpen} invoices={inProcessing} supplierMap={supplierMap} />
      <DGApprovalDialog open={dgOpen} onOpenChange={setDgOpen} invoices={pendingDG} supplierMap={supplierMap} />
      <PaymentRecordDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        invoiceId={paymentInvoiceId}
        onPay={recordPayment}
      />
    </div>
  );
}

/* ================= Sous-composants ================= */

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: "primary" | "warning" | "info" }) {
  const accentClass = accent === "warning" ? "text-warning bg-warning/10"
    : accent === "info" ? "text-info bg-info/10"
    : accent === "primary" ? "text-primary bg-primary/10"
    : "text-muted-foreground bg-muted";
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface InvoiceTableProps {
  rows: ReturnType<typeof useSupplierInvoicesStore>["invoices"];
  loading: boolean;
  supplierMap: Record<string, string>;
  onRowClick?: (id: string) => void;
  actions?: (inv: any) => React.ReactNode;
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
}

export function InvoiceTable({ rows, loading, supplierMap, onRowClick, actions, selectable, selected, onToggle }: InvoiceTableProps) {
  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">Aucune facture</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selectable && <TableHead className="w-[40px]"></TableHead>}
          <TableHead>Référence</TableHead>
          <TableHead>Fournisseur</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Échéance</TableHead>
          <TableHead className="text-right">Montant</TableHead>
          <TableHead>Statut</TableHead>
          {actions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(inv => {
          const cfg = STATUS_CONFIG[inv.status as SupplierInvoiceStatus];
          return (
            <TableRow
              key={inv.id}
              className={onRowClick ? "cursor-pointer" : ""}
              onClick={() => onRowClick?.(inv.id)}
            >
              {selectable && (
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox checked={selected?.has(inv.id) || false} onCheckedChange={() => onToggle?.(inv.id)} />
                </TableCell>
              )}
              <TableCell className="font-mono text-xs">{inv.reference}</TableCell>
              <TableCell className="font-medium">{supplierMap[inv.supplier_id] || "—"}</TableCell>
              <TableCell>{fmtDate(inv.invoice_date)}</TableCell>
              <TableCell>{fmtDate(inv.due_date)}</TableCell>
              <TableCell className="text-right font-medium">{fmt(inv.amount)}</TableCell>
              <TableCell>
                <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", cfg.bg, cfg.color)}>
                  {cfg.label}
                </span>
              </TableCell>
              {actions && <TableCell className="text-right">{actions(inv)}</TableCell>}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
