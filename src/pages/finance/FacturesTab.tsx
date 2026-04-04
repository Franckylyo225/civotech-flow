import { useState } from "react";
import {
  Plus, Search, Receipt, Clock, CheckCircle2, DollarSign,
  Pencil, Trash2, Send, Eye, CreditCard, AlertTriangle, FileText, Download, Paperclip, CalendarIcon, X,
} from "lucide-react";
import {
  useFacturesStore, STATUT_FACTURE_CONFIG,
  type FactureRow, type StatutFacture,
} from "@/hooks/use-factures-store";
import { useOperationsStore } from "@/hooks/use-operations-store";
import { useClientsStore } from "@/hooks/use-clients-store";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

interface Props { canManage: boolean; }

export default function FacturesTab({ canManage }: Props) {
  const { factures, loading, stats, addFacture, updateFacture, deleteFacture } = useFacturesStore();
  const { operations } = useOperationsStore();
  const { clients } = useClientsStore();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutFacture | "ALL" | "ECHUE">("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [showPay, setShowPay] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    operation_id: "",
    taux_tva: 18,
    date_echeance_days: 30,
    notes: "",
  });

  // Pay form
  const [payForm, setPayForm] = useState({
    montant: 0,
    mode_paiement: "VIREMENT",
    reference_paiement: "",
    date_paiement: new Date().toISOString().slice(0, 10),
  });

  const getClientNom = (id: string | null) => id ? clients.find(c => c.id === id)?.nom || "—" : "—";
  const getOpRef = (id: string | null) => id ? operations.find(o => o.id === id)?.reference || "—" : "—";
  const getOpBL = (id: string | null) => id ? operations.find(o => o.id === id)?.bonLivraisonUrl : undefined;

  // Operations that don't have a facture yet and are TERMINEE
  const availableOps = operations.filter(op =>
    op.statut === "TERMINEE" && !factures.some(f => f.operation_id === op.id)
  );

  const filtered = factures.filter(f => {
    const matchSearch = f.reference.toLowerCase().includes(search.toLowerCase()) ||
      getClientNom(f.client_id).toLowerCase().includes(search.toLowerCase()) ||
      getOpRef(f.operation_id).toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "ALL" || f.statut === filterStatut;
    const emissionDate = new Date(f.date_emission);
    const matchFrom = !dateFrom || emissionDate >= dateFrom;
    const matchTo = !dateTo || emissionDate <= new Date(dateTo.getTime() + 86400000 - 1);
    return matchSearch && matchStatut && matchFrom && matchTo;
  });

  const handleCreate = async () => {
    if (!createForm.operation_id) { toast.error("Sélectionnez une opération"); return; }
    const op = operations.find(o => o.id === createForm.operation_id);
    if (!op) return;
    // Get client_id from DB since Operation type uses camelCase without clientId
    const { data: opRow } = await supabase.from("operations").select("client_id").eq("id", op.id).single();
    // Le montant du devis est déjà TTC (TVA incluse lors de l'édition du devis)
    const montantTtc = op.montantDevis;
    const montantTva = Math.round(montantTtc * createForm.taux_tva / (100 + createForm.taux_tva));
    const montantHt = montantTtc - montantTva;
    try {
      await addFacture({
        operation_id: op.id,
        client_id: opRow?.client_id || null,
        montant_ht: montantHt,
        taux_tva: createForm.taux_tva,
        montant_tva: Math.round(montantTva),
        montant_ttc: Math.round(montantTtc),
        date_emission: new Date().toISOString().slice(0, 10),
        date_echeance: addDays(new Date(), createForm.date_echeance_days).toISOString().slice(0, 10),
        statut: "BROUILLON" as StatutFacture,
        notes: createForm.notes || null,
      });
      toast.success("Facture créée");
      setShowCreate(false);
      setCreateForm({ operation_id: "", taux_tva: 18, date_echeance_days: 30, notes: "" });
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleEnvoyer = async (id: string) => {
    try {
      await updateFacture(id, { statut: "ENVOYEE" as any });
      toast.success("Facture marquée comme envoyée");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleOpenPay = (f: FactureRow) => {
    setPayForm({
      montant: f.montant_ttc - f.montant_paye,
      mode_paiement: "VIREMENT",
      reference_paiement: "",
      date_paiement: new Date().toISOString().slice(0, 10),
    });
    setShowPay(f.id);
  };

  const handlePay = async () => {
    if (!showPay) return;
    const facture = factures.find(f => f.id === showPay);
    if (!facture) return;
    if (payForm.montant <= 0) { toast.error("Montant invalide"); return; }
    if (!payForm.reference_paiement.trim()) { toast.error("Référence de paiement obligatoire"); return; }
    const newPaye = facture.montant_paye + payForm.montant;
    const newStatut: StatutFacture = newPaye >= facture.montant_ttc ? "PAYEE" : "PARTIELLEMENT_PAYEE";
    try {
      await updateFacture(showPay, {
        montant_paye: Math.min(newPaye, facture.montant_ttc),
        statut: newStatut as any,
        mode_paiement: payForm.mode_paiement,
        reference_paiement: payForm.reference_paiement,
        date_paiement: payForm.date_paiement,
      });
      toast.success(newStatut === "PAYEE" ? "Facture intégralement payée" : "Paiement partiel enregistré");
      setShowPay(null);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteFacture(id); toast.success("Facture supprimée"); setDeleteConfirm(null); }
    catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const detailFacture = showDetail ? factures.find(f => f.id === showDetail) : null;

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Receipt, value: stats.total, label: "Total", color: "primary" },
          { icon: Clock, value: stats.enAttente, label: "En attente", color: "warning" },
          { icon: CheckCircle2, value: stats.payees, label: "Payées", color: "success" },
          { icon: DollarSign, value: `${stats.resteAEncaisser.toLocaleString()} F`, label: "À encaisser", color: "info" },
        ].map((s, i) => (
          <Card key={i} className="border border-border shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", `bg-${s.color}/10`)}>
                <s.icon className={cn("h-5 w-5", `text-${s.color}`)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operations en attente de facture */}
      {availableOps.length > 0 && (
        <Card className="border border-warning/30 bg-warning/5 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="font-semibold text-sm text-foreground">
                {availableOps.length} opération{availableOps.length > 1 ? "s" : ""} terminée{availableOps.length > 1 ? "s" : ""} en attente de facturation
              </h3>
            </div>
            <div className="grid gap-2">
              {availableOps.map(op => (
                <div key={op.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-mono text-sm font-medium">{op.reference}</span>
                      <span className="text-muted-foreground text-sm ml-2">— {op.clientNom}</span>
                    </div>
                    {op.bonLivraisonUrl ? (
                      <a href={op.bonLivraisonUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-success hover:underline">
                        <Paperclip className="h-3 w-3" />BL joint
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <Paperclip className="h-3 w-3" />BL manquant
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{op.montantDevis.toLocaleString()} F</span>
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => { setCreateForm(f => ({ ...f, operation_id: op.id })); setShowCreate(true); }}>
                        <Plus className="h-3.5 w-3.5 mr-1" />Facturer
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher par référence, client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatut} onValueChange={v => setFilterStatut(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(STATUT_FACTURE_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left text-sm font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Du"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left text-sm font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Au"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} title="Réinitialiser les dates">
                <X className="h-4 w-4" />
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setShowCreate(true)} disabled={availableOps.length === 0}>
                <Plus className="mr-1.5 h-4 w-4" />Générer une facture
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Opération</TableHead>
                <TableHead>BL</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Payé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f => {
                const statutCfg = STATUT_FACTURE_CONFIG[f.statut];
                const isOverdue = f.date_echeance && f.statut !== "PAYEE" && f.statut !== "ANNULEE" && new Date(f.date_echeance) < new Date();
                const blUrl = getOpBL(f.operation_id);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-sm font-medium">{f.reference}</TableCell>
                    <TableCell className="text-sm">{getClientNom(f.client_id)}</TableCell>
                    <TableCell className="font-mono text-xs">{getOpRef(f.operation_id)}</TableCell>
                    <TableCell>
                      {blUrl ? (
                        <a href={blUrl} target="_blank" rel="noopener noreferrer" title="Voir le bon de livraison">
                          <Badge variant="outline" className="border-0 text-xs bg-success/10 text-success gap-1 cursor-pointer hover:bg-success/20">
                            <Paperclip className="h-3 w-3" />BL
                          </Badge>
                        </a>
                      ) : (
                        <Badge variant="outline" className="border-0 text-xs bg-muted text-muted-foreground">—</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{f.montant_ttc.toLocaleString()} F</TableCell>
                    <TableCell className="text-sm">
                      <span className={cn(f.montant_paye > 0 && "text-success font-medium")}>{f.montant_paye.toLocaleString()} F</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", statutCfg.bgColor, statutCfg.color)}>
                        {statutCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-sm", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {f.date_echeance ? format(new Date(f.date_echeance), "dd/MM/yyyy") : "—"}
                      {isOverdue && " ⚠"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowDetail(f.id)} title="Détail">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canManage && f.statut === "BROUILLON" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEnvoyer(f.id)} title="Marquer envoyée">
                              <Send className="h-3.5 w-3.5 text-info" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(f.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {canManage && (f.statut === "ENVOYEE" || f.statut === "PARTIELLEMENT_PAYEE") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenPay(f)} title="Encaisser">
                            <CreditCard className="h-3.5 w-3.5 text-success" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Aucune facture</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create from operation */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Générer une facture</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Opération terminée *</Label>
              <Select value={createForm.operation_id} onValueChange={v => setCreateForm(f => ({ ...f, operation_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {availableOps.map(op => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.reference} — {op.clientNom} — {op.montantDevis.toLocaleString()} F
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TVA (%)</Label>
                <Input type="number" value={createForm.taux_tva} onChange={e => setCreateForm(f => ({ ...f, taux_tva: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Échéance (jours)</Label>
                <Input type="number" value={createForm.date_echeance_days} onChange={e => setCreateForm(f => ({ ...f, date_echeance_days: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            {createForm.operation_id && (() => {
              const op = operations.find(o => o.id === createForm.operation_id);
              if (!op) return null;
              const ttc = op.montantDevis;
              const tva = Math.round(ttc * createForm.taux_tva / (100 + createForm.taux_tva));
              const ht = ttc - tva;
              return (
                <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">HT</span><span>{ht.toLocaleString()} F</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">TVA ({createForm.taux_tva}%)</span><span>{tva.toLocaleString()} F</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold"><span>TTC</span><span>{ttc.toLocaleString()} F</span></div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate}>Générer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={!!showPay} onOpenChange={() => setShowPay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Encaisser un paiement</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Montant (F) *</Label>
              <Input type="number" value={payForm.montant} onChange={e => setPayForm(f => ({ ...f, montant: Number(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select value={payForm.mode_paiement} onValueChange={v => setPayForm(f => ({ ...f, mode_paiement: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIREMENT">Virement</SelectItem>
                    <SelectItem value="CHEQUE">Chèque</SelectItem>
                    <SelectItem value="ESPECES">Espèces</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={payForm.date_paiement} onChange={e => setPayForm(f => ({ ...f, date_paiement: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Référence paiement *</Label>
              <Input value={payForm.reference_paiement} onChange={e => setPayForm(f => ({ ...f, reference_paiement: e.target.value }))} placeholder="Ex: VIR-2026-123" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPay(null)}>Annuler</Button>
            <Button onClick={handlePay}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          {detailFacture && (() => {
            const f = detailFacture;
            const statutCfg = STATUT_FACTURE_CONFIG[f.statut];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <span className="font-mono">{f.reference}</span>
                    <Badge variant="outline" className={cn("border-0 text-xs", statutCfg.bgColor, statutCfg.color)}>{statutCfg.label}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Client :</span> <span className="font-medium">{getClientNom(f.client_id)}</span></div>
                  <div><span className="text-muted-foreground">Opération :</span> <span className="font-mono">{getOpRef(f.operation_id)}</span></div>
                  <div><span className="text-muted-foreground">Émission :</span> {format(new Date(f.date_emission), "dd/MM/yyyy")}</div>
                  <div><span className="text-muted-foreground">Échéance :</span> {f.date_echeance ? format(new Date(f.date_echeance), "dd/MM/yyyy") : "—"}</div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Montant HT</span><span>{f.montant_ht.toLocaleString()} F</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">TVA ({f.taux_tva}%)</span><span>{f.montant_tva.toLocaleString()} F</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold"><span>Total TTC</span><span>{f.montant_ttc.toLocaleString()} F</span></div>
                  <div className="flex justify-between text-success"><span>Payé</span><span>{f.montant_paye.toLocaleString()} F</span></div>
                  {f.montant_ttc - f.montant_paye > 0 && f.statut !== "ANNULEE" && (
                    <div className="flex justify-between text-warning font-medium"><span>Reste à payer</span><span>{(f.montant_ttc - f.montant_paye).toLocaleString()} F</span></div>
                  )}
                </div>
                {f.reference_paiement && (
                  <>
                    <Separator />
                    <div className="text-sm space-y-1">
                      <div><span className="text-muted-foreground">Mode :</span> {f.mode_paiement}</div>
                      <div><span className="text-muted-foreground">Réf. paiement :</span> {f.reference_paiement}</div>
                      {f.date_paiement && <div><span className="text-muted-foreground">Date paiement :</span> {format(new Date(f.date_paiement), "dd/MM/yyyy")}</div>}
                    </div>
                  </>
                )}
                {f.notes && <div className="text-sm p-2 rounded bg-muted/50 border"><span className="text-muted-foreground text-xs">Notes :</span><p className="mt-0.5">{f.notes}</p></div>}
                {/* Bon de livraison */}
                {(() => {
                  const blUrl = getOpBL(f.operation_id);
                  return blUrl ? (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                        <Paperclip className="h-4 w-4 text-success" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Bon de livraison</p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{blUrl.split("/").pop()}</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={blUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5 mr-1" />Télécharger
                          </a>
                        </Button>
                      </div>
                    </>
                  ) : null;
                })()}
              </>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Supprimer cette facture ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
