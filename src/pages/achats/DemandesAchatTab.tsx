import { useState, useMemo } from "react";
import {
  Plus, Search, ShoppingCart, Clock, CheckCircle2, AlertTriangle, AlertCircle,
  Eye, Pencil, Trash2, Send, Wrench, Store,
} from "lucide-react";
import {
  useDemandesAchatStore, STATUT_DA_CONFIG, URGENCE_OPTIONS,
  type DemandeAchatRow, type StatutDemandeAchat,
} from "@/hooks/use-demandes-achat-store";
import { useMaintenancesStore, TYPE_MAINTENANCE_CONFIG } from "@/hooks/use-maintenances-store";
import { useFournisseursStore, CATEGORIE_FOURNISSEUR_CONFIG } from "@/hooks/use-fournisseurs-store";
import { useParcAutoStore } from "@/hooks/use-parc-auto-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination, usePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import DemandeAchatDetailDialog from "./DemandeAchatDetailDialog";

const fmt = (n: number) => `${(n || 0).toLocaleString("fr-FR")} FCFA`;

const EMPTY_FORM = {
  maintenance_id: "" as string | null,
  fournisseur_id: "" as string | null,
  designation: "",
  description: "",
  quantite: 1,
  montant_estime: 0,
  urgence: "NORMALE",
};

interface Props {
  canManage: boolean;
  isDG: boolean;
}

