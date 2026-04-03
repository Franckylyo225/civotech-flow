import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { Devis, TypeRemise } from "@/types/devis";
import { calculeDevisTotaux, formatMontant } from "@/types/devis";

interface LigneForm {
  id?: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
}

interface DevisEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devis: Devis;
  onSave: (data: {
    lignes: LigneForm[];
    tauxTva: number;
    typeRemise: TypeRemise;
    valeurRemise: number;
  }) => Promise<void>;
}

export default function DevisEditDialog({ open, onOpenChange, devis, onSave }: DevisEditDialogProps) {
  const [lignes, setLignes] = useState<LigneForm[]>([]);
  const [tauxTva, setTauxTva] = useState(18);
  const [typeRemise, setTypeRemise] = useState<TypeRemise>("POURCENTAGE");
  const [valeurRemise, setValeurRemise] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && devis) {
      setLignes(devis.lignes.map((l) => ({
        id: l.id,
        description: l.description,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
      })));
      setTauxTva(devis.tauxTva);
      setTypeRemise(devis.typeRemise);
      setValeurRemise(devis.valeurRemise);
    }
  }, [open, devis]);

  const addLigne = () => {
    setLignes([...lignes, { description: "", quantite: 1, prixUnitaire: 0 }]);
  };

  const removeLigne = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const updateLigne = (index: number, field: keyof LigneForm, value: string | number) => {
    setLignes(lignes.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const totaux = calculeDevisTotaux(lignes, tauxTva, typeRemise, valeurRemise);
  const isValid = lignes.length > 0 && lignes.every((l) => l.description.trim() && l.quantite > 0 && l.prixUnitaire > 0);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ lignes, tauxTva, typeRemise, valeurRemise });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le devis {devis.reference}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Lignes de prestation</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                <Plus className="mr-1 h-4 w-4" /> Ajouter
              </Button>
            </div>

            {lignes.map((ligne, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-end">
                <div>
                  {index === 0 && <Label className="text-xs">Description</Label>}
                  <Input
                    value={ligne.description}
                    onChange={(e) => updateLigne(index, "description", e.target.value)}
                    placeholder="Description..."
                  />
                </div>
                <div>
                  {index === 0 && <Label className="text-xs">Qté</Label>}
                  <Input
                    type="number"
                    min={1}
                    value={ligne.quantite}
                    onChange={(e) => updateLigne(index, "quantite", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  {index === 0 && <Label className="text-xs">Prix unit.</Label>}
                  <Input
                    type="number"
                    min={0}
                    value={ligne.prixUnitaire}
                    onChange={(e) => updateLigne(index, "prixUnitaire", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLigne(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {lignes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Ajoutez au moins une ligne</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">TVA (%)</Label>
              <Input
                type="number"
                value={tauxTva}
                onChange={(e) => setTauxTva(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label className="text-xs">Type remise</Label>
              <Select value={typeRemise} onValueChange={(v) => setTypeRemise(v as TypeRemise)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POURCENTAGE">Pourcentage</SelectItem>
                  <SelectItem value="MONTANT">Montant fixe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Valeur remise</Label>
              <Input
                type="number"
                value={valeurRemise}
                onChange={(e) => setValeurRemise(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Sous-total HT</span><span>{formatMontant(totaux.montantHT)}</span></div>
            {totaux.montantRemise > 0 && (
              <div className="flex justify-between text-destructive"><span>Remise</span><span>-{formatMontant(totaux.montantRemise)}</span></div>
            )}
            <div className="flex justify-between"><span>TVA ({tauxTva}%)</span><span>{formatMontant(totaux.montantTva)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total TTC</span><span>{formatMontant(totaux.montantTotal)}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
