import { useState } from "react";
import {
  Plus, Trash2, CheckCircle2, Clock, DollarSign, Settings, CalendarIcon, RefreshCw,
} from "lucide-react";
import {
  useChargesStore, CATEGORIE_CHARGE_CONFIG,
  type ChargeFixe, type CategorieCharge,
} from "@/hooks/use-charges-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props { canManage: boolean; }

const MOIS_OPTIONS = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -3; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy", { locale: fr }),
    });
  }
  return options;
};

export default function ChargesTab({ canManage }: Props) {
  const {
    chargesFixes, chargesMensuelles, loading,
    addChargeFixe, updateChargeFixe, deleteChargeFixe,
    generateMois, updateChargeMensuelle,
  } = useChargesStore();

  const [selectedMois, setSelectedMois] = useState(format(new Date(), "yyyy-MM"));
  const [showAdd, setShowAdd] = useState(false);
  const [showModeles, setShowModeles] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    designation: "",
    categorie: "AUTRE" as CategorieCharge,
    montant: 0,
  });

  const moisOptions = MOIS_OPTIONS();
  const chargesDuMois = chargesMensuelles
    .filter(cm => cm.mois === selectedMois)
    .map(cm => {
      const cf = chargesFixes.find(c => c.id === cm.charge_fixe_id);
      return { ...cm, chargeFixe: cf };
    });

  const totalMois = chargesDuMois.reduce((s, c) => s + c.montant, 0);
  const payeesMois = chargesDuMois.filter(c => c.payee).length;
  const totalPayeMois = chargesDuMois.filter(c => c.payee).reduce((s, c) => s + c.montant, 0);

  const handleAdd = async () => {
    if (!addForm.designation.trim()) { toast.error("Désignation requise"); return; }
    if (addForm.montant <= 0) { toast.error("Montant invalide"); return; }
    try {
      await addChargeFixe({
        designation: addForm.designation,
        categorie: addForm.categorie,
        montant: addForm.montant,
        actif: true,
      });
      toast.success("Charge fixe ajoutée");
      setShowAdd(false);
      setAddForm({ designation: "", categorie: "AUTRE", montant: 0 });
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleGenerate = async () => {
    try {
      const count = await generateMois(selectedMois);
      if (count === 0) toast.info("Toutes les charges sont déjà générées pour ce mois");
      else toast.success(`${count} charge(s) générée(s) pour ${moisOptions.find(m => m.value === selectedMois)?.label}`);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleTogglePayee = async (id: string, payee: boolean) => {
    try {
      await updateChargeMensuelle(id, {
        payee,
        date_paiement: payee ? new Date().toISOString().slice(0, 10) : null,
      });
      toast.success(payee ? "Charge marquée comme payée" : "Paiement annulé");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleToggleActif = async (id: string, actif: boolean) => {
    try {
      await updateChargeFixe(id, { actif });
      toast.success(actif ? "Charge activée" : "Charge désactivée");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteChargeFixe(id);
      toast.success("Charge supprimée");
      setDeleteConfirm(null);
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement...</div>;

  const moisLabel = moisOptions.find(m => m.value === selectedMois)?.label || selectedMois;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Settings, value: chargesFixes.filter(c => c.actif).length, label: "Modèles actifs", color: "primary" },
          { icon: CalendarIcon, value: chargesDuMois.length, label: `Charges ${moisLabel}`, color: "info" },
          { icon: CheckCircle2, value: `${payeesMois}/${chargesDuMois.length}`, label: "Payées", color: "success" },
          { icon: DollarSign, value: `${totalMois.toLocaleString()} F`, label: "Total du mois", color: "warning" },
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
                {moisOptions.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManage && (
              <>
                <Button variant="outline" onClick={handleGenerate}>
                  <RefreshCw className="mr-1.5 h-4 w-4" />Générer le mois
                </Button>
                <Button variant="outline" onClick={() => setShowModeles(true)}>
                  <Settings className="mr-1.5 h-4 w-4" />Modèles
                </Button>
                <Button onClick={() => setShowAdd(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />Ajouter un modèle
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly charges table */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base capitalize">{moisLabel}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Désignation</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {chargesDuMois.map(cm => {
                const catCfg = cm.chargeFixe ? CATEGORIE_CHARGE_CONFIG[cm.chargeFixe.categorie as CategorieCharge] : null;
                return (
                  <TableRow key={cm.id}>
                    <TableCell className="text-sm font-medium">
                      {cm.chargeFixe?.designation || "—"}
                    </TableCell>
                    <TableCell>
                      {catCfg && (
                        <Badge variant="outline" className="border-0 text-xs bg-muted">
                          {catCfg.icon} {catCfg.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{cm.montant.toLocaleString()} F</TableCell>
                    <TableCell>
                      {cm.payee ? (
                        <Badge variant="outline" className="border-0 text-xs bg-success/10 text-success">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Payée
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-0 text-xs bg-warning/10 text-warning">
                          <Clock className="h-3 w-3 mr-1" />En attente
                        </Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePayee(cm.id, !cm.payee)}
                        >
                          {cm.payee ? "Annuler" : "Marquer payée"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {chargesDuMois.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    Aucune charge pour ce mois. Cliquez sur "Générer le mois" pour créer les charges.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {chargesDuMois.length > 0 && (
            <div className="flex justify-between items-center p-4 border-t border-border bg-muted/30">
              <span className="text-sm text-muted-foreground">Total payé : <span className="font-semibold text-success">{totalPayeMois.toLocaleString()} F</span></span>
              <span className="text-sm font-semibold">Total : {totalMois.toLocaleString()} F</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add model dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouveau modèle de charge fixe</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Désignation *</Label>
              <Input value={addForm.designation} onChange={e => setAddForm(f => ({ ...f, designation: e.target.value }))} placeholder="Ex: Loyer entrepôt" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={addForm.categorie} onValueChange={v => setAddForm(f => ({ ...f, categorie: v as CategorieCharge }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIE_CHARGE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Montant mensuel (F) *</Label>
                <Input type="number" value={addForm.montant} onChange={e => setAddForm(f => ({ ...f, montant: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleAdd}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Models management dialog */}
      <Dialog open={showModeles} onOpenChange={setShowModeles}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modèles de charges fixes</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {chargesFixes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun modèle</p>}
            {chargesFixes.map(cf => {
              const catCfg = CATEGORIE_CHARGE_CONFIG[cf.categorie];
              return (
                <div key={cf.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{catCfg.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{cf.designation}</p>
                      <p className="text-xs text-muted-foreground">{catCfg.label} — {cf.montant.toLocaleString()} F/mois</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={cf.actif} onCheckedChange={v => handleToggleActif(cf.id, v)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(cf.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModeles(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Supprimer ce modèle de charge ? Les instances mensuelles associées seront aussi supprimées.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
