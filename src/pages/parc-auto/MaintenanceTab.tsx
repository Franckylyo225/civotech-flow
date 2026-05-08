import { useState, useEffect, useMemo } from "react";
import {
  Wrench, Plus, Search, Pencil, Trash2, Clock,
  CheckCircle2, AlertTriangle, AlertCircle, Calendar, ShoppingCart, Filter,
} from "lucide-react";
import { useMaintenancesStore, STATUT_MAINTENANCE_CONFIG, TYPE_MAINTENANCE_CONFIG, type MaintenanceRow, type TypeMaintenance, type StatutMaintenance } from "@/hooks/use-maintenances-store";
import { useParcAutoStore } from "@/hooks/use-parc-auto-store";
import { supabase } from "@/integrations/supabase/client";
import { type StatutDemandeAchat } from "@/hooks/use-demandes-achat-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination, usePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, subDays, subWeeks, isAfter, parseISO, differenceInDays, startOfMonth } from "date-fns";

type PeriodFilter = "ALL" | "WEEK" | "30DAYS" | "90DAYS" | "CUSTOM";
type TypeFilter = "ALL" | TypeMaintenance;
const PERIOD_LABELS: Record<PeriodFilter, string> = {
  ALL: "Toutes les périodes",
  WEEK: "Cette semaine",
  "30DAYS": "30 derniers jours",
  "90DAYS": "90 derniers jours",
  CUSTOM: "Personnalisé",
};

const EMPTY_FORM = {
  camion_id: "", type: "PREVENTIVE" as TypeMaintenance,
  description: "", pieces_changees: "", cout_estime: 0, cout_reel: 0,
  date_prevue: new Date().toISOString().slice(0, 10),
  date_debut: "", date_fin: "",
  statut: "PLANIFIEE" as StatutMaintenance, km_declenchement: 0,
  urgence: "NORMALE" as "NORMALE" | "HAUTE" | "CRITIQUE",
};

// Couleurs spécifiques demandées
const DA_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  PAYEE:         { bg: "#EAF3DE", text: "#27500A", label: "Payée" },
  DEVIS_EN_COURS:{ bg: "#FAEEDA", text: "#633806", label: "Devis en cours" },
  VALIDEE_DG:    { bg: "#E6F1FB", text: "#0C447C", label: "Approuvée DG" },
  SOUMISE_DG:    { bg: "#F1EFE8", text: "#444441", label: "En attente DG" },
  SOUMISE:       { bg: "#F1EFE8", text: "#444441", label: "Soumise" },
  BROUILLON:     { bg: "#F1EFE8", text: "#444441", label: "Brouillon" },
  REFUSEE_DG:    { bg: "#FCEBEB", text: "#791F1F", label: "Refusée" },
  DECAISSEMENT:  { bg: "#FAEEDA", text: "#633806", label: "Décaissement" },
  CLOTUREE:      { bg: "#EAF3DE", text: "#27500A", label: "Clôturée" },
};

interface DaInfo { id: string; reference: string; statut: StatutDemandeAchat; created_at: string; montant_estime: number }
interface Props { canManage: boolean; }

