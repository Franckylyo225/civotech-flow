import { useState } from "react";
import { ArrowLeft, Send, CheckCircle2, XCircle, Mail, UserCheck, UserX, MessageSquare, Truck, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import type { Devis, DevisStatut, TypeRemise } from "@/types/devis";
import { formatMontant, formatDate } from "@/types/devis";
import DevisEditDialog from "./DevisEditDialog";
import { DevisStatutBadge } from "@/components/devis/DevisStatutBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface DevisDetailPageProps {
  devis: Devis;
  onUpdateStatut: (devisId: string, statut: DevisStatut, commentaire?: string) => void;
  onUpdateDevis?: (devisId: string, data: { lignes: { id?: string; description: string; quantite: number; prixUnitaire: number }[]; tauxTva: number; typeRemise: TypeRemise; valeurRemise: number }) => Promise<void>;
  onCreateOperation?: (devis: Devis) => Promise<boolean>;
  onBack: () => void;
}

export default function DevisDetailPage({ devis, onUpdateStatut, onUpdateDevis, onCreateOperation, onBack }: DevisDetailPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showRefusDialog, setShowRefusDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [commentaireRefus, setCommentaireRefus] = useState("");
  const [refusType, setRefusType] = useState<"DG" | "CLIENT">("DG");
  const [creatingOp, setCreatingOp] = useState(false);

  const role = user?.role;

  const handleAction = (newStatut: DevisStatut, message: string) => {
    onUpdateStatut(devis.id, newStatut);
    toast.success(message);
  };

  const handleRefus = () => {
    const statut: DevisStatut = refusType === "DG" ? "BROUILLON" : "REFUSE_CLIENT";
    onUpdateStatut(devis.id, statut, commentaireRefus);
    setShowRefusDialog(false);
    setCommentaireRefus("");
    toast.success(refusType === "DG" ? "Devis renvoyé en brouillon pour révision" : "Devis marqué comme refusé par le client");
  };

  const openRefusDialog = (type: "DG" | "CLIENT") => {
    setRefusType(type);
    setShowRefusDialog(true);
  };

  const handleCreateOperation = async () => {
    if (!onCreateOperation) return;
    setCreatingOp(true);
    const ok = await onCreateOperation(devis);
    setCreatingOp(false);
    if (ok) {
      toast.success("Demande d'opération créée avec succès");
      navigate("/operations");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{devis.reference}</h1>
              <DevisStatutBadge statut={devis.statut} />
            </div>
            <p className="text-muted-foreground">
              Créé le {formatDate(devis.createdAt)} · Mis à jour le {formatDate(devis.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {devis.commentaireRefus && (devis.statut === "BROUILLON" || devis.statut === "REFUSE_DG" || devis.statut === "REFUSE_CLIENT") && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4">
            <MessageSquare className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">
                {devis.statut === "BROUILLON" ? "Retour DG — À corriger" : "Motif du refus"}
              </p>
              <p className="text-sm text-foreground mt-1">{devis.commentaireRefus}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {devis.client ? (
              <>
                <p className="font-semibold text-foreground">{devis.client.nom}</p>
                {devis.client.email && <p className="text-muted-foreground">{devis.client.email}</p>}
                {devis.client.telephone && <p className="text-muted-foreground">{devis.client.telephone}</p>}
                {devis.client.adresse && <p className="text-muted-foreground">{devis.client.adresse}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">Client non renseigné</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Montant</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold text-primary">{formatMontant(devis.montantTotal)}</p>
            <p className="text-xs text-muted-foreground">{devis.lignes.length} ligne(s) · HT: {formatMontant(devis.montantHT)}</p>
            {devis.montantRemise > 0 && (
              <p className="text-xs text-destructive">Remise: -{formatMontant(devis.montantRemise)}</p>
            )}
            <p className="text-xs text-muted-foreground">TVA ({devis.tauxTva}%): {formatMontant(devis.montantTva)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(role === "COMMERCIAL" || role === "DG") && devis.statut === "BROUILLON" && (
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => setShowEditDialog(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Modifier le devis
                </Button>
                <Button className="w-full" onClick={() => handleAction("SOUMIS_DG", "Devis soumis au DG")}>
                  <Send className="mr-2 h-4 w-4" /> Soumettre au DG
                </Button>
              </div>
            )}

            {role === "DG" && devis.statut === "SOUMIS_DG" && (
              <>
                <Button className="w-full bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleAction("APPROUVE_DG", "Devis approuvé")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approuver
                </Button>
                <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => openRefusDialog("DG")}>
                  <XCircle className="mr-2 h-4 w-4" /> Refuser
                </Button>
              </>
            )}

            {(role === "COMMERCIAL" || role === "DG") && devis.statut === "APPROUVE_DG" && (
              <Button className="w-full" onClick={() => handleAction("ENVOYE_CLIENT", "Devis envoyé au client")}>
                <Mail className="mr-2 h-4 w-4" /> Envoyer au client
              </Button>
            )}

            {(role === "COMMERCIAL" || role === "DG") && devis.statut === "ENVOYE_CLIENT" && (
              <>
                <Button className="w-full bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleAction("VALIDE_CLIENT", "Client a validé le devis")}>
                  <UserCheck className="mr-2 h-4 w-4" /> Client a validé
                </Button>
                <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => openRefusDialog("CLIENT")}>
                  <UserX className="mr-2 h-4 w-4" /> Client a refusé
                </Button>
              </>
            )}

            {devis.statut === "VALIDE_CLIENT" && (
              <div className="space-y-2">
                <p className="text-sm text-success font-medium text-center">✓ Devis validé par le client</p>
                {(role === "COMMERCIAL" || role === "DG" || role === "LOGISTIQUE") && (
                  <Button className="w-full" onClick={handleCreateOperation} disabled={creatingOp}>
                    <Truck className="mr-2 h-4 w-4" />
                    {creatingOp ? "Création..." : "Créer une demande d'opération"}
                  </Button>
                )}
              </div>
            )}
            {(devis.statut === "REFUSE_DG" || devis.statut === "REFUSE_CLIENT") && (
              <p className="text-sm text-destructive font-medium text-center">✗ Devis refusé</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lignes de prestation</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devis.lignes.map((ligne) => (
                <TableRow key={ligne.id}>
                  <TableCell>{ligne.description}</TableCell>
                  <TableCell className="text-right">{ligne.quantite}</TableCell>
                  <TableCell className="text-right">{formatMontant(ligne.prixUnitaire)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMontant(ligne.montant)}</TableCell>
                </TableRow>
              ))}
              {devis.lignes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Aucune ligne</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end border-t pt-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-primary">{formatMontant(devis.montantTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {onUpdateDevis && (
        <DevisEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          devis={devis}
          onSave={async (data) => {
            await onUpdateDevis(devis.id, data);
            toast.success("Devis modifié avec succès");
          }}
        />
      )}

      <Dialog open={showRefusDialog} onOpenChange={setShowRefusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {refusType === "DG" ? "Refuser le devis" : "Marquer comme refusé par le client"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Motif du refus (obligatoire)..."
            value={commentaireRefus}
            onChange={(e) => setCommentaireRefus(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefusDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleRefus} disabled={!commentaireRefus.trim()}>
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
