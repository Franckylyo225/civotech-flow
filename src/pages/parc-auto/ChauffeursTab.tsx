import { useState } from "react";
import {
  Users, Plus, Search, Pencil, Trash2, AlertTriangle,
  Phone, CreditCard, Calendar, Truck,
} from "lucide-react";
import { useChauffeursStore, STATUT_CHAUFFEUR_CONFIG, type ChauffeurRow, type StatutChauffeur } from "@/hooks/use-chauffeurs-store";
import { useParcAutoStore } from "@/hooks/use-parc-auto-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

const EMPTY_FORM = {
  nom: "", prenom: "", telephone: "", numero_permis: "",
  type_permis: "", date_expiration_permis: "",
  experience_annees: 0, disponible: true,
  camion_assigne_id: "",
};

interface Props { canManage: boolean; }

export default function ChauffeursTab({ canManage }: Props) {
  const { chauffeurs, loading, stats, addChauffeur, updateChauffeur, deleteChauffeur } = useChauffeursStore();
  const { camions } = useParcAutoStore();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutChauffeur | "ALL">("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = chauffeurs.filter(c => {
    const matchSearch = `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
      (c.telephone || "").includes(search);
    const matchStatut = filterStatut === "ALL" || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowDialog(true); };
  const openEdit = (c: ChauffeurRow) => {
    setEditingId(c.id);
    setForm({
      nom: c.nom, prenom: c.prenom, telephone: c.telephone || "",
      numero_permis: c.numero_permis || "", type_permis: c.type_permis || "",
      date_expiration_permis: c.date_expiration_permis || "",
      experience_annees: c.experience_annees, disponible: c.disponible,
      camion_assigne_id: c.camion_assigne_id || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.nom || !form.prenom) { toast.error("Nom et prénom obligatoires"); return; }
    try {
      const payload: any = { ...form };
      if (!payload.camion_assigne_id) payload.camion_assigne_id = null;
      if (!payload.date_expiration_permis) payload.date_expiration_permis = null;
      if (editingId) {
        await updateChauffeur(editingId, payload);
        toast.success("Chauffeur mis à jour");
      } else {
        await addChauffeur(payload);
        toast.success("Chauffeur ajouté");
      }
      setShowDialog(false);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteChauffeur(id); toast.success("Chauffeur supprimé"); setDeleteConfirm(null); }
    catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const getPermisAlert = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { label: "Expiré", variant: "destructive" as const };
    if (days <= 30) return { label: `Expire dans ${days}j`, variant: "warning" as const };
    return null;
  };

  const getCamionLabel = (id: string | null) => {
    if (!id) return "—";
    const c = camions.find(c => c.id === id);
    return c ? c.immatriculation : "—";
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Users, value: stats.total, label: "Total chauffeurs", color: "primary" },
          { icon: Users, value: stats.disponible, label: "Disponibles", color: "success" },
          { icon: Truck, value: stats.enMission, label: "En mission", color: "info" },
          { icon: AlertTriangle, value: stats.permisExpirant, label: "Permis expirant", color: "warning" },
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

      {/* Filters */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatut} onValueChange={v => setFilterStatut(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                <SelectItem value="EN_MISSION">En mission</SelectItem>
                <SelectItem value="EN_REPOS">En repos</SelectItem>
                <SelectItem value="INDISPONIBLE">Indisponible</SelectItem>
              </SelectContent>
            </Select>
            {canManage && <Button onClick={openAdd}><Plus className="mr-1.5 h-4 w-4" />Ajouter</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Permis</TableHead>
                <TableHead>Expérience</TableHead>
                <TableHead>Véhicule assigné</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const cfg = STATUT_CHAUFFEUR_CONFIG[c.statut];
                const permisAlert = getPermisAlert(c.date_expiration_permis);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {c.prenom[0]}{c.nom[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.prenom} {c.nom}</p>
                          {c.type_permis && <p className="text-xs text-muted-foreground">Permis {c.type_permis}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.telephone ? (
                        <div className="flex items-center gap-1 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{c.telephone}</div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{c.numero_permis || "—"}</span>
                        {permisAlert && (
                          <Badge variant="outline" className={cn("border-0 text-xs", permisAlert.variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>
                            {permisAlert.label}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.experience_annees} ans</TableCell>
                    <TableCell className="text-sm font-medium">{getCamionLabel(c.camion_assigne_id)}</TableCell>
                    <TableCell><Badge variant="outline" className={cn("border-0 text-xs font-medium", cfg.bgColor, cfg.color)}>{cfg.label}</Badge></TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">Aucun chauffeur trouvé</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifier le chauffeur" : "Ajouter un chauffeur"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prénom *</Label><Input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Nom *</Label><Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Téléphone</Label><Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Expérience (années)</Label><Input type="number" value={form.experience_annees} onChange={e => setForm(f => ({ ...f, experience_annees: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>N° Permis</Label><Input value={form.numero_permis} onChange={e => setForm(f => ({ ...f, numero_permis: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Type permis</Label>
                <Select value={form.type_permis || "none"} onValueChange={v => setForm(f => ({ ...f, type_permis: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {["B", "C", "CE", "D", "DE"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Expiration permis</Label><Input type="date" value={form.date_expiration_permis} onChange={e => setForm(f => ({ ...f, date_expiration_permis: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Véhicule assigné</Label>
              <Select value={form.camion_assigne_id || "none"} onValueChange={v => setForm(f => ({ ...f, camion_assigne_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {camions.filter(c => c.statut === "DISPONIBLE").map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.immatriculation} — {c.marque}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingId ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer ce chauffeur ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