export default function DemandesAchatTab({ canManage, isDG }: Props) {
  const { demandes, loading, stats, addDemande, updateDemande, deleteDemande } = useDemandesAchatStore();
  const { maintenances } = useMaintenancesStore();
  const { fournisseurs } = useFournisseursStore();
  const { camions } = useParcAutoStore();
  const getCamionImmat = (id: string) => camions.find(c => c.id === id)?.immatriculation || "—";
  const getFournisseur = (id: string | null) => id ? fournisseurs.find(f => f.id === id) || null : null;
  const getMaintenance = (id: string | null) => id ? maintenances.find(m => m.id === id) || null : null;

  const maintenanceIdsWithDA = new Set(demandes.filter(d => d.maintenance_id).map(d => d.maintenance_id));
  const pendingMaintenances = maintenances.filter(m => (m.statut === "PLANIFIEE" || m.statut === "EN_COURS") && !maintenanceIdsWithDA.has(m.id));

  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutDemandeAchat | "ALL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Mini-modal saisie montant réel
  const [closeModal, setCloseModal] = useState<{ id: string; montant: number; fournisseur_id: string } | null>(null);
  // Mini-modal association fournisseur seul
  const [assocModal, setAssocModal] = useState<{ id: string; fournisseur_id: string } | null>(null);

  const filtered = demandes.filter(d => {
    const matchSearch = d.reference.toLowerCase().includes(search.toLowerCase()) ||
      d.designation.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "ALL" || d.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const pagination = usePagination(filtered, 25, [search, filterStatut]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (d: DemandeAchatRow) => {
    setEditingId(d.id);
    setForm({
      maintenance_id: d.maintenance_id || "",
      fournisseur_id: d.fournisseur_id || "",
      designation: d.designation,
      description: d.description,
      quantite: d.quantite,
      montant_estime: d.montant_estime,
      urgence: d.urgence,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.designation.trim()) { toast.error("La désignation est obligatoire"); return; }
    try {
      const payload: any = { ...form };
      if (!payload.maintenance_id) payload.maintenance_id = null;
      if (!payload.fournisseur_id) payload.fournisseur_id = null;
      if (editingId) {
        await updateDemande(editingId, payload);
        toast.success("Demande mise à jour");
      } else {
        await addDemande(payload);
        toast.success("Demande créée");
      }
      setShowForm(false);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDemande(id); toast.success("Demande supprimée"); setDeleteConfirm(null); }
    catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleSoumettre = async (d: DemandeAchatRow) => {
    try {
      await updateDemande(d.id, { statut: "SOUMISE" as any });
      toast.success("Demande soumise");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleSaveCloseAmount = async () => {
    if (!closeModal) return;
    if (closeModal.montant <= 0) { toast.error("Montant réel invalide"); return; }
    try {
      await updateDemande(closeModal.id, {
        montant_reel: closeModal.montant,
        fournisseur_id: closeModal.fournisseur_id || null,
      } as any);
      toast.success("Montant réel enregistré");
      setCloseModal(null);
    } catch (e: any) { toast.error(e.message || "Erreur"); }
  };

  const handleAssocFournisseur = async () => {
    if (!assocModal?.fournisseur_id) { toast.error("Sélectionnez un fournisseur"); return; }
    try {
      await updateDemande(assocModal.id, { fournisseur_id: assocModal.fournisseur_id } as any);
      toast.success("Fournisseur associé");
      setAssocModal(null);
    } catch (e: any) { toast.error(e.message || "Erreur"); }
  };

  const urgenceColor = (u: string) => {
    switch (u) {
      case "CRITIQUE": return "text-destructive bg-destructive/10";
      case "HAUTE": return "text-warning bg-warning/10";
      case "NORMALE": return "text-info bg-info/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const isLate = (d: DemandeAchatRow) => {
    if (d.statut === "PAYEE" || d.statut === "CLOTUREE" || d.statut === "REFUSEE_DG") return false;
    return differenceInDays(new Date(), new Date(d.created_at)) > 30;
  };

  const daysSinceUpdate = (d: DemandeAchatRow) => differenceInDays(new Date(), new Date(d.updated_at));

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* KPIs — 5 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard icon={ShoppingCart} value={stats.total} label="Total" color="primary" />
        <KpiCard icon={Clock} value={stats.enCours} label="En cours" color="info" />
        <KpiCard icon={AlertTriangle} value={stats.attenteValidation} label="Attente DG" color="warning" />
        <KpiCard icon={CheckCircle2} value={stats.payees} label="Payées" valueStyle={{ color: "#0F6E56" }} color="success" />
        <Card className="border border-border shadow-none col-span-2 lg:col-span-1">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 shrink-0">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold text-foreground truncate" style={{ color: "#0F6E56" }}>{fmt(stats.montantPaye)}</p>
              <p className="text-xs text-muted-foreground">Montant total engagé</p>
              {stats.montantEnCours > 0 && (
                <p className="text-[10px] mt-0.5" style={{ color: "#BA7517" }}>+ {fmt(stats.montantEnCours)} en cours</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerte maintenances en attente de DA */}
      {pendingMaintenances.length > 0 && (
        <Card className="border border-warning/40 bg-warning/5 shadow-none">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-warning" />
              <span className="font-semibold text-sm text-foreground">
                {pendingMaintenances.length} maintenance{pendingMaintenances.length > 1 ? "s" : ""} en attente de demande d'achat
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingMaintenances.map(m => (
                <Button
                  key={m.id}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-warning/30 text-sm"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      maintenance_id: m.id,
                      fournisseur_id: "",
                      designation: `Pièces maintenance — ${m.description.slice(0, 50)}`,
                      description: `Maintenance ${TYPE_MAINTENANCE_CONFIG[m.type].label} pour ${getCamionImmat(m.camion_id)}.${m.pieces_changees ? ` Pièces : ${m.pieces_changees}` : ""}`,
                      quantite: 1,
                      montant_estime: m.cout_estime,
                      urgence: "HAUTE",
                    });
                    setShowForm(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                  {getCamionImmat(m.camion_id)} — {TYPE_MAINTENANCE_CONFIG[m.type].label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterStatut} onValueChange={v => setFilterStatut(v as any)}>
                <SelectTrigger className="flex-1 sm:w-[180px]"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  {Object.entries(STATUT_DA_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManage && <Button onClick={openAdd} className="shrink-0"><Plus className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Nouvelle demande</span><span className="sm:hidden">Ajouter</span></Button>}
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
                <TableHead>Référence</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Urgence</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginated.map(d => {
                const statutCfg = STATUT_DA_CONFIG[d.statut];
                const fourn = getFournisseur(d.fournisseur_id);
                const maint = getMaintenance(d.maintenance_id);
                const late = isLate(d);
                const needsCloseAmount = d.statut === "PAYEE" && (!d.montant_reel || d.montant_reel === 0);
                const stale = d.statut === "DEVIS_EN_COURS" && daysSinceUpdate(d) > 7;
                return (
                  <TableRow key={d.id} style={late ? { backgroundColor: "#FFFBEB" } : undefined}>
                    <TableCell className="font-mono text-sm font-medium">{d.reference}</TableCell>
                    <TableCell className="text-sm max-w-[220px]">
                      <p className="font-medium text-foreground truncate">{d.designation}</p>
                      {maint && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          Lié à maintenance {getCamionImmat(maint.camion_id)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {fourn ? (
                        <div>
                          <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{fourn.nom}</p>
                          <p className="text-[10px] text-muted-foreground">{CATEGORIE_FOURNISSEUR_CONFIG[fourn.categorie]?.label}</p>
                        </div>
                      ) : d.statut === "PAYEE" ? (
                        <span className="text-xs text-muted-foreground">— non renseigné</span>
                      ) : canManage ? (
                        <button
                          onClick={() => setAssocModal({ id: d.id, fournisseur_id: "" })}
                          className="flex items-center gap-1 text-xs hover:underline"
                          style={{ color: "#BA7517" }}
                        >
                          <Store className="h-3 w-3" />— Associer
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", urgenceColor(d.urgence))}>
                        {URGENCE_OPTIONS.find(u => u.value === d.urgence)?.label || d.urgence}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {needsCloseAmount ? (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />non saisi
                          </span>
                          {canManage && (
                            <Button size="sm" className="h-6 px-2 text-[10px]"
                              onClick={() => setCloseModal({ id: d.id, montant: d.montant_estime || 0, fournisseur_id: d.fournisseur_id || "" })}>
                              Saisir
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div>
                          {d.montant_reel ? (
                            <p className="text-xs font-semibold text-success">{fmt(d.montant_reel)}</p>
                          ) : null}
                          {d.montant_estime > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              {d.montant_reel ? "estimé" : ""} {!d.montant_reel ? fmt(d.montant_estime) : `: ${fmt(d.montant_estime)}`}
                            </p>
                          )}
                          {!d.montant_reel && !d.montant_estime && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline" className={cn("border-0 text-xs font-medium w-fit", statutCfg.bgColor, statutCfg.color)}>
                          {statutCfg.label}
                        </Badge>
                        {stale && (
                          <span className="text-[10px]" style={{ color: "#BA7517" }}>· {daysSinceUpdate(d)}j</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailId(d.id)} title="Détail">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier"
                            onClick={() => {
                              if (needsCloseAmount) setCloseModal({ id: d.id, montant: d.montant_estime || 0, fournisseur_id: d.fournisseur_id || "" });
                              else if (d.statut === "DEVIS_EN_COURS" && !d.fournisseur_id) setAssocModal({ id: d.id, fournisseur_id: "" });
                              else openEdit(d);
                            }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canManage && !d.fournisseur_id && d.statut !== "PAYEE" && d.statut !== "REFUSEE_DG" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Associer un fournisseur"
                            onClick={() => setAssocModal({ id: d.id, fournisseur_id: "" })}>
                            <Store className="h-3.5 w-3.5" style={{ color: "#BA7517" }} />
                          </Button>
                        )}
                        {canManage && d.statut === "BROUILLON" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSoumettre(d)} title="Soumettre">
                              <Send className="h-3.5 w-3.5 text-info" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(d.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune demande d'achat</TableCell></TableRow>
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
            itemLabel="demandes"
          />
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifier la demande" : "Nouvelle demande d'achat"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Désignation *</Label>
              <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Ex: Plaquettes de frein pour camion A" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Détails des pièces ou services..." rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantité</Label>
                <Input type="number" min={1} value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Montant estimé (F)</Label>
                <Input type="number" value={form.montant_estime} onChange={e => setForm(f => ({ ...f, montant_estime: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Urgence</Label>
                <Select value={form.urgence} onValueChange={v => setForm(f => ({ ...f, urgence: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCE_OPTIONS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fournisseur (optionnel)</Label>
              <Select value={form.fournisseur_id || "NONE"} onValueChange={v => setForm(f => ({ ...f, fournisseur_id: v === "NONE" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Aucun</SelectItem>
                  {fournisseurs.filter(f => f.actif).map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nom} — {CATEGORIE_FOURNISSEUR_CONFIG[f.categorie]?.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Maintenance liée (optionnel)</Label>
              <Select value={form.maintenance_id || "NONE"} onValueChange={v => setForm(f => ({ ...f, maintenance_id: v === "NONE" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Aucune</SelectItem>
                  {maintenances.filter(m => m.statut !== "TERMINEE" && m.statut !== "ANNULEE" && !demandes.some(d => d.maintenance_id === m.id && d.id !== editingId)).map(m => (
                    <SelectItem key={m.id} value={m.id}>{getCamionImmat(m.camion_id)} — {m.description.slice(0, 40)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingId ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mini-modal — saisie montant réel */}
      <Dialog open={!!closeModal} onOpenChange={() => setCloseModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Saisir le montant réel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Montant réel payé (FCFA) *</Label>
              <Input type="number" min={0} value={closeModal?.montant || 0}
                onChange={e => setCloseModal(s => s ? { ...s, montant: Number(e.target.value) } : s)} />
            </div>
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Select value={closeModal?.fournisseur_id || "NONE"}
                onValueChange={v => setCloseModal(s => s ? { ...s, fournisseur_id: v === "NONE" ? "" : v } : s)}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— Aucun —</SelectItem>
                  {fournisseurs.filter(f => f.actif).map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseModal(null)}>Annuler</Button>
            <Button onClick={handleSaveCloseAmount}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mini-modal — association fournisseur */}
      <Dialog open={!!assocModal} onOpenChange={() => setAssocModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Associer un fournisseur</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Fournisseur *</Label>
            <Select value={assocModal?.fournisseur_id || ""}
              onValueChange={v => setAssocModal(s => s ? { ...s, fournisseur_id: v } : s)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {fournisseurs.filter(f => f.actif).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nom} — {CATEGORIE_FOURNISSEUR_CONFIG[f.categorie]?.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssocModal(null)}>Annuler</Button>
            <Button onClick={handleAssocFournisseur}>Associer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Supprimer cette demande d'achat ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      {detailId && (
        <DemandeAchatDetailDialog
          demande={demandes.find(d => d.id === detailId)!}
          open={!!detailId}
          onClose={() => setDetailId(null)}
          canManage={canManage}
          isDG={isDG}
          onUpdate={updateDemande}
        />
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, value, label, color, valueStyle }: { icon: any; value: number | string; label: string; color: string; valueStyle?: React.CSSProperties }) {
  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", `bg-${color}/10`)}>
          <Icon className={cn("h-5 w-5", `text-${color}`)} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground" style={valueStyle}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
