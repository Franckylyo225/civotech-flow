import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import type { Client, CreateDevisData, TypeRemise } from "@/types/devis";
import { formatMontant, calculeDevisTotaux } from "@/types/devis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface LigneForm {
  description: string;
  quantite: number;
  prixUnitaire: number;
}

interface DevisCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onSave: (data: CreateDevisData) => Promise<any>;
}

export default function DevisCreateDialog({ open, onOpenChange, clients, onSave }: DevisCreateDialogProps) {
  const [clientId, setClientId] = useState("");
  const [lignes, setLignes] = useState<LigneForm[]>([
    { description: "", quantite: 1, prixUnitaire: 0 },
  ]);
  const [tauxTva, setTauxTva] = useState(18);
  const [typeRemise, setTypeRemise] = useState<TypeRemise>("POURCENTAGE");
  const [valeurRemise, setValeurRemise] = useState(0);
  const [saving, setSaving] = useState(false);

  const addLigne = () => setLignes((prev) => [...prev, { description: "", quantite: 1, prixUnitaire: 0 }]);

  const removeLigne = (index: number) => {
    if (lignes.length <= 1) return;
    setLignes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLigne = (index: number, field: keyof LigneForm, value: string | number) => {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const totaux = calculeDevisTotaux(lignes, tauxTva, typeRemise, valeurRemise);

  const resetForm = () => {
    setClientId("");
    setLignes([{ description: "", quantite: 1, prixUnitaire: 0 }]);
    setTauxTva(18);
    setTypeRemise("POURCENTAGE");
    setValeurRemise(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { toast.error("Veuillez sélectionner un client"); return; }
    if (lignes.some((l) => !l.description.trim() || l.prixUnitaire <= 0)) {
      toast.error("Veuillez remplir toutes les lignes correctement");
      return;
    }
    setSaving(true);
    await onSave({ clientId, lignes, tauxTva, typeRemise, valeurRemise });
    setSaving(false);
    toast.success("Devis créé avec succès");
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Nouveau devis</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lignes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Lignes de prestation</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                <Plus className="mr-1 h-4 w-4" /> Ajouter
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>Prix unit. (FCFA)</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lignes.map((ligne, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          placeholder="Ex: Transport Abidjan → Bouaké"
                          value={ligne.description}
                          onChange={(e) => updateLigne(i, "description", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={1} value={ligne.quantite}
                          onChange={(e) => updateLigne(i, "quantite", parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0} value={ligne.prixUnitaire}
                          onChange={(e) => updateLigne(i, "prixUnitaire", parseInt(e.target.value) || 0)}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-primary whitespace-nowrap text-sm">
                        {formatMontant(ligne.quantite * ligne.prixUnitaire)}
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLigne(i)} disabled={lignes.length <= 1}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          {/* Remise & TVA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Remise</Label>
              <div className="flex gap-2">
                <Select value={typeRemise} onValueChange={(v) => setTypeRemise(v as TypeRemise)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POURCENTAGE">Pourcentage (%)</SelectItem>
                    <SelectItem value="MONTANT">Montant fixe</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={typeRemise === "POURCENTAGE" ? 100 : undefined}
                  value={valeurRemise}
                  onChange={(e) => setValeurRemise(parseFloat(e.target.value) || 0)}
                  className="flex-1"
                  placeholder={typeRemise === "POURCENTAGE" ? "0 %" : "0 FCFA"}
                />
              </div>
              {totaux.montantRemise > 0 && (
                <p className="text-sm text-destructive">- {formatMontant(totaux.montantRemise)}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">TVA</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={tauxTva}
                  onChange={(e) => setTauxTva(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              {totaux.montantTva > 0 && (
                <p className="text-sm text-muted-foreground">+ {formatMontant(totaux.montantTva)}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Récapitulatif */}
          <div className="space-y-1 text-right">
            <div className="flex justify-end gap-8 text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="font-medium w-36 text-right">{formatMontant(totaux.montantHT)}</span>
            </div>
            {totaux.montantRemise > 0 && (
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-muted-foreground">
                  Remise {typeRemise === "POURCENTAGE" ? `(${valeurRemise}%)` : ""}
                </span>
                <span className="font-medium text-destructive w-36 text-right">- {formatMontant(totaux.montantRemise)}</span>
              </div>
            )}
            <div className="flex justify-end gap-8 text-sm">
              <span className="text-muted-foreground">TVA ({tauxTva}%)</span>
              <span className="font-medium w-36 text-right">{formatMontant(totaux.montantTva)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-end gap-8">
              <span className="font-semibold">Total TTC</span>
              <span className="text-2xl font-bold text-primary w-36 text-right">{formatMontant(totaux.montantTotal)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
