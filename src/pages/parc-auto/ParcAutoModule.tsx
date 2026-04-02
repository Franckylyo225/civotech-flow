import { useState } from "react";
import {
  Truck, Plus, Search, Pencil, Trash2, CheckCircle2,
  Wrench, Navigation, Package, Calendar, Hash,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useParcAutoStore, STATUT_CAMION_CONFIG, type CamionRow, type StatutCamion } from "@/hooks/use-parc-auto-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMPTY_FORM = {
  immatriculation: "", marque: "", modele: "",
  capacite_tonnes: 0, annee: new Date().getFullYear(),
  statut: "DISPONIBLE" as StatutCamion,
};

export default function ParcAutoModule() {
  const { user } = useAuth();
  const { camions, loading, stats, addCamion, updateCamion, deleteCamion } = useParcAutoStore();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutCamion | "ALL">("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canManage = user?.role === "DG" || user?.role === "LOGISTIQUE";

  const filtered = camions.filter(c => {
    const matchSearch =
      c.immatriculation.toLowerCase().includes(search.toLowerCase()) ||
      c.marque.toLowerCase().includes(search.toLowerCase()) ||
      c.modele.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "ALL" || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (camion: CamionRow) => {
    setEditingId(camion.id);
    setForm({
      immatriculation: camion.immatriculation,
      marque: camion.marque,
      modele: camion.modele,
      capacite_tonnes: camion.capacite_tonnes,
      annee: camion.annee,
      statut: camion.statut,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.immatriculation || !form.marque || !form.modele) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }
    try {
      if (editingId) {
        await updateCamion(editingId, form);
        toast.success("Camion mis à jour");
      } else {
        await addCamion(form);
        toast.success("Camion ajouté au parc");
      }
      setShowDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCamion(id);
      toast.success("Camion supprimé");
      setDeleteConfirm(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh] text-muted-foreground">Chargement du parc...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parc Automobile</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion de la flotte de camions</p>
        </div>
        {canManage && (
          <Button onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Ajouter un camion
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total véhicules</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.disponible}</p>
              <p className="text-xs text-muted-foreground">Disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <Navigation className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.enMission}</p>
              <p className="text-xs text-muted-foreground">En mission</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Wrench className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.enMaintenance}</p>
              <p className="text-xs text-muted-foreground">En maintenance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par immatriculation, marque, modèle..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatut} onValueChange={v => setFilterStatut(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                <SelectItem value="EN_MISSION">En mission</SelectItem>
                <SelectItem value="EN_MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Immatriculation</TableHead>
                <TableHead>Marque / Modèle</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Année</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(camion => {
                const cfg = STATUT_CAMION_CONFIG[camion.statut];
                return (
                  <TableRow key={camion.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-foreground">{camion.immatriculation}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{camion.marque}</p>
                        <p className="text-xs text-muted-foreground">{camion.modele}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {camion.capacite_tonnes}T
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {camion.annee}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", cfg.bgColor, cfg.color)}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(camion)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(camion.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    Aucun véhicule trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le camion" : "Ajouter un camion"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Immatriculation *</Label>
                <Input value={form.immatriculation} onChange={e => setForm(f => ({ ...f, immatriculation: e.target.value }))} placeholder="AB-1234-CI" />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v as StatutCamion }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                    <SelectItem value="EN_MISSION">En mission</SelectItem>
                    <SelectItem value="EN_MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marque *</Label>
                <Input value={form.marque} onChange={e => setForm(f => ({ ...f, marque: e.target.value }))} placeholder="Renault" />
              </div>
              <div className="space-y-2">
                <Label>Modèle *</Label>
                <Input value={form.modele} onChange={e => setForm(f => ({ ...f, modele: e.target.value }))} placeholder="T480" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacité (tonnes)</Label>
                <Input type="number" value={form.capacite_tonnes} onChange={e => setForm(f => ({ ...f, capacite_tonnes: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Input type="number" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: Number(e.target.value) }))} />
              </div>
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
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
