import { useState } from "react";
import { Wrench, Plus, Eye, Truck, AlertTriangle } from "lucide-react";
import { useMaintenancesStore, TYPE_MAINTENANCE_CONFIG, STATUT_MAINTENANCE_CONFIG } from "@/hooks/use-maintenances-store";
import { useDemandesAchatStore, URGENCE_OPTIONS } from "@/hooks/use-demandes-achat-store";
import { useParcAutoStore } from "@/hooks/use-parc-auto-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination, usePagination } from "@/components/ui/data-table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  canManage: boolean;
}

export default function MaintenancesAchatTab({ canManage }: Props) {
  const { maintenances, loading } = useMaintenancesStore();
  const { demandes, addDemande } = useDemandesAchatStore();
  const { camions } = useParcAutoStore();

  const [createFor, setCreateFor] = useState<string | null>(null);
  const [form, setForm] = useState({ designation: "", description: "", quantite: 1, montant_estime: 0, urgence: "NORMALE" });
  const [saving, setSaving] = useState(false);

  const getCamionImmat = (id: string) => camions.find(c => c.id === id)?.immatriculation || "—";

  // Maintenances actives (PLANIFIEE ou EN_COURS)
  const activeMaintenances = maintenances.filter(m => m.statut === "PLANIFIEE" || m.statut === "EN_COURS");

  // Check which maintenances already have a linked demande_achat
  const maintenanceIdsWithDA = new Set(demandes.filter(d => d.maintenance_id).map(d => d.maintenance_id));

  const pendingMaintenances = activeMaintenances.filter(m => !maintenanceIdsWithDA.has(m.id));
  const linkedMaintenances = activeMaintenances.filter(m => maintenanceIdsWithDA.has(m.id));

  const pendingPagination = usePagination(pendingMaintenances, 10, [pendingMaintenances.length]);
  const linkedPagination = usePagination(linkedMaintenances, 10, [linkedMaintenances.length]);

  const openCreateDA = (m: typeof maintenances[0]) => {
    setCreateFor(m.id);
    setForm({
      designation: `Pièces maintenance — ${m.description.slice(0, 60)}`,
      description: `Maintenance ${TYPE_MAINTENANCE_CONFIG[m.type].label} pour véhicule ${getCamionImmat(m.camion_id)}.\n${m.pieces_changees ? `Pièces : ${m.pieces_changees}` : ""}`.trim(),
      quantite: 1,
      montant_estime: m.cout_estime,
      urgence: "HAUTE",
    });
  };

  const handleCreate = async () => {
    if (!form.designation.trim()) { toast.error("La désignation est obligatoire"); return; }
    setSaving(true);
    try {
      await addDemande({
        maintenance_id: createFor,
        designation: form.designation,
        description: form.description,
        quantite: form.quantite,
        montant_estime: form.montant_estime,
        urgence: form.urgence,
        statut: "SOUMISE" as any,
      });
      toast.success("Demande d'achat créée et soumise", { description: "Vous pouvez maintenant ajouter les devis fournisseurs." });
      setCreateFor(null);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
    finally { setSaving(false); }
  };

  const getDAForMaintenance = (mId: string) => demandes.find(d => d.maintenance_id === mId);

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingMaintenances.length}</p>
              <p className="text-xs text-muted-foreground">En attente de DA</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <Wrench className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{linkedMaintenances.length}</p>
              <p className="text-xs text-muted-foreground">DA en cours</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeMaintenances.length}</p>
              <p className="text-xs text-muted-foreground">Maintenances actives</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending maintenances */}
      {pendingMaintenances.length > 0 && (
        <Card className="border border-warning/30 shadow-none">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="font-semibold text-sm text-foreground">Maintenances en attente — Créer une demande d'achat</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Coût estimé</TableHead>
                  <TableHead>Date prévue</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPagination.paginated.map(m => {
                  const typeCfg = TYPE_MAINTENANCE_CONFIG[m.type];
                  const statutCfg = STATUT_MAINTENANCE_CONFIG[m.statut];
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-sm font-medium">{getCamionImmat(m.camion_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border-0 text-xs", typeCfg.bgColor, typeCfg.color)}>{typeCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{m.description}</TableCell>
                      <TableCell className="text-sm font-medium">{m.cout_estime.toLocaleString()} F</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(m.date_prevue), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border-0 text-xs", statutCfg.bgColor, statutCfg.color)}>{statutCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && (
                          <Button size="sm" onClick={() => openCreateDA(m)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Créer DA
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataTablePagination
              page={pendingPagination.page}
              pageSize={pendingPagination.pageSize}
              total={pendingPagination.total}
              totalPages={pendingPagination.totalPages}
              startIdx={pendingPagination.startIdx}
              endIdx={pendingPagination.endIdx}
              onPageChange={pendingPagination.setPage}
              onPageSizeChange={pendingPagination.setPageSize}
              itemLabel="maintenances"
            />
          </CardContent>
        </Card>
      )}

      {/* Linked maintenances */}
      {linkedMaintenances.length > 0 && (
        <Card className="border border-border shadow-none">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">Maintenances avec demande d'achat en cours</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Réf. DA</TableHead>
                  <TableHead>Statut DA</TableHead>
                  <TableHead>Coût estimé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedPagination.paginated.map(m => {
                  const typeCfg = TYPE_MAINTENANCE_CONFIG[m.type];
                  const da = getDAForMaintenance(m.id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-sm font-medium">{getCamionImmat(m.camion_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border-0 text-xs", typeCfg.bgColor, typeCfg.color)}>{typeCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{m.description}</TableCell>
                      <TableCell className="font-mono text-sm">{da?.reference || "—"}</TableCell>
                      <TableCell>
                        {da && (
                          <Badge variant="outline" className="border-0 text-xs">
                            {da.statut}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{m.cout_estime.toLocaleString()} F</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataTablePagination
              page={linkedPagination.page}
              pageSize={linkedPagination.pageSize}
              total={linkedPagination.total}
              totalPages={linkedPagination.totalPages}
              startIdx={linkedPagination.startIdx}
              endIdx={linkedPagination.endIdx}
              onPageChange={linkedPagination.setPage}
              onPageSizeChange={linkedPagination.setPageSize}
              itemLabel="maintenances"
            />
          </CardContent>
        </Card>
      )}

      {activeMaintenances.length === 0 && (
        <Card className="border border-border shadow-none">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Aucune maintenance active nécessitant une intervention achats.
          </CardContent>
        </Card>
      )}

      {/* Create DA dialog */}
      <Dialog open={!!createFor} onOpenChange={() => setCreateFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer une demande d'achat pour cette maintenance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Désignation *</Label>
              <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFor(null)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Création..." : "Créer et soumettre"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
