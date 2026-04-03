import { useState } from "react";
import {
  Plus, Trash2, CheckCircle2, XCircle, Send, Star, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  useDevisFournisseursStore, type DevisFournisseurRow,
} from "@/hooks/use-devis-fournisseurs-store";
import { useFournisseursStore } from "@/hooks/use-fournisseurs-store";
import { type DemandeAchatRow, STATUT_DA_CONFIG, type StatutDemandeAchat } from "@/hooks/use-demandes-achat-store";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  demande: DemandeAchatRow;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
  isDG: boolean;
  onUpdate: (id: string, updates: Partial<DemandeAchatRow>) => Promise<void>;
}

const EMPTY_DEVIS = {
  fournisseur_id: "",
  montant: 0,
  delai_livraison_jours: 0,
  conditions: "",
  commentaire: "",
};

export default function DemandeAchatDetailDialog({ demande, open, onClose, canManage, isDG, onUpdate }: Props) {
  const { devisFournisseurs, loading: loadingDevis, addDevis, deleteDevis, selectDevis } = useDevisFournisseursStore(demande.id);
  const { fournisseurs } = useFournisseursStore();
  const [showAddDevis, setShowAddDevis] = useState(false);
  const [devisForm, setDevisForm] = useState(EMPTY_DEVIS);
  const [commentaireDG, setCommentaireDG] = useState(demande.commentaire_dg || "");
  const [saving, setSaving] = useState(false);

  const statutCfg = STATUT_DA_CONFIG[demande.statut];
  const activeFournisseurs = fournisseurs.filter(f => f.actif);
  const getFournisseurNom = (id: string) => fournisseurs.find(f => f.id === id)?.nom || "—";
  const devisRetenu = devisFournisseurs.find(d => d.retenu);

  // Workflow transitions
  const canPasserDevisEnCours = canManage && demande.statut === "SOUMISE";
  const canSoumettreDG = canManage && demande.statut === "DEVIS_EN_COURS" && devisFournisseurs.length > 0;
  const canValiderDG = isDG && demande.statut === "SOUMISE_DG" && devisRetenu;
  const canRefuserDG = isDG && demande.statut === "SOUMISE_DG";
  const canAddDevis = canManage && (demande.statut === "SOUMISE" || demande.statut === "DEVIS_EN_COURS");

  const handleTransition = async (newStatut: StatutDemandeAchat, msg: string) => {
    try {
      const updates: any = { statut: newStatut };
      if (newStatut === "REFUSEE_DG") updates.commentaire_dg = commentaireDG;
      if (newStatut === "VALIDEE_DG") updates.commentaire_dg = commentaireDG;
      await onUpdate(demande.id, updates);

      // Auto-generate décaissement when DG validates
      if (newStatut === "VALIDEE_DG" && devisRetenu) {
        const { error: decError } = await supabase.from("decaissements").insert({
          reference: "",
          demande_achat_id: demande.id,
          devis_fournisseur_id: devisRetenu.id,
          montant: devisRetenu.montant,
          statut: "EN_ATTENTE",
          motif: `Achat pièces — ${demande.designation}`,
        } as any);
        if (decError) {
          toast.error("Validation OK mais erreur génération décaissement");
        } else {
          await onUpdate(demande.id, { statut: "DECAISSEMENT" as any });
          toast.success("Décaissement généré automatiquement", { description: "Consultez le module Finance" });
        }
      }

      toast.success(msg);
      onClose();
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const handleAddDevis = async () => {
    if (!devisForm.fournisseur_id) { toast.error("Sélectionnez un fournisseur"); return; }
    if (devisForm.montant <= 0) { toast.error("Le montant doit être positif"); return; }
    setSaving(true);
    try {
      await addDevis({
        demande_achat_id: demande.id,
        fournisseur_id: devisForm.fournisseur_id,
        montant: devisForm.montant,
        delai_livraison_jours: devisForm.delai_livraison_jours,
        conditions: devisForm.conditions || null,
        document_url: null,
        retenu: false,
        commentaire: devisForm.commentaire || null,
      });
      // Auto-transition to DEVIS_EN_COURS if still SOUMISE
      if (demande.statut === "SOUMISE") {
        await onUpdate(demande.id, { statut: "DEVIS_EN_COURS" as any });
      }
      toast.success("Devis fournisseur ajouté");
      setShowAddDevis(false);
      setDevisForm(EMPTY_DEVIS);
    } catch (err: any) { toast.error(err.message || "Erreur lors de l'ajout"); }
    finally { setSaving(false); }
  };

  const handleSelectDevis = async (id: string) => {
    try {
      await selectDevis(id);
      toast.success("Devis sélectionné comme retenu");
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const bestMontant = devisFournisseurs.length > 0 ? Math.min(...devisFournisseurs.map(d => d.montant)) : 0;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono">{demande.reference}</span>
            <Badge variant="outline" className={cn("border-0 text-xs font-medium", statutCfg.bgColor, statutCfg.color)}>
              {statutCfg.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Infos demande */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Désignation :</span> <span className="font-medium">{demande.designation}</span></div>
          <div><span className="text-muted-foreground">Montant estimé :</span> <span className="font-medium">{demande.montant_estime.toLocaleString()} F</span></div>
          <div><span className="text-muted-foreground">Quantité :</span> <span className="font-medium">{demande.quantite}</span></div>
          <div><span className="text-muted-foreground">Urgence :</span> <span className="font-medium">{demande.urgence}</span></div>
          {demande.description && <div className="col-span-2"><span className="text-muted-foreground">Description :</span> <span>{demande.description}</span></div>}
          {demande.commentaire_dg && (
            <div className="col-span-2 p-2 rounded bg-muted/50 border border-border">
              <span className="text-muted-foreground text-xs">Commentaire DG :</span>
              <p className="text-sm mt-0.5">{demande.commentaire_dg}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Devis fournisseurs */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Devis fournisseurs ({devisFournisseurs.length})
              </CardTitle>
              {canAddDevis && !showAddDevis && (
                <Button size="sm" variant="outline" onClick={() => setShowAddDevis(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter un devis
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {devisFournisseurs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Délai (j)</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devisFournisseurs.map(df => (
                    <TableRow key={df.id} className={cn(df.retenu && "bg-success/5")}>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1.5">
                          {df.retenu && <Star className="h-3.5 w-3.5 text-success fill-success" />}
                          {getFournisseurNom(df.fournisseur_id)}
                        </div>
                      </TableCell>
                      <TableCell className={cn("text-sm font-medium", df.montant === bestMontant && "text-success")}>
                        {df.montant.toLocaleString()} F
                        {df.montant === bestMontant && devisFournisseurs.length > 1 && (
                          <span className="ml-1 text-[10px] text-success">meilleur</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{df.delai_livraison_jours || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{df.conditions || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(canManage || isDG) && !df.retenu && (demande.statut === "DEVIS_EN_COURS" || demande.statut === "SOUMISE_DG") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSelectDevis(df.id)} title="Retenir ce devis">
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canAddDevis && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDevis(df.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              !showAddDevis && <p className="text-center py-6 text-sm text-muted-foreground">Aucun devis fournisseur ajouté</p>
            )}

            {/* Inline add devis form (replaces nested dialog) */}
            {showAddDevis && (
              <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Nouveau devis fournisseur</h4>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowAddDevis(false); setDevisForm(EMPTY_DEVIS); }}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Fournisseur *</Label>
                  <Select value={devisForm.fournisseur_id} onValueChange={v => setDevisForm(f => ({ ...f, fournisseur_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                    <SelectContent>
                      {activeFournisseurs.map(f => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Montant (F) *</Label>
                    <Input type="number" min={1} value={devisForm.montant || ""} onChange={e => setDevisForm(f => ({ ...f, montant: Number(e.target.value) }))} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Délai (jours)</Label>
                    <Input type="number" min={0} value={devisForm.delai_livraison_jours || ""} onChange={e => setDevisForm(f => ({ ...f, delai_livraison_jours: Number(e.target.value) }))} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Conditions</Label>
                  <Textarea value={devisForm.conditions} onChange={e => setDevisForm(f => ({ ...f, conditions: e.target.value }))} placeholder="Conditions de paiement, garantie..." rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowAddDevis(false); setDevisForm(EMPTY_DEVIS); }}>Annuler</Button>
                  <Button size="sm" onClick={handleAddDevis} disabled={saving}>
                    {saving ? "Ajout..." : "Ajouter le devis"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DG comment area */}
        {isDG && demande.statut === "SOUMISE_DG" && (
          <div className="space-y-2">
            <Label>Commentaire DG</Label>
            <Textarea value={commentaireDG} onChange={e => setCommentaireDG(e.target.value)} placeholder="Commentaire optionnel..." rows={2} />
          </div>
        )}

        {/* Action buttons */}
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>

          {canPasserDevisEnCours && (
            <Button variant="outline" onClick={() => handleTransition("DEVIS_EN_COURS", "Passage en collecte de devis")}>
              <FileText className="mr-1.5 h-4 w-4" /> Passer en collecte devis
            </Button>
          )}

          {canSoumettreDG && (
            <Button onClick={() => handleTransition("SOUMISE_DG", "Soumise au DG pour validation")}>
              <Send className="mr-1.5 h-4 w-4" /> Soumettre au DG
            </Button>
          )}

          {canRefuserDG && (
            <Button variant="destructive" onClick={() => handleTransition("REFUSEE_DG", "Demande refusée")}>
              <XCircle className="mr-1.5 h-4 w-4" /> Refuser
            </Button>
          )}

          {canValiderDG && (
            <Button className="bg-success hover:bg-success/90 text-white" onClick={() => handleTransition("VALIDEE_DG", "Demande validée — décaissement à générer")}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Valider l'offre
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
