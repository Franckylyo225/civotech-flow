import { useState, useEffect } from "react";
import {
  Wrench, Plus, Search, Pencil, Trash2, Clock,
  CheckCircle2, AlertTriangle, Ban, Calendar, ShoppingCart,
} from "lucide-react";
import { useMaintenancesStore, STATUT_MAINTENANCE_CONFIG, TYPE_MAINTENANCE_CONFIG, type MaintenanceRow, type TypeMaintenance, type StatutMaintenance } from "@/hooks/use-maintenances-store";
import { useParcAutoStore } from "@/hooks/use-parc-auto-store";
import { supabase } from "@/integrations/supabase/client";
import { STATUT_DA_CONFIG, type StatutDemandeAchat } from "@/hooks/use-demandes-achat-store";
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
import { fr } from "date-fns/locale";

const EMPTY_FORM = {
  camion_id: "", type: "PREVENTIVE" as TypeMaintenance,
  description: "", pieces_changees: "", cout_estime: 0, cout_reel: 0,
  date_prevue: new Date().toISOString().slice(0, 10),
  date_debut: "", date_fin: "",
  statut: "PLANIFIEE" as StatutMaintenance, km_declenchement: 0,
};

interface Props { canManage: boolean; }

export default function MaintenanceTab({ canManage }: Props) {
  const { maintenances, loading, stats, addMaintenance, updateMaintenance, deleteMaintenance } = useMaintenancesStore();
  const { camions } = useParcAutoStore();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutMaintenance | "ALL">("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [daByMaintenance, setDaByMaintenance] = useState<Record<string, { reference: string; statut: StatutDemandeAchat }>>({});

  // Fetch linked demandes_achat
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("demandes_achat")
        .select("maintenance_id, reference, statut")
        .not("maintenance_id", "is", null);
      const map: Record<string, { reference: string; statut: StatutDemandeAchat }> = {};
      (data || []).forEach((d: any) => { if (d.maintenance_id) map[d.maintenance_id] = { reference: d.reference, statut: d.statut }; });
      setDaByMaintenance(map);
    })();
  }, [maintenances]);

  const getCamionLabel = (id: string) => {
    const c = camions.find(c => c.id === id);
    return c ? `${c.immatriculation} — ${c.marque} ${c.modele}` : "—";
  };

  const filtered = maintenances.filter(m => {
    const matchSearch = m.description.toLowerCase().includes(search.toLowerCase()) ||
      getCamionLabel(m.camion_id).toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "ALL" || m.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowDialog(true); };
  const openEdit = (m: MaintenanceRow) => {
    setEditingId(m.id);
    setForm({
      camion_id: m.camion_id, type: m.type, description: m.description,
      pieces_changees: m.pieces_changees || "", cout_estime: m.cout_estime,
      cout_reel: m.cout_reel || 0,
      date_prevue: m.date_prevue, date_debut: m.date_debut || "", date_fin: m.date_fin || "",
      statut: m.statut, km_declenchement: m.km_declenchement || 0,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.camion_id || !form.description) { toast.error("Remplissez les champs obligatoires"); return; }
    try {
      const payload: any = { ...form };
      if (!payload.date_debut) payload.date_debut = null;
      if (!payload.date_fin) payload.date_fin = null;
      if (editingId) {
        await updateMaintenance(editingId, payload);
        toast.success("Maintenance mise à jour");
      } else {
        const created = await addMaintenance(payload);
        toast.success("Maintenance créée");
        // Auto-generate demande d'achat if pieces_changees is filled
        if (form.pieces_changees && form.pieces_changees.trim()) {
          const camionLabel = getCamionLabel(form.camion_id);
          const { error: daError } = await supabase.from("demandes_achat").insert({
            reference: "",
            maintenance_id: created.id,
            designation: `Pièces maintenance — ${camionLabel}`,
            description: `Pièces nécessaires : ${form.pieces_changees}\n\nMaintenance : ${form.description}`,
            quantite: 1,
            montant_estime: form.cout_estime,
            urgence: "NORMALE",
            statut: "SOUMISE",
          } as any);
          if (daError) {
            toast.error("Maintenance créée mais erreur lors de la génération de la demande d'achat");
          } else {
            toast.success("Demande d'achat générée automatiquement", { description: "Consultez le module Achats" });
          }
        }
      }
      setShowDialog(false);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMaintenance(id); toast.success("Maintenance supprimée"); setDeleteConfirm(null); }
    catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Wrench, value: stats.total, label: "Total", color: "primary" },
          { icon: Clock, value: stats.planifiee, label: "Planifiées", color: "info" },
          { icon: AlertTriangle, value: stats.enCours, label: "En cours", color: "warning" },
          { icon: CheckCircle2, value: `${stats.coutTotal.toLocaleString()} F`, label: "Coût total", color: "success" },
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
                <SelectItem value="PLANIFIEE">Planifiée</SelectItem>
                <SelectItem value="EN_COURS">En cours</SelectItem>
                <SelectItem value="TERMINEE">Terminée</SelectItem>
                <SelectItem value="ANNULEE">Annulée</SelectItem>
              </SelectContent>
            </Select>
            {canManage && <Button onClick={openAdd}><Plus className="mr-1.5 h-4 w-4" />Nouvelle maintenance</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Véhicule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date prévue</TableHead>
                <TableHead>Coût</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Demande d'achat</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => {
                const typeCfg = TYPE_MAINTENANCE_CONFIG[m.type];
                const statutCfg = STATUT_MAINTENANCE_CONFIG[m.statut];
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm font-medium">{getCamionLabel(m.camion_id)}</TableCell>
                    <TableCell><Badge variant="outline" className={cn("border-0 text-xs font-medium", typeCfg.bgColor, typeCfg.color)}>{typeCfg.label}</Badge></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{m.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(m.date_prevue), "dd/MM/yyyy")}</div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{(m.cout_reel || m.cout_estime).toLocaleString()} F</TableCell>
                    <TableCell><Badge variant="outline" className={cn("border-0 text-xs font-medium", statutCfg.bgColor, statutCfg.color)}>{statutCfg.label}</Badge></TableCell>
                    <TableCell>
                      {daByMaintenance[m.id] ? (() => {
                        const da = daByMaintenance[m.id];
                        const daCfg = STATUT_DA_CONFIG[da.statut];
                        return (
                          <div className="flex items-center gap-1.5">
                            <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-mono">{da.reference}</span>
                            <Badge variant="outline" className={cn("border-0 text-[10px] font-medium", daCfg.bgColor, daCfg.color)}>{daCfg.label}</Badge>
                          </div>
                        );
                      })() : <span className="text-xs text-muted-foreground">—</span>}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as TypeMaintenance }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVE">Préventive</SelectItem>
                    <SelectItem value="CORRECTIVE">Corrective</SelectItem>
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
              <Label>Pièces changées</Label>
              <Input value={form.pieces_changees} onChange={e => setForm(f => ({ ...f, pieces_changees: e.target.value }))} placeholder="Filtre à huile, plaquettes..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Date prévue</Label><Input type="date" value={form.date_prevue} onChange={e => setForm(f => ({ ...f, date_prevue: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Date début</Label><Input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Date fin</Label><Input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
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
