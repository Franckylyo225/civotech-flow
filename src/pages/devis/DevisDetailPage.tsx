import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle2, XCircle, Mail, UserCheck, UserX, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { Devis, DevisStatut } from "@/types/devis";
import { formatMontant, formatDate, DEVIS_STATUT_CONFIG } from "@/types/devis";
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
}

export default function DevisDetailPage({ devis, onUpdateStatut }: DevisDetailPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showRefusDialog, setShowRefusDialog] = useState(false);
  const [commentaireRefus, setCommentaireRefus] = useState("");
  const [refusType, setRefusType] = useState<"DG" | "CLIENT">("DG");

  const role = user?.role;

  const handleAction = (newStatut: DevisStatut, message: string) => {
    onUpdateStatut(devis.id, newStatut);
    toast.success(message);
  };

  const handleRefus = () => {
    const statut: DevisStatut = refusType === "DG" ? "REFUSE_DG" : "REFUSE_CLIENT";
    onUpdateStatut(devis.id, statut, commentaireRefus);
    setShowRefusDialog(false);
    setCommentaireRefus("");
    toast.success(refusType === "DG" ? "Devis refusé" : "Devis marqué comme refusé par le client");
  };

  const openRefusDialog = (type: "DG" | "CLIENT") => {
    setRefusType(type);
    setShowRefusDialog(true);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/devis")}>
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

      {/* Refus comment */}
      {devis.commentaireRefus && (devis.statut === "REFUSE_DG" || devis.statut === "REFUSE_CLIENT") && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <MessageSquare className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Motif du refus</p>
              <p className="text-sm text-foreground mt-1">{devis.commentaireRefus}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Client info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">{devis.client.nom}</p>
            <p className="text-muted-foreground">{devis.client.email}</p>
            <p className="text-muted-foreground">{devis.client.telephone}</p>
            <p className="text-muted-foreground">{devis.client.adresse}, {devis.client.ville}</p>
          </CardContent>
        </Card>

        {/* Montants */}
        <Card>
          <CardHeader><CardTitle className="text-base">Montant</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatMontant(devis.montantTotal)}</p>
            <p className="text-sm text-muted-foreground mt-1">{devis.lignes.length} ligne(s) de prestation</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {/* COMMERCIAL actions */}
            {(role === "COMMERCIAL" || role === "DG") && devis.statut === "BROUILLON" && (
              <Button className="w-full" onClick={() => handleAction("SOUMIS_DG", "Devis soumis au DG")}>
                <Send className="mr-2 h-4 w-4" /> Soumettre au DG
              </Button>
            )}

            {/* DG validation */}
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

            {/* COMMERCIAL send to client */}
            {(role === "COMMERCIAL" || role === "DG") && devis.statut === "APPROUVE_DG" && (
              <Button className="w-full" onClick={() => handleAction("ENVOYE_CLIENT", "Devis envoyé au client")}>
                <Mail className="mr-2 h-4 w-4" /> Envoyer au client
              </Button>
            )}

            {/* COMMERCIAL mark client response */}
            {(role === "COMMERCIAL" || role === "DG") && devis.statut === "ENVOYE_CLIENT" && (
              <>
                <Button className="w-full bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleAction("VALIDE_CLIENT", "Client a validé le devis — opération créée")}>
                  <UserCheck className="mr-2 h-4 w-4" /> Client a validé
                </Button>
                <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => openRefusDialog("CLIENT")}>
                  <UserX className="mr-2 h-4 w-4" /> Client a refusé
                </Button>
              </>
            )}

            {devis.statut === "VALIDE_CLIENT" && (
              <p className="text-sm text-success font-medium text-center">✓ Devis validé — Opération planifiée</p>
            )}
            {(devis.statut === "REFUSE_DG" || devis.statut === "REFUSE_CLIENT") && (
              <p className="text-sm text-destructive font-medium text-center">✗ Devis refusé</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lines table */}
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

      {/* Refus dialog */}
      <Dialog open={showRefusDialog} onOpenChange={setShowRefusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {refusType === "DG" ? "Refuser le devis" : "Marquer comme refusé par le client"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Motif du refus (obligatoire)..."
              value={commentaireRefus}
              onChange={(e) => setCommentaireRefus(e.target.value)}
              rows={4}
            />
          </div>
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
