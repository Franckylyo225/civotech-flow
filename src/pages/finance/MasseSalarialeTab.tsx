import { useState } from "react";
import {
  Plus, Trash2, CheckCircle2, Clock, DollarSign, Users, RefreshCw, Pencil, UserPlus,
} from "lucide-react";
import { useMasseSalarialeStore, type Employe } from "@/hooks/use-masse-salariale-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props { canManage: boolean; }

const MOIS_OPTIONS = () => {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -3; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: fr }) });
  }
  return opts;
};

export default function MasseSalarialeTab({ canManage }: Props) {
  const {
    employes, salaires, loading,
    addEmploye, updateEmploye, deleteEmploye,
    generateMois, updateSalaire,
  } = useMasseSalarialeStore();

  const [selectedMois, setSelectedMois] = useState(format(new Date(), "yyyy-MM"));
  const [showAddEmploye, setShowAddEmploye] = useState(false);
  const [showEmployes, setShowEmployes] = useState(false);
  const [editSalaire, setEditSalaire] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [empForm, setEmpForm] = useState({ nom: "", prenom: "", poste: "", telephone: "", salaire_base: 0, taux_cotisations: 16 });
  const [salForm, setSalForm] = useState({ primes: 0, avances: 0 });

  const moisOptions = MOIS_OPTIONS();
  const moisLabel = moisOptions.find(m => m.value === selectedMois)?.label || selectedMois;

  const salairesDuMois = salaires
    .filter(s => s.mois === selectedMois)
    .map(s => ({ ...s, employe: employes.find(e => e.id === s.employe_id) }));

  const totalBrut = salairesDuMois.reduce((s, x) => s + x.salaire_base + x.primes, 0);
  const totalCotisations = salairesDuMois.reduce((s, x) => s + x.cotisations, 0);
  const totalNet = salairesDuMois.reduce((s, x) => s + x.net_a_payer, 0);
  const totalPaye = salairesDuMois.filter(s => s.paye).reduce((s, x) => s + x.net_a_payer, 0);

  const handleAddEmploye = async () => {
    if (!empForm.nom.trim() || !empForm.prenom.trim()) { toast.error("Nom et prénom requis"); return; }
    if (empForm.salaire_base <= 0) { toast.error("Salaire de base invalide"); return; }
    try {
      await addEmploye({ ...empForm, actif: true } as any);
      toast.success("Employé ajouté");
      setShowAddEmploye(false);
      setEmpForm({ nom: "", prenom: "", poste: "", telephone: "", salaire_base: 0, taux_cotisations: 16 });
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleGenerate = async () => {
    try {
      const count = await generateMois(selectedMois);
      if (count === 0) toast.info("Tous les salaires sont déjà générés pour ce mois");
      else toast.success(`${count} bulletin(s) généré(s) pour ${moisLabel}`);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleTogglePaye = async (id: string, paye: boolean) => {
    try {
      await updateSalaire(id, { paye, date_paiement: paye ? new Date().toISOString().slice(0, 10) : null });
      toast.success(paye ? "Salaire marqué comme payé" : "Paiement annulé");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleOpenEdit = (s: any) => {
    setSalForm({ primes: s.primes, avances: s.avances });
    setEditSalaire(s.id);
  };

  const handleSaveEdit = async () => {
    if (!editSalaire) return;
    const sal = salairesDuMois.find(s => s.id === editSalaire);
    if (!sal) return;
    const net = sal.salaire_base + salForm.primes - sal.cotisations - salForm.avances;
    try {
      await updateSalaire(editSalaire, { primes: salForm.primes, avances: salForm.avances, net_a_payer: Math.max(0, net) });
      toast.success("Bulletin mis à jour");
      setEditSalaire(null);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDeleteEmploye = async (id: string) => {
    try {
      await deleteEmploye(id);
      toast.success("Employé supprimé");
      setDeleteConfirm(null);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Users, value: employes.filter(e => e.actif).length, label: "Employés actifs", color: "primary" },
          { icon: DollarSign, value: `${totalBrut.toLocaleString()} F`, label: "Masse brute", color: "info" },
          { icon: CheckCircle2, value: `${totalPaye.toLocaleString()} F`, label: "Payé", color: "success" },
          { icon: Clock, value: `${(totalNet - totalPaye).toLocaleString()} F`, label: "Reste à payer", color: "warning" },
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

      {/* Toolbar */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedMois} onValueChange={setSelectedMois}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {moisOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {canManage && (
              <>
                <Button variant="outline" onClick={handleGenerate}>
                  <RefreshCw className="mr-1.5 h-4 w-4" />Générer les bulletins
                </Button>
                <Button variant="outline" onClick={() => setShowEmployes(true)}>
                  <Users className="mr-1.5 h-4 w-4" />Employés
                </Button>
                <Button onClick={() => setShowAddEmploye(true)}>
                  <UserPlus className="mr-1.5 h-4 w-4" />Ajouter un employé
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly payroll table */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base capitalize">Bulletins — {moisLabel}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Primes</TableHead>
                <TableHead>Cotisations</TableHead>
                <TableHead>Avances</TableHead>
                <TableHead>Net à payer</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {salairesDuMois.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm font-medium">{s.employe ? `${s.employe.prenom} ${s.employe.nom}` : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.employe?.poste || "—"}</TableCell>
                  <TableCell className="text-sm">{s.salaire_base.toLocaleString()} F</TableCell>
                  <TableCell className="text-sm">{s.primes > 0 ? <span className="text-success">+{s.primes.toLocaleString()}</span> : "—"}</TableCell>
                  <TableCell className="text-sm text-destructive">-{s.cotisations.toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{s.avances > 0 ? <span className="text-warning">-{s.avances.toLocaleString()}</span> : "—"}</TableCell>
                  <TableCell className="text-sm font-semibold">{s.net_a_payer.toLocaleString()} F</TableCell>
                  <TableCell>
                    {s.paye ? (
                      <Badge variant="outline" className="border-0 text-xs bg-success/10 text-success"><CheckCircle2 className="h-3 w-3 mr-1" />Payé</Badge>
                    ) : (
                      <Badge variant="outline" className="border-0 text-xs bg-warning/10 text-warning"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(s)} title="Modifier primes/avances">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleTogglePaye(s.id, !s.paye)}>
                          {s.paye ? "Annuler" : "Payer"}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {salairesDuMois.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 9 : 8} className="text-center py-8 text-muted-foreground">
                    Aucun bulletin pour ce mois. Cliquez sur "Générer les bulletins".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {salairesDuMois.length > 0 && (
            <div className="flex justify-between items-center p-4 border-t border-border bg-muted/30 text-sm">
              <div className="flex gap-6">
                <span className="text-muted-foreground">Cotisations : <span className="font-semibold text-destructive">{totalCotisations.toLocaleString()} F</span></span>
                <span className="text-muted-foreground">Payé : <span className="font-semibold text-success">{totalPaye.toLocaleString()} F</span></span>
              </div>
              <span className="font-semibold">Total net : {totalNet.toLocaleString()} F</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add employee dialog */}
      <Dialog open={showAddEmploye} onOpenChange={setShowAddEmploye}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajouter un employé</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input value={empForm.prenom} onChange={e => setEmpForm(f => ({ ...f, prenom: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={empForm.nom} onChange={e => setEmpForm(f => ({ ...f, nom: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Poste</Label>
                <Input value={empForm.poste} onChange={e => setEmpForm(f => ({ ...f, poste: e.target.value }))} placeholder="Ex: Chauffeur, Mécanicien..." />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={empForm.telephone} onChange={e => setEmpForm(f => ({ ...f, telephone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salaire de base (F) *</Label>
                <Input type="number" value={empForm.salaire_base} onChange={e => setEmpForm(f => ({ ...f, salaire_base: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Taux cotisations (%)</Label>
                <Input type="number" value={empForm.taux_cotisations} onChange={e => setEmpForm(f => ({ ...f, taux_cotisations: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEmploye(false)}>Annuler</Button>
            <Button onClick={handleAddEmploye}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit salaire dialog */}
      <Dialog open={!!editSalaire} onOpenChange={() => setEditSalaire(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Modifier le bulletin</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Primes / Bonus (F)</Label>
              <Input type="number" value={salForm.primes} onChange={e => setSalForm(f => ({ ...f, primes: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Avances sur salaire (F)</Label>
              <Input type="number" value={salForm.avances} onChange={e => setSalForm(f => ({ ...f, avances: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSalaire(null)}>Annuler</Button>
            <Button onClick={handleSaveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employees list dialog */}
      <Dialog open={showEmployes} onOpenChange={setShowEmployes}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Liste des employés</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {employes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun employé</p>}
            {employes.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div>
                  <p className="text-sm font-medium">{e.prenom} {e.nom}</p>
                  <p className="text-xs text-muted-foreground">{e.poste || "—"} — {e.salaire_base.toLocaleString()} F/mois — Cotis. {e.taux_cotisations}%</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={e.actif} onCheckedChange={v => updateEmploye(e.id, { actif: v })} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(e.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmployes(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Supprimer cet employé et tous ses bulletins de salaire ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDeleteEmploye(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
