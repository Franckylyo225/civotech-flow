import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, CreditCard, Clock, CheckCircle2, Ban, DollarSign, CalendarIcon, X, Plus, Pencil, Trash2,
} from "lucide-react";
import {
  useDecaissementsStore, STATUT_DECAISSEMENT_CONFIG,
  type DecaissementRow, type StatutDecaissement,
} from "@/hooks/use-decaissements-store";
import { useDemandesAchatStore } from "@/hooks/use-demandes-achat-store";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Props { canManage: boolean; isDG: boolean; }

export default function DecaissementsTab({ canManage, isDG }: Props) {
  const { decaissements, loading, stats, updateDecaissement, addDecaissement, deleteDecaissement } = useDecaissementsStore();
  const { demandes } = useDemandesAchatStore();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<StatutDecaissement | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [payDialog, setPayDialog] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ reference_paiement: "", date_paiement: new Date().toISOString().slice(0, 10), commentaire: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ montant: 0, motif: "", commentaire: "" });
  const [editDialog, setEditDialog] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ montant: 0, motif: "", commentaire: "" });
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);

  const getDARef = (id: string | null) => id ? demandes.find(d => d.id === id)?.reference || "—" : "—";
  const getDADesignation = (id: string | null) => id ? demandes.find(d => d.id === id)?.designation || "" : "";

  const filtered = decaissements.filter(d => {
    const matchSearch = d.reference.toLowerCase().includes(search.toLowerCase()) ||
      (d.motif || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.demande_achat_id ? getDARef(d.demande_achat_id).toLowerCase().includes(search.toLowerCase()) : false);
    const matchStatut = filterStatut === "ALL" || d.statut === filterStatut;
    const createdDate = new Date(d.created_at);
    const matchFrom = !dateFrom || createdDate >= dateFrom;
    const matchTo = !dateTo || createdDate <= new Date(dateTo.getTime() + 86400000 - 1);
    return matchSearch && matchStatut && matchFrom && matchTo;
  });

  const handleApprouver = async (id: string) => {
    try {
      await updateDecaissement(id, { statut: "APPROUVE" as any });
      toast.success("Décaissement approuvé");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleRejeter = async (id: string) => {
    try {
      await updateDecaissement(id, { statut: "REJETE" as any });
      toast.success("Décaissement rejeté");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handlePayer = async () => {
    if (!payDialog) return;
    if (!payForm.reference_paiement.trim()) { toast.error("La référence de paiement est obligatoire"); return; }
    try {
      await updateDecaissement(payDialog, {
        statut: "PAYE" as any,
        reference_paiement: payForm.reference_paiement,
        date_paiement: payForm.date_paiement,
        commentaire: payForm.commentaire || null,
      });
      const dec = decaissements.find(d => d.id === payDialog);
      if (dec?.demande_achat_id) {
        await supabase.from("demandes_achat").update({ statut: "PAYEE" } as any).eq("id", dec.demande_achat_id);
        const { data: da } = await supabase.from("demandes_achat").select("maintenance_id").eq("id", dec.demande_achat_id).single();
        if (da?.maintenance_id) {
          await supabase.from("maintenances").update({ statut: "EN_COURS", date_debut: new Date().toISOString().slice(0, 10) } as any).eq("id", da.maintenance_id);
          toast.success("Maintenance passée en cours d'exécution", { description: "Les pièces sont disponibles" });
        }
      }
      toast.success("Paiement enregistré");
      setPayDialog(null);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleCreate = async () => {
    if (createForm.montant <= 0) { toast.error("Le montant doit être supérieur à 0"); return; }
    if (!createForm.motif.trim()) { toast.error("Le motif est obligatoire"); return; }
    try {
      await addDecaissement(createForm);
      toast.success("Demande de décaissement créée — en attente d'approbation DG");
      setShowCreate(false);
      setCreateForm({ montant: 0, motif: "", commentaire: "" });
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleEdit = async () => {
    if (!editDialog) return;
    if (editForm.montant <= 0) { toast.error("Le montant doit être supérieur à 0"); return; }
    if (!editForm.motif.trim()) { toast.error("Le motif est obligatoire"); return; }
    try {
      await updateDecaissement(editDialog, { montant: editForm.montant, motif: editForm.motif, commentaire: editForm.commentaire || null } as any);
      toast.success("Décaissement modifié");
      setEditDialog(null);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleAnnuler = async (id: string) => {
    if (!confirm("Annuler cette demande de décaissement ?")) return;
    try {
      await deleteDecaissement(id);
      toast.success("Demande de décaissement annulée");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: CreditCard, value: stats.total, label: "Total", color: "primary" },
          { icon: Clock, value: stats.enAttente, label: "En attente", color: "warning" },
          { icon: CheckCircle2, value: stats.paye, label: "Payés", color: "success" },
          { icon: DollarSign, value: `${stats.montantEnAttente.toLocaleString()} F`, label: "À décaisser", color: "info" },
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
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher par référence ou motif..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatut} onValueChange={v => setFilterStatut(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(STATUT_DECAISSEMENT_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left text-sm font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Du"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left text-sm font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Au"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} title="Réinitialiser">
                <X className="h-4 w-4" />
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-1.5 h-4 w-4" />Nouveau décaissement
              </Button>
            )}
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
                <TableHead>Motif</TableHead>
                <TableHead>Lié à</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => {
                const statutCfg = STATUT_DECAISSEMENT_CONFIG[d.statut];
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm font-medium">{d.reference}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{d.motif || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {d.demande_achat_id ? (
                        <div>
                          <span className="font-mono text-xs">{getDARef(d.demande_achat_id)}</span>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{getDADesignation(d.demande_achat_id)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Direct</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{d.montant.toLocaleString()} F</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0 text-xs font-medium", statutCfg.bgColor, statutCfg.color)}>
                        {statutCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.date_paiement ? format(new Date(d.date_paiement), "dd/MM/yyyy") : format(new Date(d.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isDG && d.statut === "EN_ATTENTE" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleApprouver(d.id)}>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-success" /> Approuver
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleRejeter(d.id)}>
                              <Ban className="mr-1 h-3.5 w-3.5" /> Rejeter
                            </Button>
                          </>
                        )}
                        {canManage && d.statut === "EN_ATTENTE" && !d.demande_achat_id && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                              setEditForm({ montant: d.montant, motif: d.motif || "", commentaire: d.commentaire || "" });
                              setEditDialog(d.id);
                            }}>
                              <Pencil className="mr-1 h-3.5 w-3.5" /> Modifier
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleAnnuler(d.id)}>
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> Annuler
                            </Button>
                          </>
                        )}
                        {canManage && d.statut === "APPROUVE" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => {
                            setPayForm({ reference_paiement: "", date_paiement: new Date().toISOString().slice(0, 10), commentaire: "" });
                            setPayDialog(d.id);
                          }}>
                            <DollarSign className="mr-1 h-3.5 w-3.5" /> Payer
                          </Button>
                        )}
                        {d.statut === "PAYE" && d.reference_paiement && (
                          <span className="text-xs text-muted-foreground">Réf: {d.reference_paiement}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun décaissement</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle demande de décaissement</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cette demande sera soumise au DG pour approbation avant décaissement.</p>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Motif *</Label>
              <Input value={createForm.motif} onChange={e => setCreateForm(f => ({ ...f, motif: e.target.value }))} placeholder="Ex: Frais carburant projet X, Loyer bureau..." />
            </div>
            <div className="space-y-2">
              <Label>Montant (F) *</Label>
              <Input type="number" value={createForm.montant} onChange={e => setCreateForm(f => ({ ...f, montant: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea value={createForm.commentaire} onChange={e => setCreateForm(f => ({ ...f, commentaire: e.target.value }))} placeholder="Détails supplémentaires..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate}>Soumettre au DG</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enregistrer le paiement</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Référence de paiement *</Label>
              <Input value={payForm.reference_paiement} onChange={e => setPayForm(f => ({ ...f, reference_paiement: e.target.value }))} placeholder="Ex: VIR-2026-0042" />
            </div>
            <div className="space-y-2">
              <Label>Date de paiement</Label>
              <Input type="date" value={payForm.date_paiement} onChange={e => setPayForm(f => ({ ...f, date_paiement: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea value={payForm.commentaire} onChange={e => setPayForm(f => ({ ...f, commentaire: e.target.value }))} placeholder="Notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Annuler</Button>
            <Button onClick={handlePayer}>Confirmer le paiement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier la demande de décaissement</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Motif *</Label>
              <Input value={editForm.motif} onChange={e => setEditForm(f => ({ ...f, motif: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Montant (F) *</Label>
              <Input type="number" value={editForm.montant} onChange={e => setEditForm(f => ({ ...f, montant: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea value={editForm.commentaire} onChange={e => setEditForm(f => ({ ...f, commentaire: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Annuler</Button>
            <Button onClick={handleEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
