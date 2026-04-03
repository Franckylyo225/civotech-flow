import { useState } from "react";
import {
  Plus, Search, ShoppingCart, Clock, CheckCircle2, AlertTriangle,
  Eye, Pencil, Trash2, Send,
} from "lucide-react";
import {
  useDemandesAchatStore, STATUT_DA_CONFIG, URGENCE_OPTIONS,
  type DemandeAchatRow, type StatutDemandeAchat,
} from "@/hooks/use-demandes-achat-store";
import { useMaintenancesStore } from "@/hooks/use-maintenances-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import DemandeAchatDetailDialog from "./DemandeAchatDetailDialog";

const EMPTY_FORM = {
  maintenance_id: "" as string | null,
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
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutDemandeAchat | "ALL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = demandes.filter(d => {
    const matchSearch = d.reference.toLowerCase().includes(search.toLowerCase()) ||
      d.designation.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "ALL" || d.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (d: DemandeAchatRow) => {
    setEditingId(d.id);
    setForm({
      maintenance_id: d.maintenance_id || "",
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

  const urgenceColor = (u: string) => {
    switch (u) {
      case "CRITIQUE": return "text-destructive bg-destructive/10";
      case "HAUTE": return "text-warning bg-warning/10";
      case "NORMALE": return "text-info bg-info/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: ShoppingCart, value: stats.total, label: "Total", color: "primary" },
          { icon: Clock, value: stats.enCours, label: "En cours", color: "info" },
          { icon: AlertTriangle, value: stats.attenteValidation, label: "Attente DG", color: "warning" },
          { icon: CheckCircle2, value: `${stats.montantTotal.toLocaleString()} F`, label: "Montant estimé", color: "success" },
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

      {/* Filters */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher par référence ou désignation..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatut} onValueChange={v => setFilterStatut(v as any)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(STATUT_DA_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManage && <Button onClick={openAdd}><Plus className="mr-1.5 h-4 w-4" />Nouvelle demande</Button>}
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
                <TableHead>Désignation</TableHead>
                <TableHead>Urgence</TableHead>
                <TableHead>Montant estimé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => {
                const statutCfg = STATUT_DA_CONFIG[d.statut];
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm font-medium">{d.reference}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{d.designation}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", urgenceColor(d.urgence))}>
                        {URGENCE_OPTIONS.find(u => u.value === d.urgence)?.label || d.urgence}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{d.montant_estime.toLocaleString()} F</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", statutCfg.bgColor, statutCfg.color)}>
                        {statutCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailId(d.id)} title="Détail">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canManage && d.statut === "BROUILLON" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSoumettre(d)} title="Soumettre">
                              <Send className="h-3.5 w-3.5 text-info" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                              <Pencil className="h-3.5 w-3.5" />
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
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune demande d'achat</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifier la demande" : "Nouvelle demande d'achat"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Désignation *</Label>
              <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Ex: Plaquettes de frein pour camion A" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Détails des pièces ou services..." rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
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
              <Label>Maintenance liée (optionnel)</Label>
              <Select value={form.maintenance_id || "NONE"} onValueChange={v => setForm(f => ({ ...f, maintenance_id: v === "NONE" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Aucune</SelectItem>
                  {maintenances.filter(m => m.statut !== "TERMINEE" && m.statut !== "ANNULEE").map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.description.slice(0, 50)}</SelectItem>
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
