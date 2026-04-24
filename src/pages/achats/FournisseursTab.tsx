import { useState } from "react";
import {
  Plus, Search, Pencil, Trash2, Building2, Phone, Mail, MapPin, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  useFournisseursStore,
  CATEGORIE_FOURNISSEUR_CONFIG,
  type FournisseurRow,
  type CategorieFournisseur,
} from "@/hooks/use-fournisseurs-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination, usePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMPTY_FORM = {
  nom: "",
  contact: "",
  telephone: "",
  email: "",
  adresse: "",
  categorie: "AUTRE" as CategorieFournisseur,
  actif: true,
};

interface Props { canManage: boolean; }

export default function FournisseursTab({ canManage }: Props) {
  const { fournisseurs, loading, addFournisseur, updateFournisseur, deleteFournisseur } = useFournisseursStore();
  const [search, setSearch] = useState("");
  const [filterCategorie, setFilterCategorie] = useState<CategorieFournisseur | "ALL">("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = fournisseurs.filter(f => {
    const matchSearch =
      f.nom.toLowerCase().includes(search.toLowerCase()) ||
      (f.contact || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategorie === "ALL" || f.categorie === filterCategorie;
    return matchSearch && matchCat;
  });

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowDialog(true); };
  const openEdit = (f: FournisseurRow) => {
    setEditingId(f.id);
    setForm({
      nom: f.nom, contact: f.contact || "", telephone: f.telephone || "",
      email: f.email || "", adresse: f.adresse || "",
      categorie: f.categorie, actif: f.actif,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) { toast.error("Le nom est obligatoire"); return; }
    try {
      if (editingId) {
        await updateFournisseur(editingId, form);
        toast.success("Fournisseur mis à jour");
      } else {
        await addFournisseur(form);
        toast.success("Fournisseur créé");
      }
      setShowDialog(false);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteFournisseur(id); toast.success("Fournisseur supprimé"); setDeleteConfirm(null); }
    catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const toggleActif = async (f: FournisseurRow) => {
    try {
      await updateFournisseur(f.id, { actif: !f.actif });
      toast.success(f.actif ? "Fournisseur désactivé" : "Fournisseur réactivé");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { value: fournisseurs.length, label: "Total", icon: Building2 },
          { value: fournisseurs.filter(f => f.actif).length, label: "Actifs", icon: ToggleRight },
          { value: fournisseurs.filter(f => !f.actif).length, label: "Inactifs", icon: ToggleLeft },
        ].map((s, i) => (
          <Card key={i} className="border border-border shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un fournisseur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterCategorie} onValueChange={v => setFilterCategorie(v as any)}>
                <SelectTrigger className="flex-1 sm:w-[180px]"><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toutes catégories</SelectItem>
                  {Object.entries(CATEGORIE_FOURNISSEUR_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManage && <Button onClick={openAdd} className="shrink-0"><Plus className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Nouveau</span><span className="sm:hidden">+</span></Button>}
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
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginated.map(f => {
                const catCfg = CATEGORIE_FOURNISSEUR_CONFIG[f.categorie];
                return (
                  <TableRow key={f.id} className={cn(!f.actif && "opacity-50")}>
                    <TableCell className="font-medium">{f.nom}</TableCell>
                    <TableCell className="text-sm">{f.contact || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {f.telephone ? <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{f.telephone}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {f.email ? <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{f.email}</span> : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", catCfg.bgColor, catCfg.color)}>{catCfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", f.actif ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                        {f.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActif(f)} title={f.actif ? "Désactiver" : "Activer"}>
                            {f.actif ? <ToggleRight className="h-3.5 w-3.5 text-success" /> : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">Aucun fournisseur trouvé</TableCell></TableRow>
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
            itemLabel="fournisseurs"
          />
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nom / Raison sociale *</Label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Auto Pièces Dakar" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Nom du contact" />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={form.categorie} onValueChange={v => setForm(f => ({ ...f, categorie: v as CategorieFournisseur }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIE_FOURNISSEUR_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+221 77 123 45 67" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Adresse complète" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingId ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer ce fournisseur ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
