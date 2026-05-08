import { useState, useMemo } from "react";
import {
  Plus, Search, Pencil, Trash2, Building2, Phone, Mail, ToggleLeft, ToggleRight,
  Eye, TrendingUp, ShoppingBag,
} from "lucide-react";
import {
  useFournisseursStore,
  CATEGORIE_FOURNISSEUR_CONFIG,
  type FournisseurRow,
  type CategorieFournisseur,
} from "@/hooks/use-fournisseurs-store";
import { useDemandesAchatStore } from "@/hooks/use-demandes-achat-store";
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
import { format } from "date-fns";
import FournisseurDetailDrawer from "./FournisseurDetailDrawer";

const fmt = (n: number) => `${(n || 0).toLocaleString("fr-FR")} FCFA`;

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
  const { demandes } = useDemandesAchatStore();
  const [search, setSearch] = useState("");
  const [filterCategorie, setFilterCategorie] = useState<CategorieFournisseur | "ALL">("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Index par fournisseur
  const fournisseurStats = useMemo(() => {
    const m = new Map<string, { nbCommandes: number; volumeTotal: number; derniereCommande: Date | null; enCours: number }>();
    demandes.forEach(d => {
      if (!d.fournisseur_id) return;
      const cur = m.get(d.fournisseur_id) || { nbCommandes: 0, volumeTotal: 0, derniereCommande: null, enCours: 0 };
      cur.nbCommandes += 1;
      const dt = new Date(d.created_at);
      if (!cur.derniereCommande || dt > cur.derniereCommande) cur.derniereCommande = dt;
      if (d.statut === "PAYEE") cur.volumeTotal += d.montant_reel || 0;
      else if (d.statut !== "REFUSEE_DG" && d.statut !== "CLOTUREE") cur.enCours += 1;
      m.set(d.fournisseur_id, cur);
    });
    return m;
  }, [demandes]);

  const kpis = useMemo(() => {
    const volumeTotal = demandes.filter(d => d.statut === "PAYEE").reduce((s, d) => s + (d.montant_reel || 0), 0);
    const commandesEnCours = demandes.filter(d => d.fournisseur_id && d.statut !== "PAYEE" && d.statut !== "REFUSEE_DG" && d.statut !== "CLOTUREE").length;
    return {
      total: fournisseurs.length,
      actifs: fournisseurs.filter(f => f.actif).length,
      inactifs: fournisseurs.filter(f => !f.actif).length,
      volumeTotal,
      commandesEnCours,
    };
  }, [fournisseurs, demandes]);

  const filtered = fournisseurs.filter(f => {
    const matchSearch =
      f.nom.toLowerCase().includes(search.toLowerCase()) ||
      (f.contact || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategorie === "ALL" || f.categorie === filterCategorie;
    return matchSearch && matchCat;
  });

  const pagination = usePagination(filtered, 25, [search, filterCategorie]);

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
      {/* KPIs — 5 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Kpi icon={Building2} value={kpis.total} label="Total" color="primary" />
        <Kpi icon={ToggleRight} value={kpis.actifs} label="Actifs" color="success" />
        <Kpi icon={ToggleLeft} value={kpis.inactifs} label="Inactifs" color="muted-foreground" />
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 shrink-0">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold truncate" style={{ color: "#0F6E56" }}>{fmt(kpis.volumeTotal)}</p>
              <p className="text-xs text-muted-foreground">Volume total</p>
            </div>
          </CardContent>
        </Card>
        <Kpi icon={ShoppingBag} value={kpis.commandesEnCours} label="Commandes en cours" color="warning" />
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
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Volume commandé</TableHead>
                <TableHead>Dernière commande</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginated.map(f => {
                const catCfg = CATEGORIE_FOURNISSEUR_CONFIG[f.categorie];
                const fs = fournisseurStats.get(f.id);
                const nb = fs?.nbCommandes || 0;
                const vol = fs?.volumeTotal || 0;
                return (
                  <TableRow key={f.id} className={cn(!f.actif && "opacity-60")}>
                    <TableCell>
                      <p className="font-medium text-foreground">{f.nom}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {nb > 0 ? `${nb} commande${nb > 1 ? "s" : ""}${vol > 0 ? ` · ${fmt(vol)}` : ""}` : "Aucune commande"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{f.contact || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {f.telephone ? <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{f.telephone}</span> : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", catCfg.bgColor, catCfg.color)}>{catCfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {vol > 0 ? <span className="font-semibold text-success">{fmt(vol)}</span> : <span className="text-muted-foreground">0 FCFA</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {fs?.derniereCommande ? format(fs.derniereCommande, "dd/MM/yyyy") : <span className="text-muted-foreground">Jamais</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", f.actif ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                        {f.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailId(f.id)} title="Détail">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActif(f)} title={f.actif ? "Désactiver" : "Activer"}>
                              {f.actif ? <ToggleRight className="h-3.5 w-3.5 text-success" /> : <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucun fournisseur trouvé</TableCell></TableRow>
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

      {/* Detail drawer */}
      <FournisseurDetailDrawer
        fournisseur={fournisseurs.find(f => f.id === detailId) || null}
        demandes={demandes}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

function Kpi({ icon: Icon, value, label, color }: { icon: any; value: number | string; label: string; color: string }) {
  const isToken = ["primary", "success", "warning", "info", "destructive"].includes(color);
  const bg = isToken ? `bg-${color}/10` : "bg-muted";
  const fg = isToken ? `text-${color}` : `text-${color}`;
  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bg)}>
          <Icon className={cn("h-5 w-5", fg)} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
