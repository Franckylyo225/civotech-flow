import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import type { Client } from "@/types/devis";
import { formatMontant } from "@/types/devis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface LigneForm {
  description: string;
  quantite: number;
  prixUnitaire: number;
}

interface DevisCreatePageProps {
  clients: Client[];
  onSave: (data: { clientId: string; lignes: LigneForm[] }) => void;
  onCancel: () => void;
}

export default function DevisCreatePage({ clients, onSave, onCancel }: DevisCreatePageProps) {
  const [clientId, setClientId] = useState("");
  const [lignes, setLignes] = useState<LigneForm[]>([
    { description: "", quantite: 1, prixUnitaire: 0 },
  ]);

  const addLigne = () => setLignes((prev) => [...prev, { description: "", quantite: 1, prixUnitaire: 0 }]);

  const removeLigne = (index: number) => {
    if (lignes.length <= 1) return;
    setLignes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLigne = (index: number, field: keyof LigneForm, value: string | number) => {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const total = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { toast.error("Veuillez sélectionner un client"); return; }
    if (lignes.some((l) => !l.description || l.prixUnitaire <= 0)) {
      toast.error("Veuillez remplir toutes les lignes correctement");
      return;
    }
    onSave({ clientId, lignes });
    toast.success("Devis créé avec succès");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nouveau devis</h1>
          <p className="text-muted-foreground">Créez un devis pour un client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informations client</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom} — {c.ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Lignes de prestation</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLigne}>
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Description</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Prix unitaire (FCFA)</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead></TableHead>
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
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-primary whitespace-nowrap">
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
            <div className="mt-4 flex justify-end border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Montant total</p>
                <p className="text-2xl font-bold text-primary">{formatMontant(total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" /> Enregistrer le devis
          </Button>
        </div>
      </form>
    </div>
  );
}