export default function MaintenanceTab({ canManage }: Props) {
  const { maintenances, loading, addMaintenance, updateMaintenance, deleteMaintenance, refetch } = useMaintenancesStore();
  const { camions } = useParcAutoStore();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutMaintenance | "ALL" | "EN_RETARD">("ALL");
  const [filterType, setFilterType] = useState<TypeFilter>("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>("ALL");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [daByMaintenance, setDaByMaintenance] = useState<Record<string, DaInfo>>({});
  const [coutDialog, setCoutDialog] = useState<{ id: string; value: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("demandes_achat")
        .select("id, maintenance_id, reference, statut, created_at, montant_estime")
        .not("maintenance_id", "is", null);
      const map: Record<string, DaInfo> = {};
      (data || []).forEach((d: any) => {
        if (d.maintenance_id) map[d.maintenance_id] = {
          id: d.id, reference: d.reference, statut: d.statut,
          created_at: d.created_at, montant_estime: d.montant_estime,
        };
      });
      setDaByMaintenance(map);
    })();
  }, [maintenances]);

  const getCamion = (id: string) => camions.find(c => c.id === id);

  const isEnRetard = (m: MaintenanceRow): boolean =>
    m.statut !== "TERMINEE" && m.statut !== "ANNULEE" && new Date(m.date_prevue) < new Date(new Date().toDateString());

  const joursRetard = (m: MaintenanceRow): number =>
    Math.max(0, differenceInDays(new Date(new Date().toDateString()), new Date(m.date_prevue)));

  // KPIs enrichis
  const kpis = useMemo(() => {
    const total = maintenances.length;
    const planifiee = maintenances.filter(m => m.statut === "PLANIFIEE" && !isEnRetard(m)).length;
    const enRetard = maintenances.filter(isEnRetard);
    const maxRetard = enRetard.reduce((mx, m) => Math.max(mx, joursRetard(m)), 0);
    const coutTotal = maintenances.filter(m => m.statut === "TERMINEE").reduce((s, m) => s + (m.cout_reel || 0), 0);

    // Ratio mois en cours
    const monthStart = startOfMonth(new Date());
    const moisM = maintenances.filter(m => new Date(m.date_prevue) >= monthStart);
    const nbPrev = moisM.filter(m => m.type === "PREVENTIVE").length;
    const nbAutre = moisM.filter(m => m.type === "REMPLACEMENT" || m.type === "CORRECTIVE").length;
    const totalMois = nbPrev + nbAutre;
    const pctPrev = totalMois ? Math.round((nbPrev / totalMois) * 100) : 0;
    const pctAutre = totalMois ? 100 - pctPrev : 0;

    return { total, planifiee, enRetardCount: enRetard.length, maxRetard, coutTotal, pctPrev, pctAutre, totalMois };
  }, [maintenances]);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (filterPeriod === "WEEK") return subWeeks(now, 1);
    if (filterPeriod === "30DAYS") return subDays(now, 30);
    if (filterPeriod === "90DAYS") return subDays(now, 90);
    if (filterPeriod === "CUSTOM" && customFrom) return parseISO(customFrom);
    return null;
  }, [filterPeriod, customFrom]);

  const periodEnd = useMemo(() => {
    if (filterPeriod === "CUSTOM" && customTo) return parseISO(customTo);
    return null;
  }, [filterPeriod, customTo]);

  const filtered = maintenances.filter(m => {
    const c = getCamion(m.camion_id);
    const label = c ? `${c.immatriculation} ${c.marque} ${c.modele}` : "";
    const matchSearch = m.description.toLowerCase().includes(search.toLowerCase()) ||
      label.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "ALL" || m.type === filterType;
    const matchStatut =
      filterStatut === "ALL" ? true :
      filterStatut === "EN_RETARD" ? isEnRetard(m) :
      m.statut === filterStatut;
    let matchPeriod = true;
    if (periodStart) {
      const d = parseISO(m.date_prevue);
      matchPeriod = isAfter(d, periodStart) && (!periodEnd || d <= periodEnd);
    }
    return matchSearch && matchType && matchStatut && matchPeriod;
  });

  const pagination = usePagination(filtered, 25, [search, filterStatut, filterType, filterPeriod, customFrom, customTo]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowDialog(true); };
  const openEdit = (m: MaintenanceRow) => {
    setEditingId(m.id);
    setForm({
      camion_id: m.camion_id, type: m.type, description: m.description,
      pieces_changees: m.pieces_changees || "", cout_estime: m.cout_estime,
      cout_reel: m.cout_reel || 0,
      date_prevue: m.date_prevue, date_debut: m.date_debut || "", date_fin: m.date_fin || "",
      statut: m.statut, km_declenchement: m.km_declenchement || 0,
      urgence: "NORMALE",
    });
    setShowDialog(true);
  };

  const createDaForMaintenance = async (m: MaintenanceRow, urgence: string = "NORMALE") => {
    const c = getCamion(m.camion_id);
    const label = c ? `${c.immatriculation} — ${c.marque} ${c.modele}` : "véhicule";
    const { error } = await supabase.from("demandes_achat").insert({
      reference: "",
      maintenance_id: m.id,
      designation: `Maintenance — ${label}`,
      description: `${m.description}${m.pieces_changees ? `\n\nPièces : ${m.pieces_changees}` : ""}`,
      quantite: 1,
      montant_estime: m.cout_estime,
      urgence,
      statut: "SOUMISE",
    } as any);
    if (error) throw error;
  };

  const handleSave = async () => {
    if (!form.camion_id || !form.description) { toast.error("Remplissez les champs obligatoires"); return; }
    try {
      const { urgence, ...rest } = form;
      const payload: any = { ...rest };
      if (!payload.date_debut) payload.date_debut = null;
      if (!payload.date_fin) payload.date_fin = null;
      if (editingId) {
        await updateMaintenance(editingId, payload);
        toast.success("Maintenance mise à jour");
      } else {
        const created = await addMaintenance(payload);
        toast.success("Maintenance créée");
        try {
          await createDaForMaintenance(created as MaintenanceRow, urgence);
          toast.success("Demande d'achat générée automatiquement", { description: "Consultez le module Achats" });
        } catch (e: any) {
          toast.error("Maintenance créée mais erreur lors de la génération de la DA");
        }
      }
      setShowDialog(false);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMaintenance(id); toast.success("Maintenance supprimée"); setDeleteConfirm(null); }
    catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleSaveCout = async () => {
    if (!coutDialog) return;
    try {
      await updateMaintenance(coutDialog.id, { cout_reel: coutDialog.value });
      toast.success("Coût enregistré");
      setCoutDialog(null);
    } catch (e: any) { toast.error(e.message || "Erreur"); }
  };

  const handleCreateDA = async (m: MaintenanceRow) => {
    try {
      await createDaForMaintenance(m);
      toast.success("Demande d'achat créée");
      await refetch();
      // refresh DA map
      const { data } = await supabase.from("demandes_achat").select("id, maintenance_id, reference, statut, created_at, montant_estime").eq("maintenance_id", m.id).maybeSingle();
      if (data) setDaByMaintenance(prev => ({ ...prev, [m.id]: { id: data.id, reference: data.reference, statut: data.statut as StatutDemandeAchat, created_at: data.created_at, montant_estime: data.montant_estime } }));
    } catch (e: any) { toast.error(e.message || "Erreur"); }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* KPIs — 5 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Wrench className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{kpis.total}</p><p className="text-xs text-muted-foreground">Total maintenances</p></div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10"><Clock className="h-5 w-5 text-info" /></div>
            <div><p className="text-2xl font-bold text-foreground">{kpis.planifiee}</p><p className="text-xs text-muted-foreground">Planifiées</p></div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "#FCEBEB" }}>
              <AlertTriangle className="h-5 w-5" style={{ color: "#A32D2D" }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: kpis.enRetardCount > 0 ? "#A32D2D" : undefined }}>{kpis.enRetardCount}</p>
              <p className="text-xs text-muted-foreground">En retard</p>
              {kpis.enRetardCount > 0 && <p className="text-[10px]" style={{ color: "#A32D2D" }}>{kpis.maxRetard}j de retard max</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
            <div><p className="text-2xl font-bold text-foreground">{kpis.coutTotal.toLocaleString("fr-FR")} F</p><p className="text-xs text-muted-foreground">Coût total</p></div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Ratio préventive / curative</p>
            {kpis.totalMois > 0 ? (
              <>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div style={{ width: `${kpis.pctPrev}%`, backgroundColor: "#378ADD" }} />
                  <div style={{ width: `${kpis.pctAutre}%`, backgroundColor: "#EF9F27" }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">{kpis.pctPrev}% prév. · {kpis.pctAutre}% remplac.</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Aucune donnée ce mois</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterStatut} onValueChange={v => setFilterStatut(v as any)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  <SelectItem value="PLANIFIEE">Planifiée</SelectItem>
                  <SelectItem value="EN_COURS">En cours</SelectItem>
                  <SelectItem value="EN_RETARD">En retard</SelectItem>
                  <SelectItem value="TERMINEE">Terminée</SelectItem>
                  <SelectItem value="ANNULEE">Annulée</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={v => setFilterType(v as TypeFilter)}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tous types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous types</SelectItem>
                  <SelectItem value="PREVENTIVE">Préventive</SelectItem>
                  <SelectItem value="REMPLACEMENT">Remplacement</SelectItem>
                  <SelectItem value="CORRECTIVE">Curative</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="default" className={cn("gap-1.5", filterPeriod !== "ALL" && "border-primary text-primary")}>
                    <Filter className="h-4 w-4" />
                    {PERIOD_LABELS[filterPeriod]}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-3" align="end">
                  <p className="text-sm font-medium text-foreground">Filtrer par période</p>
                  <div className="flex flex-col gap-1">
                    {(["ALL", "WEEK", "30DAYS", "90DAYS", "CUSTOM"] as PeriodFilter[]).map(p => (
                      <Button key={p} variant={filterPeriod === p ? "default" : "ghost"} size="sm" className="justify-start" onClick={() => setFilterPeriod(p)}>
                        {PERIOD_LABELS[p]}
                      </Button>
                    ))}
                  </div>
                  {filterPeriod === "CUSTOM" && (
                    <div className="space-y-2 pt-1 border-t border-border">
                      <div className="space-y-1"><Label className="text-xs">Du</Label><Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Au</Label><Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} /></div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {canManage && <Button onClick={openAdd} className="shrink-0"><Plus className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Nouvelle maintenance</span><span className="sm:hidden">Ajouter</span></Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border shadow-none overflow-x-auto">
        <CardContent className="p-0">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Véhicule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date prévue</TableHead>
                <TableHead>Coût réel</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Demande d'achat</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginated.map(m => {
                const typeCfg = TYPE_MAINTENANCE_CONFIG[m.type];
                const enRetard = isEnRetard(m);
                const c = getCamion(m.camion_id);
                const da = daByMaintenance[m.id];
                const daBadge = da ? (DA_BADGE[da.statut] || DA_BADGE.SOUMISE) : null;
                const joursDevis = da && da.statut === "DEVIS_EN_COURS" ? differenceInDays(new Date(), new Date(da.created_at)) : null;
                const cout = m.cout_reel || 0;

                return (
                  <TableRow key={m.id} style={enRetard ? { backgroundColor: "#FFFBEB" } : undefined}>
                    {/* Véhicule */}
                    <TableCell className="text-sm">
                      <div className="font-medium text-foreground">{c?.immatriculation || "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{c ? `${c.marque} ${c.modele}` : ""}</div>
                      {enRetard && (
                        <div className="flex items-center gap-1 text-[10px] mt-0.5" style={{ color: "#A32D2D" }}>
                          <Clock className="h-3 w-3" />{joursRetard(m)}j de retard
                        </div>
                      )}
                    </TableCell>
                    {/* Type */}
                    <TableCell><Badge variant="outline" className={cn("border-0 text-xs font-medium", typeCfg.bgColor, typeCfg.color)}>{typeCfg.label}</Badge></TableCell>
                    {/* Description */}
                    <TableCell className="text-sm max-w-[260px]">
                      <div className="break-words whitespace-normal">{m.description}</div>
                      {m.pieces_changees && <div className="text-[10px] text-muted-foreground mt-0.5">{m.pieces_changees}</div>}
                    </TableCell>
                    {/* Date prévue */}
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(m.date_prevue), "dd/MM/yyyy")}</div>
                    </TableCell>
                    {/* Coût réel */}
                    <TableCell className="text-sm">
                      {cout > 0 ? (
                        <span className="font-medium" style={{ color: "#0F6E56" }}>{cout.toLocaleString("fr-FR")} F</span>
                      ) : m.statut === "TERMINEE" ? (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" style={{ color: "#A32D2D" }} />
                          <span className="text-xs" style={{ color: "#A32D2D" }}>0 F — à saisir</span>
                          {canManage && <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => setCoutDialog({ id: m.id, value: 0 })}>Saisir</Button>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">— en attente</span>
                      )}
                    </TableCell>
                    {/* Statut */}
                    <TableCell>
                      {enRetard ? (
                        <Badge variant="outline" className="border-0 text-xs font-medium" style={{ backgroundColor: "#FCEBEB", color: "#791F1F" }}>En retard</Badge>
                      ) : (() => {
                        const cfg = STATUT_MAINTENANCE_CONFIG[m.statut];
                        return <Badge variant="outline" className={cn("border-0 text-xs font-medium", cfg.bgColor, cfg.color)}>{cfg.label}</Badge>;
                      })()}
                    </TableCell>
                    {/* Demande d'achat */}
                    <TableCell>
                      {da && daBadge ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-mono">{da.reference}</span>
                          <Badge variant="outline" className="border-0 text-[10px] font-medium" style={{ backgroundColor: daBadge.bg, color: daBadge.text }}>
                            {daBadge.label}{joursDevis !== null && joursDevis > 0 ? ` · ${joursDevis}j` : ""}
                          </Badge>
                        </div>
                      ) : m.statut !== "TERMINEE" && canManage ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary hover:text-primary" onClick={() => handleCreateDA(m)}>
                          <Plus className="h-3 w-3 mr-1" />Créer DA
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-muted-foreground">Aucune maintenance trouvée</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            startIdx={pagination.startIdx}
            endIdx={pagination.endIdx}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="maintenances"
          />
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifier la maintenance" : "Nouvelle maintenance"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Véhicule *</Label>
              <Select value={form.camion_id} onValueChange={v => setForm(f => ({ ...f, camion_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un véhicule" /></SelectTrigger>
                <SelectContent>
                  {camions.map(c => <SelectItem key={c.id} value={c.id}>{c.immatriculation} — {c.marque} {c.modele}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as TypeMaintenance }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVE">Préventive</SelectItem>
                    <SelectItem value="CORRECTIVE">Curative</SelectItem>
                    <SelectItem value="REMPLACEMENT">Remplacement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v as StatutMaintenance }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANIFIEE">Planifiée</SelectItem>
                    <SelectItem value="EN_COURS">En cours</SelectItem>
                    <SelectItem value="TERMINEE">Terminée</SelectItem>
                    <SelectItem value="ANNULEE">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Détail de l'intervention..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Sous-détail / référence pièce</Label>
              <Input value={form.pieces_changees} onChange={e => setForm(f => ({ ...f, pieces_changees: e.target.value }))} placeholder="ex: Pièce ref. FA-4521" />
            </div>
            {!editingId && (
              <div className="space-y-2">
                <Label>Urgence</Label>
                <Select value={form.urgence} onValueChange={v => setForm(f => ({ ...f, urgence: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMALE">Normale</SelectItem>
                    <SelectItem value="HAUTE">Haute</SelectItem>
                    <SelectItem value="CRITIQUE">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Date prévue</Label><Input type="date" value={form.date_prevue} onChange={e => setForm(f => ({ ...f, date_prevue: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Date début</Label><Input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Date fin</Label><Input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Coût estimé (F)</Label><Input type="number" value={form.cout_estime} onChange={e => setForm(f => ({ ...f, cout_estime: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Coût réel (F)</Label><Input type="number" value={form.cout_reel} onChange={e => setForm(f => ({ ...f, cout_reel: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Km déclench.</Label><Input type="number" value={form.km_declenchement} onChange={e => setForm(f => ({ ...f, km_declenchement: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingId ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mini-modal saisie coût réel */}
      <Dialog open={!!coutDialog} onOpenChange={() => setCoutDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Saisir le coût réel</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Coût réel (FCFA)</Label>
            <Input type="number" autoFocus value={coutDialog?.value ?? 0} onChange={e => setCoutDialog(c => c && ({ ...c, value: Number(e.target.value) }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoutDialog(null)}>Annuler</Button>
            <Button onClick={handleSaveCout}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer cette maintenance ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
