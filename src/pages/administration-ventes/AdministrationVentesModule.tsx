import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useOperationsStore } from "@/hooks/use-operations-store";
import { useConsolidationsStore, type DepenseConsolidation } from "@/hooks/use-consolidations-store";
import { OPERATION_STATUT_CONFIG, CATEGORIE_DEPENSE_CONFIG, formatMontantOp, formatDateShort, type CategorieDepense } from "@/types/operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, CheckCircle2, Trash2, TrendingUp, TrendingDown, Wallet, Package, Receipt } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import FacturesTab from "@/pages/finance/FacturesTab";

type Periode = "WEEK" | "MONTH" | "QUARTER" | "CUSTOM";

const STATUT_VALIDATION_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  EN_ATTENTE: { label: "En attente DG", color: "text-warning", bgColor: "bg-warning/10" },
  APPROUVE: { label: "Approuvé", color: "text-info", bgColor: "bg-info/10" },
  PAYE: { label: "Payé", color: "text-success", bgColor: "bg-success/10" },
  REJETE: { label: "Rejeté", color: "text-destructive", bgColor: "bg-destructive/10" },
};

export default function AdministrationVentesModule() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageFactures = user?.role === "DG" || user?.role === "FINANCE" || user?.role === "ADMIN_VENTES" || user?.role === "ADMIN";
  const { operations, loading: opsLoading } = useOperationsStore();
  const { consolidations, depenses, loading: consLoading, addDepense, deleteDepense, terminerConsolidation } = useConsolidationsStore();
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "consolidation");
  const [periode, setPeriode] = useState<Periode>("MONTH");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [showAddDepense, setShowAddDepense] = useState(false);
  const [newDep, setNewDep] = useState({ libelle: "", categorie: "AUTRE" as CategorieDepense, montant: 0, date: new Date().toISOString().slice(0, 10), commentaire: "" });

  // Sync with URL params (notifications deep-linking)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const opParam = searchParams.get("op");
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
    if (opParam && opParam !== selectedOpId) setSelectedOpId(opParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const next = new URLSearchParams(searchParams);
    next.set("tab", val);
    if (val !== "consolidation") next.delete("op");
    setSearchParams(next, { replace: true });
  };

  const handleSelectOp = (id: string) => {
    setSelectedOpId(id);
    const next = new URLSearchParams(searchParams);
    next.set("tab", "consolidation");
    next.set("op", id);
    setSearchParams(next, { replace: true });
  };

  // Opérations livrées ou consolidées
  const operationsLivrees = useMemo(
    () => operations.filter(o => o.statut === "TERMINEE" || o.statut === "CONSOLIDEE"),
    [operations]
  );

  const selectedOp = operationsLivrees.find(o => o.id === selectedOpId);
  const selectedCons = selectedOp ? consolidations.find(c => c.operationId === selectedOp.id) : undefined;
  const selectedDepenses = selectedOp ? depenses.filter(d => d.operationId === selectedOp.id) : [];
  const totalDepensesTerrain = selectedOp?.depenses.reduce((s, d) => s + d.montant, 0) || 0;
  const totalDepensesCons = selectedDepenses.reduce((s, d) => s + d.montant, 0);
  const recettes = selectedOp?.montantDevis || 0;
  const margeProj = recettes - totalDepensesTerrain - totalDepensesCons;

  // Période pour le bilan
  const { from, to } = useMemo(() => {
    const now = new Date();
    if (periode === "WEEK") return { from: startOfWeek(now, { locale: fr }), to: endOfWeek(now, { locale: fr }) };
    if (periode === "MONTH") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (periode === "QUARTER") return { from: startOfQuarter(now), to: endOfQuarter(now) };
    return { from: customRange.from, to: customRange.to };
  }, [periode, customRange]);

  const opsBilan = useMemo(() => {
    if (!from || !to) return operationsLivrees;
    return operationsLivrees.filter(o => {
      const date = o.dateLivraisonReelle ? new Date(o.dateLivraisonReelle) : new Date(o.updatedAt);
      return isWithinInterval(date, { start: from, end: to });
    });
  }, [operationsLivrees, from, to]);

  const bilanStats = useMemo(() => {
    let totalRecettes = 0, totalDepTerrain = 0, totalDepCons = 0;
    opsBilan.forEach(op => {
      totalRecettes += op.montantDevis;
      totalDepTerrain += op.depenses.reduce((s, d) => s + d.montant, 0);
      totalDepCons += depenses.filter(d => d.operationId === op.id).reduce((s, d) => s + d.montant, 0);
    });
    return {
      totalRecettes,
      totalDepenses: totalDepTerrain + totalDepCons,
      marge: totalRecettes - totalDepTerrain - totalDepCons,
      nbOps: opsBilan.length,
      nbConsolidees: opsBilan.filter(o => o.statut === "CONSOLIDEE").length,
    };
  }, [opsBilan, depenses]);

  const handleAddDepense = async () => {
    if (!selectedOp) return;
    if (!newDep.libelle || newDep.montant <= 0) { toast.error("Libellé et montant requis"); return; }
    try {
      await addDepense(selectedOp.id, newDep);
      toast.success("Dépense ajoutée — décaissement créé pour validation DG");
      setShowAddDepense(false);
      setNewDep({ libelle: "", categorie: "AUTRE", montant: 0, date: new Date().toISOString().slice(0, 10), commentaire: "" });
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  const handleTerminer = async () => {
    if (!selectedOp) return;
    try {
      await terminerConsolidation(selectedOp.id, {
        totalRecettes: recettes,
        totalDepensesTerrain,
        totalDepensesConsolidation: totalDepensesCons,
      });
      toast.success("Consolidation terminée — opération marquée CONSOLIDÉE");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  };

  if (opsLoading || consLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administration des Ventes</h1>
        <p className="text-sm text-muted-foreground">Consolidation, facturation et bilan des opérations</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="consolidation">Consolidation</TabsTrigger>
          <TabsTrigger value="factures" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Factures</TabsTrigger>
          <TabsTrigger value="bilan">Bilan par période</TabsTrigger>
        </TabsList>

        {/* === ONGLET CONSOLIDATION === */}
        <TabsContent value="consolidation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Liste opérations */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Opérations livrées ({operationsLivrees.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {operationsLivrees.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">Aucune opération livrée</p>
                ) : operationsLivrees.map(op => {
                  const isSel = op.id === selectedOpId;
                  const cfg = OPERATION_STATUT_CONFIG[op.statut];
                  return (
                    <button
                      key={op.id}
                      onClick={() => handleSelectOp(op.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border transition-colors",
                        isSel ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50 border-l-2 border-l-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">{op.reference}</span>
                        <Badge variant="outline" className={cn("border-0 text-[10px]", cfg.bgColor, cfg.color)}>{cfg.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{op.clientNom}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatMontantOp(op.montantDevis)}</p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Détail consolidation */}
            <div className="lg:col-span-2 space-y-4">
              {!selectedOp ? (
                <Card><CardContent className="p-12 text-center text-muted-foreground">Sélectionnez une opération à consolider</CardContent></Card>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{selectedOp.reference}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-0.5">{selectedOp.clientNom} — {selectedOp.lieuEmbarquement.split(",")[0]} → {selectedOp.lieuLivraison.split(",")[0]}</p>
                        </div>
                        {selectedOp.statut === "CONSOLIDEE" ? (
                          <Badge className="bg-success/10 text-success border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Consolidée</Badge>
                        ) : (
                          <Button size="sm" onClick={handleTerminer}>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />Terminer
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatBox label="Recettes" value={formatMontantOp(recettes)} color="text-success" />
                        <StatBox label="Dépenses terrain" value={formatMontantOp(totalDepensesTerrain)} color="text-warning" />
                        <StatBox label="Dépenses consol." value={formatMontantOp(totalDepensesCons)} color="text-warning" />
                        <StatBox label="Marge projetée" value={formatMontantOp(margeProj)} color={margeProj >= 0 ? "text-success" : "text-destructive"} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dépenses terrain (lecture seule) */}
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm">Dépenses terrain (chauffeur)</CardTitle></CardHeader>
                    <CardContent>
                      {selectedOp.depenses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune dépense terrain</p>
                      ) : (
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead>Date</TableHead><TableHead>Catégorie</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Montant</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {selectedOp.depenses.map(d => (
                              <TableRow key={d.id}>
                                <TableCell className="text-xs">{formatDateShort(d.date)}</TableCell>
                                <TableCell className="text-xs">{CATEGORIE_DEPENSE_CONFIG[d.categorie].label}</TableCell>
                                <TableCell className="text-xs">{d.description}</TableCell>
                                <TableCell className="text-xs text-right font-medium">{formatMontantOp(d.montant)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Dépenses de consolidation */}
                  <Card>
                    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm">Dépenses de consolidation</CardTitle>
                      {selectedOp.statut !== "CONSOLIDEE" && (
                        <Dialog open={showAddDepense} onOpenChange={setShowAddDepense}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1.5" />Ajouter</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Ajouter une dépense</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div><Label>Libellé *</Label><Input value={newDep.libelle} onChange={e => setNewDep(p => ({ ...p, libelle: e.target.value }))} /></div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label>Catégorie</Label>
                                  <Select value={newDep.categorie} onValueChange={(v) => setNewDep(p => ({ ...p, categorie: v as CategorieDepense }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(CATEGORIE_DEPENSE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div><Label>Montant (FCFA) *</Label><Input type="number" value={newDep.montant || ""} onChange={e => setNewDep(p => ({ ...p, montant: Number(e.target.value) }))} /></div>
                              </div>
                              <div><Label>Date</Label><Input type="date" value={newDep.date} onChange={e => setNewDep(p => ({ ...p, date: e.target.value }))} /></div>
                              <div><Label>Commentaire</Label><Textarea rows={2} value={newDep.commentaire} onChange={e => setNewDep(p => ({ ...p, commentaire: e.target.value }))} /></div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowAddDepense(false)}>Annuler</Button>
                              <Button onClick={handleAddDepense}>Ajouter</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardHeader>
                    <CardContent>
                      {selectedDepenses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune dépense de consolidation</p>
                      ) : (
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead>Date</TableHead><TableHead>Catégorie</TableHead><TableHead>Libellé</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Montant</TableHead><TableHead></TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {selectedDepenses.map(d => {
                              const cfg = STATUT_VALIDATION_CONFIG[d.statutValidation] || STATUT_VALIDATION_CONFIG.EN_ATTENTE;
                              return (
                                <TableRow key={d.id}>
                                  <TableCell className="text-xs">{formatDateShort(d.date)}</TableCell>
                                  <TableCell className="text-xs">{CATEGORIE_DEPENSE_CONFIG[d.categorie].label}</TableCell>
                                  <TableCell className="text-xs">{d.libelle}</TableCell>
                                  <TableCell><Badge variant="outline" className={cn("border-0 text-[10px]", cfg.bgColor, cfg.color)}>{cfg.label}</Badge></TableCell>
                                  <TableCell className="text-xs text-right font-medium">{formatMontantOp(d.montant)}</TableCell>
                                  <TableCell>
                                    {d.statutValidation === "EN_ATTENTE" && selectedOp.statut !== "CONSOLIDEE" && (
                                      <Button size="icon" variant="ghost" onClick={() => deleteDepense(d.id)}>
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* === ONGLET BILAN === */}
        <TabsContent value="bilan" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base mr-auto">Bilan</CardTitle>
                <Select value={periode} onValueChange={(v) => setPeriode(v as Periode)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEK">Cette semaine</SelectItem>
                    <SelectItem value="MONTH">Ce mois</SelectItem>
                    <SelectItem value="QUARTER">Ce trimestre</SelectItem>
                    <SelectItem value="CUSTOM">Période personnalisée</SelectItem>
                  </SelectContent>
                </Select>
                {periode === "CUSTOM" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="text-xs">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                        {customRange.from ? format(customRange.from, "dd/MM/yy", { locale: fr }) : "Début"} — {customRange.to ? format(customRange.to, "dd/MM/yy", { locale: fr }) : "Fin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar mode="range" selected={customRange as any} onSelect={(r: any) => setCustomRange(r || {})} className={cn("p-3 pointer-events-auto")} locale={fr} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard icon={<Package className="h-4 w-4" />} label="Opérations" value={String(bilanStats.nbOps)} sub={`${bilanStats.nbConsolidees} consolidées`} />
                <KpiCard icon={<TrendingUp className="h-4 w-4 text-success" />} label="Recettes" value={formatMontantOp(bilanStats.totalRecettes)} />
                <KpiCard icon={<TrendingDown className="h-4 w-4 text-warning" />} label="Dépenses" value={formatMontantOp(bilanStats.totalDepenses)} />
                <KpiCard icon={<Wallet className={cn("h-4 w-4", bilanStats.marge >= 0 ? "text-success" : "text-destructive")} />} label="Marge" value={formatMontantOp(bilanStats.marge)} />
                <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Marge %" value={bilanStats.totalRecettes > 0 ? `${Math.round((bilanStats.marge / bilanStats.totalRecettes) * 100)}%` : "—"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Détail des opérations</CardTitle></CardHeader>
            <CardContent>
              {opsBilan.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune opération sur cette période</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Réf</TableHead><TableHead>Client</TableHead><TableHead>Livraison</TableHead><TableHead>Statut</TableHead>
                    <TableHead className="text-right">Recettes</TableHead><TableHead className="text-right">Dépenses</TableHead><TableHead className="text-right">Marge</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {opsBilan.map(op => {
                      const dt = op.depenses.reduce((s, d) => s + d.montant, 0);
                      const dc = depenses.filter(d => d.operationId === op.id).reduce((s, d) => s + d.montant, 0);
                      const m = op.montantDevis - dt - dc;
                      const cfg = OPERATION_STATUT_CONFIG[op.statut];
                      return (
                        <TableRow key={op.id} className="cursor-pointer hover:bg-muted/30" onClick={() => handleSelectOp(op.id)}>
                          <TableCell className="text-xs font-medium">{op.reference}</TableCell>
                          <TableCell className="text-xs">{op.clientNom}</TableCell>
                          <TableCell className="text-xs">{op.dateLivraisonReelle ? formatDateShort(op.dateLivraisonReelle) : "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={cn("border-0 text-[10px]", cfg.bgColor, cfg.color)}>{cfg.label}</Badge></TableCell>
                          <TableCell className="text-xs text-right">{formatMontantOp(op.montantDevis)}</TableCell>
                          <TableCell className="text-xs text-right">{formatMontantOp(dt + dc)}</TableCell>
                          <TableCell className={cn("text-xs text-right font-medium", m >= 0 ? "text-success" : "text-destructive")}>{formatMontantOp(m)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ONGLET FACTURES === */}
        <TabsContent value="factures" className="space-y-4">
          <FacturesTab canManage={canManageFactures} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold mt-0.5", color)}>{value}</p>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <p className="text-base font-semibold mt-1.5 text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
