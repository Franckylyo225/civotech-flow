import { useState } from "react";
import {
  Truck, Plus, Search, Pencil, Trash2, CheckCircle2,
  Wrench, Navigation, Package, Calendar, Hash, Gauge,
} from "lucide-react";
import { useParcAutoStore, STATUT_CAMION_CONFIG, type CamionRow, type StatutCamion } from "@/hooks/use-parc-auto-store";
import { useMaintenancesStore } from "@/hooks/use-maintenances-store";
import VehiculeDetailDialog from "./VehiculeDetailDialog";
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

const EMPTY_FORM = {
  immatriculation: "", marque: "", modele: "", type_vehicule: "Porteur",
  capacite_tonnes: 0, annee: new Date().getFullYear(), km_actuel: 0,
};

interface Props { canManage: boolean; }

export default function VehiculesTab({ canManage }: Props) {
  const { camions, loading, stats, addCamion, updateCamion, deleteCamion } = useParcAutoStore();
  const { addMaintenance } = useMaintenancesStore();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutCamion | "ALL">("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailCamion, setDetailCamion] = useState<CamionRow | null>(null);
  const [maintCamion, setMaintCamion] = useState<CamionRow | null>(null);
  const [maintForm, setMaintForm] = useState({
    type: "CORRECTIVE" as "PREVENTIVE" | "CORRECTIVE" | "REMPLACEMENT",
    description: "",
    pieces_changees: "",
    date_prevue: new Date().toISOString().slice(0, 10),
    cout_estime: 0,
  });

  const filtered = camions.filter(c => {
    const matchSearch =
      c.immatriculation.toLowerCase().includes(search.toLowerCase()) ||
      c.marque.toLowerCase().includes(search.toLowerCase()) ||
      c.modele.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "ALL" || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const pagination = usePagination(filtered, 25, [search, filterStatut]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowDialog(true); };
  const openEdit = (c: CamionRow) => {
    setEditingId(c.id);
    setForm({
      immatriculation: c.immatriculation, marque: c.marque, modele: c.modele,
      type_vehicule: (c as any).type_vehicule || "Porteur",
      capacite_tonnes: c.capacite_tonnes, annee: c.annee,
      km_actuel: (c as any).km_actuel || 0,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.immatriculation || !form.marque || !form.modele) {
      toast.error("Remplissez tous les champs obligatoires"); return;
    }
    try {
      if (editingId) {
        await updateCamion(editingId, form);
        toast.success("Véhicule mis à jour");
      } else {
        await addCamion(form);
        toast.success("Véhicule ajouté au parc");
      }
      setShowDialog(false);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteCamion(id); toast.success("Véhicule supprimé"); setDeleteConfirm(null); }
    catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const openMaintDialog = (camion: CamionRow) => {
    setMaintCamion(camion);
    setMaintForm({ type: "CORRECTIVE", description: "", pieces_changees: "", date_prevue: new Date().toISOString().slice(0, 10), cout_estime: 0 });
  };

  const handleSendToMaint = async () => {
    if (!maintCamion || !maintForm.description) { toast.error("Veuillez renseigner la description"); return; }
    try {
      await addMaintenance({
        camion_id: maintCamion.id,
        type: maintForm.type,
        description: maintForm.description,
        date_prevue: maintForm.date_prevue,
        cout_estime: maintForm.cout_estime,
        cout_reel: null,
        pieces_changees: maintForm.pieces_changees || null,
        date_debut: null,
        date_fin: null,
        statut: "PLANIFIEE",
        km_declenchement: (maintCamion as any).km_actuel || null,
      });
      toast.success(`${maintCamion.immatriculation} envoyé en maintenance`);
      setMaintCamion(null);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Truck, value: stats.total, label: "Total véhicules", color: "primary" },
          { icon: CheckCircle2, value: stats.disponible, label: "Disponibles", color: "success" },
          { icon: Navigation, value: stats.enMission, label: "En mission", color: "info" },
          { icon: Wrench, value: stats.enMaintenance, label: "En maintenance", color: "warning" },
        ].map((s, i) => (
          <Card key={i} className="border border-border shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${s.color}/10`}>
                <s.icon className={`h-5 w-5 text-${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Add */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterStatut} onValueChange={v => setFilterStatut(v as any)}>
                <SelectTrigger className="flex-1 sm:w-[160px]"><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                  <SelectItem value="EN_MISSION">En mission</SelectItem>
                  <SelectItem value="EN_MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              {canManage && <Button onClick={openAdd} className="shrink-0"><Plus className="mr-1.5 h-4 w-4" />Ajouter</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border shadow-none overflow-x-auto">
        <CardContent className="p-0">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Immatriculation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Marque / Modèle</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Km</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginated.map(camion => {
                const cfg = STATUT_CAMION_CONFIG[camion.statut];
                return (
                  <TableRow key={camion.id} className="cursor-pointer" onClick={() => setDetailCamion(camion)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-foreground">{camion.immatriculation}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(camion as any).type_vehicule || "—"}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{camion.marque}</p>
                      <p className="text-xs text-muted-foreground">{camion.modele}</p>
                    </TableCell>
                    <TableCell><div className="flex items-center gap-1 text-sm"><Package className="h-3.5 w-3.5 text-muted-foreground" />{camion.capacite_tonnes}T</div></TableCell>
                    <TableCell><div className="flex items-center gap-1 text-sm text-muted-foreground"><Gauge className="h-3.5 w-3.5" />{((camion as any).km_actuel || 0).toLocaleString()} km</div></TableCell>
                    <TableCell><Badge variant="outline" className={cn("border-0 text-xs font-medium", cfg.bgColor, cfg.color)}>{cfg.label}</Badge></TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {camion.statut !== "EN_MAINTENANCE" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-warning hover:text-warning" title="Envoyer en maintenance" onClick={(e) => { e.stopPropagation(); openMaintDialog(camion); }}>
                              <Wrench className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(camion); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(camion.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">Aucun véhicule trouvé</TableCell></TableRow>
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
            itemLabel="véhicules"
          />
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Modifier le véhicule" : "Ajouter un véhicule"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Immatriculation *</Label>
                <Input value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value }))} placeholder="AB-1234-CI" />
              </div>
              <div className="space-y-2">
                <Label>Type de véhicule</Label>
                <Select value={form.type_vehicule} onValueChange={v => setForm(f => ({ ...f, type_vehicule: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Porteur", "Semi-remorque", "Fourgon", "Benne", "Citerne", "Plateau", "Autre"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Marque *</Label><Input value={form.marque} onChange={e => setForm(f => ({ ...f, marque: e.target.value }))} placeholder="Renault" /></div>
              <div className="space-y-2"><Label>Modèle *</Label><Input value={form.modele} onChange={e => setForm(f => ({ ...f, modele: e.target.value }))} placeholder="T480" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Capacité (T)</Label><Input type="number" value={form.capacite_tonnes} onChange={e => setForm(f => ({ ...f, capacite_tonnes: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Année</Label><Input type="number" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Km actuel</Label><Input type="number" value={form.km_actuel} onChange={e => setForm(f => ({ ...f, km_actuel: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingId ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VehiculeDetailDialog camion={detailCamion} open={!!detailCamion} onOpenChange={o => { if (!o) setDetailCamion(null); }} />

      {/* Send to maintenance dialog */}
      <Dialog open={!!maintCamion} onOpenChange={o => { if (!o) setMaintCamion(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-warning" />
              Envoyer en maintenance
            </DialogTitle>
          </DialogHeader>
          {maintCamion && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3 bg-muted/30">
                <p className="text-sm font-medium text-foreground">{maintCamion.immatriculation}</p>
                <p className="text-xs text-muted-foreground">{maintCamion.marque} {maintCamion.modele} · {((maintCamion as any).km_actuel || 0).toLocaleString()} km</p>
              </div>
              <div className="space-y-2">
                <Label>Type de maintenance</Label>
                <Select value={maintForm.type} onValueChange={v => setMaintForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVE">Préventive</SelectItem>
                    <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                    <SelectItem value="REMPLACEMENT">Remplacement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} placeholder="Décrivez l'intervention nécessaire..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Pièces à remplacer / corriger</Label>
                <Input value={maintForm.pieces_changees} onChange={e => setMaintForm(f => ({ ...f, pieces_changees: e.target.value }))} placeholder="Filtre à huile, plaquettes de frein..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date prévue</Label>
                  <Input type="date" value={maintForm.date_prevue} onChange={e => setMaintForm(f => ({ ...f, date_prevue: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Coût estimé (F)</Label>
                  <Input type="number" value={maintForm.cout_estime} onChange={e => setMaintForm(f => ({ ...f, cout_estime: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintCamion(null)}>Annuler</Button>
            <Button onClick={handleSendToMaint} className="gap-1.5">
              <Wrench className="h-4 w-4" />
              Envoyer en maintenance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
