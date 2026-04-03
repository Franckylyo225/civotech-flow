import { useState } from "react";
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useGrilleTarifaireStore, UNITES, CATEGORIES } from "@/hooks/use-grille-tarifaire-store";
import type { Tarif, CreateTarifData } from "@/hooks/use-grille-tarifaire-store";
import { formatMontant } from "@/types/devis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const CATEGORIE_LABELS: Record<string, string> = {
  TRANSPORT: "Transport",
  MANUTENTION: "Manutention",
  STOCKAGE: "Stockage",
  DOUANE: "Douane",
  AUTRE: "Autre",
};

const UNITE_LABELS: Record<string, string> = {
  FORFAIT: "Forfait",
  TONNE: "Par tonne",
  KM: "Par km",
  VOYAGE: "Par voyage",
  JOUR: "Par jour",
  HEURE: "Par heure",
  COLIS: "Par colis",
};

export default function GrilleTarifairePage() {
  const { user } = useAuth();
  const { tarifs, loading, addTarif, updateTarif, deleteTarif } = useGrilleTarifaireStore();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTarif, setEditingTarif] = useState<Tarif | null>(null);
  const [form, setForm] = useState<CreateTarifData>({ designation: "", unite: "FORFAIT", prixUnitaire: 0, categorie: "TRANSPORT" });

  const canManage = user?.role === "COMMERCIAL" || user?.role === "DG";

  const filtered = tarifs.filter((t) => {
    const matchSearch = t.designation.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "ALL" || t.categorie === catFilter;
    return matchSearch && matchCat;
  });

  const openCreate = () => {
    setEditingTarif(null);
    setForm({ designation: "", unite: "FORFAIT", prixUnitaire: 0, categorie: "TRANSPORT" });
    setShowDialog(true);
  };

  const openEdit = (tarif: Tarif) => {
    setEditingTarif(tarif);
    setForm({ designation: tarif.designation, unite: tarif.unite, prixUnitaire: tarif.prixUnitaire, categorie: tarif.categorie });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.designation.trim()) return;
    if (editingTarif) {
      await updateTarif(editingTarif.id, form);
    } else {
      await addTarif(form);
    }
    setShowDialog(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Grille Tarifaire</h2>
          <p className="text-muted-foreground">{tarifs.length} tarif(s) enregistré(s)</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau tarif
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher une prestation..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes catégories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{CATEGORIE_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead>Statut</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tarif) => (
              <TableRow key={tarif.id} className={cn(!tarif.actif && "opacity-50")}>
                <TableCell className="font-medium">{tarif.designation}</TableCell>
                <TableCell>
                  <Badge variant="outline">{CATEGORIE_LABELS[tarif.categorie] || tarif.categorie}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{UNITE_LABELS[tarif.unite] || tarif.unite}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{formatMontant(tarif.prixUnitaire)}</TableCell>
                <TableCell>
                  <Badge variant={tarif.actif ? "default" : "secondary"}>
                    {tarif.actif ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateTarif(tarif.id, { actif: !tarif.actif })}>
                        {tarif.actif ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tarif)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTarif(tarif.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Aucun tarif trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTarif ? "Modifier le tarif" : "Nouveau tarif"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Désignation</Label>
              <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Ex: Transport Douala-Yaoundé" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Catégorie</Label>
                <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORIE_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unité</Label>
                <Select value={form.unite} onValueChange={(v) => setForm({ ...form, unite: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITES.map((u) => (
                      <SelectItem key={u} value={u}>{UNITE_LABELS[u]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Prix unitaire (FCFA)</Label>
              <Input type="number" min={0} value={form.prixUnitaire} onChange={(e) => setForm({ ...form, prixUnitaire: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!form.designation.trim()}>
              {editingTarif ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
