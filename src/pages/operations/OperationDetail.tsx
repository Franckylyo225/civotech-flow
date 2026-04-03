import { useState, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Truck, User, MapPin, ArrowRight, Package, Weight, Clock,
  Play, CheckCircle2, Upload, Plus, Receipt, Fuel, CircleDot,
  Phone, CreditCard, Loader2, CalendarIcon, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Operation, Camion, Chauffeur, LigneDepense, CategorieDepense, OperationStatut, TypeIncident, GraviteIncident } from "@/types/operations";
import { OPERATION_STATUT_CONFIG, CATEGORIE_DEPENSE_CONFIG, TYPE_INCIDENT_CONFIG, GRAVITE_CONFIG, formatMontantOp, formatDateOp, formatDateShort } from "@/types/operations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OperationDetailProps {
  operation: Operation;
  camions: Camion[];
  chauffeurs: Chauffeur[];
  onUpdateStatut: (opId: string, statut: OperationStatut) => void;
  onAffecter: (opId: string, camionId: string, chauffeurId: string) => void;
  onAddDepense: (opId: string, depense: Omit<LigneDepense, "id" | "operationId">) => void;
  onPlanifier?: (opId: string, lieuEmbarquement: string, dateDepart: string, dateLivraisonEstimee?: string) => void;
  onAddIncident?: (opId: string, incident: { type: TypeIncident; description: string; gravite: GraviteIncident }) => void;
  onToggleIncidentResolu?: (incidentId: string, resolu: boolean) => void;
  onUpdateOperation?: (opId: string, data: {
    lieu_embarquement?: string;
    lieu_livraison?: string;
    poids_kg?: number | null;
    nombre_colis?: number | null;
    nature_marchandise?: string;
    precautions?: string;
    commentaires?: string;
  }) => Promise<void>;
}

export default function OperationDetail({ operation: op, camions, chauffeurs, onUpdateStatut, onAffecter, onAddDepense, onPlanifier, onAddIncident, onToggleIncidentResolu }: OperationDetailProps) {
  const { user } = useAuth();
  const [showAffectDialog, setShowAffectDialog] = useState(false);
  const [showDepenseDialog, setShowDepenseDialog] = useState(false);
  const [selectedCamion, setSelectedCamion] = useState("");
  const [selectedChauffeur, setSelectedChauffeur] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showPlanifDialog, setShowPlanifDialog] = useState(false);
  const [planifLieu, setPlanifLieu] = useState(op.lieuEmbarquement || "");
  const [planifDate, setPlanifDate] = useState<Date | undefined>(op.dateDepart ? new Date(op.dateDepart) : undefined);
  const [planifDateLivraison, setPlanifDateLivraison] = useState<Date | undefined>(op.dateLivraisonEstimee ? new Date(op.dateLivraisonEstimee) : undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [depForm, setDepForm] = useState<{ categorie: CategorieDepense; description: string; montant: number }>({
    categorie: "CARBURANT", description: "", montant: 0,
  });
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [incidentForm, setIncidentForm] = useState<{ type: TypeIncident; description: string; gravite: GraviteIncident }>({
    type: "AUTRE", description: "", gravite: "MOYENNE",
  });

  const config = OPERATION_STATUT_CONFIG[op.statut];
  const totalDepenses = op.depenses.reduce((s, d) => s + d.montant, 0);
  const marge = op.montantDevis - totalDepenses;

  const handleAffecter = () => {
    if (!selectedCamion || !selectedChauffeur) { toast.error("Sélectionnez un camion et un chauffeur"); return; }
    onAffecter(op.id, selectedCamion, selectedChauffeur);
    setShowAffectDialog(false);
    toast.success("Camion et chauffeur affectés");
  };

  const handleAddDepense = () => {
    if (!depForm.description || depForm.montant <= 0) { toast.error("Remplissez tous les champs"); return; }
    onAddDepense(op.id, { ...depForm, date: new Date().toISOString() });
    setShowDepenseDialog(false);
    setDepForm({ categorie: "CARBURANT", description: "", montant: 0 });
    toast.success("Dépense ajoutée");
  };

  const handlePlanifier = () => {
    if (!planifLieu.trim()) { toast.error("Veuillez saisir le lieu de prise en charge"); return; }
    if (!planifDate) { toast.error("Veuillez programmer la date de la mission"); return; }
    if (onPlanifier) {
      onPlanifier(op.id, planifLieu.trim(), planifDate.toISOString(), planifDateLivraison?.toISOString());
    }
    setShowPlanifDialog(false);
    toast.success("Mission planifiée avec succès");
  };

  const handleUploadBL = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${op.id}/bl_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("bon-livraison").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("bon-livraison").getPublicUrl(filePath);
      await supabase.from("operations").update({ bon_livraison_url: urlData.publicUrl }).eq("id", op.id);
      toast.success("Bon de livraison uploadé avec succès");
      // Trigger refetch via parent
      onUpdateStatut(op.id, op.statut);
    } catch (err: any) {
      toast.error("Erreur lors de l'upload : " + (err.message || "Erreur inconnue"));
    } finally {
      setUploading(false);
    }
  };

  const handleAddIncident = () => {
    if (!incidentForm.description.trim()) { toast.error("Veuillez décrire l'incident"); return; }
    if (onAddIncident) {
      onAddIncident(op.id, incidentForm);
    }
    setShowIncidentDialog(false);
    setIncidentForm({ type: "AUTRE", description: "", gravite: "MOYENNE" });
    toast.success("Incident signalé");
  };

  const handleTerminer = () => {
    if (!op.bonLivraisonUrl) {
      toast.error("Veuillez uploader le bon de livraison avant de terminer la mission");
      return;
    }
    onUpdateStatut(op.id, "TERMINEE");
    toast.success("Mission terminée");
  };

  const canManage = user?.role === "LOGISTIQUE" || user?.role === "DG";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">N° {op.reference}</h1>
            <Badge variant="outline" className={cn("border-0 text-xs font-medium", config.bgColor, config.color)}>
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Client : {op.clientNom}</p>
        </div>
        <div className="flex gap-2">
          {canManage && op.statut === "DEMANDE" && (
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setPlanifLieu(op.lieuEmbarquement || ""); setPlanifDate(op.dateDepart ? new Date(op.dateDepart) : undefined); setPlanifDateLivraison(op.dateLivraisonEstimee ? new Date(op.dateLivraisonEstimee) : undefined); setShowPlanifDialog(true); }}>
              <CalendarIcon className="mr-1.5 h-4 w-4" /> Planifier la mission
            </Button>
          )}
          {canManage && op.statut === "PLANIFIEE" && !op.camionId && (
            <Button size="sm" onClick={() => setShowAffectDialog(true)}>
              <Truck className="mr-1.5 h-4 w-4" /> Affecter
            </Button>
          )}
          {canManage && op.statut === "PLANIFIEE" && op.camionId && (
            <Button size="sm" onClick={() => { onUpdateStatut(op.id, "EN_COURS"); toast.success("Mission démarrée"); }}>
              <Play className="mr-1.5 h-4 w-4" /> Démarrer
            </Button>
          )}
          {canManage && op.statut === "EN_COURS" && (
            <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setShowIncidentDialog(true)}>
              <AlertTriangle className="mr-1.5 h-4 w-4" /> Signaler incident
            </Button>
          )}
          {canManage && op.statut === "EN_COURS" && (
            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={handleTerminer}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Terminer
            </Button>
          )}
        </div>
      </div>

      {/* Route card */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Départ</p>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border-2 border-primary bg-primary/20" />
                  <span className="text-sm font-medium text-foreground">{op.lieuEmbarquement}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4">
                <div className="h-[2px] w-16 bg-border" />
                <Truck className="h-4 w-4 text-primary" />
                <div className="h-[2px] w-16 bg-border" />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Arrivée</p>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border-2 border-success bg-success/20" />
                  <span className="text-sm font-medium text-foreground">{op.lieuLivraison}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info cards row */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Weight className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Poids total</p>
            <p className="text-sm font-bold text-foreground">{op.poidsKg ? `${(op.poidsKg / 1000).toFixed(1)}T` : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Package className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Colis</p>
            <p className="text-sm font-bold text-foreground">{op.nombreColis ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Clock className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Durée estimée</p>
            <p className="text-sm font-bold text-foreground">{op.dureeEstimeeHeures ? `${op.dureeEstimeeHeures}h` : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none bg-primary text-primary-foreground">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <CreditCard className="h-5 w-5 mb-2 opacity-80" />
            <p className="text-xs opacity-80">Montant devis</p>
            <p className="text-lg font-bold">{formatMontantOp(op.montantDevis)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline + Vehicle/Driver */}
      <div className="grid grid-cols-5 gap-4">
        {/* Timeline */}
        <Card className="col-span-3 border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Suivi de livraison</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {op.timeline.map((event, i) => {
                const isLast = i === op.timeline.length - 1;
                return (
                  <div key={event.id} className="flex gap-3">
                    {/* Dot + line */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "h-3 w-3 rounded-full mt-1.5 shrink-0",
                        event.statut === "done" && "bg-success",
                        event.statut === "current" && "bg-warning",
                        event.statut === "pending" && "bg-border",
                      )} />
                      {!isLast && (
                        <div className={cn(
                          "w-0.5 flex-1 min-h-[32px]",
                          event.statut === "done" ? "bg-success/30" : "bg-border",
                        )} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-sm font-medium",
                          event.statut === "pending" ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {event.titre}
                        </p>
                        <span className="text-xs text-muted-foreground">{event.heure}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                      <p className="text-xs text-muted-foreground">{event.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle + Driver */}
        <div className="col-span-2 space-y-4">
          {/* Vehicle card */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Véhicule</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {op.camion ? (
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">{op.camion.marque} {op.camion.modele}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Imm: <span className="font-medium text-foreground">{op.camion.immatriculation}</span></span>
                    <span>Cap: <span className="font-medium text-foreground">{op.camion.capaciteTonnes}T</span></span>
                  </div>
                  <p className="text-xs text-muted-foreground">Année : {op.camion.annee}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Non affecté</p>
              )}
            </CardContent>
          </Card>

          {/* Driver card */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Chauffeur</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {op.chauffeur ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                      {op.chauffeur.prenom[0]}{op.chauffeur.nom[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{op.chauffeur.prenom} {op.chauffeur.nom}</p>
                      <p className="text-xs text-muted-foreground">Permis : {op.chauffeur.numeroPermis}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 flex-1">
                      <Phone className="h-3 w-3" /> Appeler
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Non affecté</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expenses */}
      <Card className="border border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Dépenses de mission</CardTitle>
          {canManage && (op.statut === "EN_COURS" || op.statut === "PLANIFIEE") && (
            <Button variant="outline" size="sm" onClick={() => setShowDepenseDialog(true)}>
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {op.depenses.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {op.depenses.map((dep) => (
                    <TableRow key={dep.id}>
                      <TableCell>
                        <Badge variant="outline" className="border-0 bg-muted text-muted-foreground text-xs">
                          {CATEGORIE_DEPENSE_CONFIG[dep.categorie].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{dep.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateShort(dep.date)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatMontantOp(dep.montant)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end gap-8 border-t pt-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total dépenses</p>
                  <p className="text-sm font-semibold text-destructive">{formatMontantOp(totalDepenses)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Marge</p>
                  <p className={cn("text-sm font-semibold", marge >= 0 ? "text-success" : "text-destructive")}>
                    {formatMontantOp(marge)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune dépense enregistrée</p>
          )}
        </CardContent>
      </Card>

      {/* Bon de livraison */}
      {(op.statut === "EN_COURS" || op.statut === "TERMINEE") && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Bon de livraison</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {op.bonLivraisonUrl ? (
              <div className="flex items-center gap-3 rounded-lg bg-success/5 border border-success/20 p-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">BL uploadé</p>
                  <p className="text-xs text-muted-foreground truncate max-w-md">{op.bonLivraisonUrl.split("/").pop()}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={op.bonLivraisonUrl} target="_blank" rel="noopener noreferrer">Télécharger</a>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Aucun bon de livraison uploadé</p>
                <p className="text-xs text-destructive mb-3">Requis pour terminer la mission</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadBL(file);
                  }}
                />
                {canManage && (
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                    {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                    {uploading ? "Upload en cours..." : "Uploader le BL"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Incidents */}
      {(op.statut === "EN_COURS" || op.statut === "TERMINEE") && (
        <Card className="border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Incidents ({op.incidents.length})
            </CardTitle>
            {canManage && op.statut === "EN_COURS" && (
              <Button variant="outline" size="sm" onClick={() => setShowIncidentDialog(true)}>
                <Plus className="mr-1 h-4 w-4" /> Signaler
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {op.incidents.length > 0 ? (
              <div className="space-y-3">
                {op.incidents.map((inc) => {
                  const typeConfig = TYPE_INCIDENT_CONFIG[inc.type];
                  const gravConfig = GRAVITE_CONFIG[inc.gravite];
                  return (
                    <div key={inc.id} className={cn("flex items-start gap-3 rounded-lg border p-3", inc.resolu ? "bg-muted/50 opacity-70" : "")}>
                      <span className="text-lg mt-0.5">{typeConfig.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn("border-0 text-xs font-medium", gravConfig.bgColor, gravConfig.color)}>
                            {gravConfig.label}
                          </Badge>
                          <Badge variant="outline" className="border-0 bg-muted text-muted-foreground text-xs">
                            {typeConfig.label}
                          </Badge>
                          {inc.resolu && (
                            <Badge variant="outline" className="border-0 bg-success/10 text-success text-xs">
                              Résolu
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground">{inc.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDateShort(inc.dateIncident)}</p>
                      </div>
                      {canManage && !inc.resolu && (
                        <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => onToggleIncidentResolu?.(inc.id, true)}>
                          Résoudre
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun incident signalé</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Affectation dialog */}
      <Dialog open={showAffectDialog} onOpenChange={setShowAffectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Affecter un camion et chauffeur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Camion</Label>
              <Select value={selectedCamion} onValueChange={setSelectedCamion}>
                <SelectTrigger><SelectValue placeholder="Choisir un camion..." /></SelectTrigger>
                <SelectContent>
                  {camions.filter((c) => c.statut === "DISPONIBLE").map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.marque} {c.modele} — {c.immatriculation} ({c.capaciteTonnes}T)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chauffeur</Label>
              <Select value={selectedChauffeur} onValueChange={setSelectedChauffeur}>
                <SelectTrigger><SelectValue placeholder="Choisir un chauffeur..." /></SelectTrigger>
                <SelectContent>
                  {chauffeurs.filter((c) => c.disponible).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.prenom} {c.nom} — {c.numeroPermis}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAffectDialog(false)}>Annuler</Button>
            <Button onClick={handleAffecter}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dépense dialog */}
      <Dialog open={showDepenseDialog} onOpenChange={setShowDepenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une dépense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={depForm.categorie} onValueChange={(v) => setDepForm((p) => ({ ...p, categorie: v as CategorieDepense }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIE_DEPENSE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={depForm.description} onChange={(e) => setDepForm((p) => ({ ...p, description: e.target.value }))} placeholder="Ex: Plein diesel Station Total" />
            </div>
            <div className="space-y-2">
              <Label>Montant (FCFA)</Label>
              <Input type="number" value={depForm.montant} onChange={(e) => setDepForm((p) => ({ ...p, montant: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepenseDialog(false)}>Annuler</Button>
            <Button onClick={handleAddDepense}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Planification dialog */}
      <Dialog open={showPlanifDialog} onOpenChange={setShowPlanifDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier la mission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lieu de prise en charge</Label>
              <Input
                value={planifLieu}
                onChange={(e) => setPlanifLieu(e.target.value)}
                placeholder="Ex: Port Autonome de Douala"
              />
            </div>
            <div className="space-y-2">
              <Label>Date de la mission</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !planifDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {planifDate ? format(planifDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={planifDate}
                    onSelect={setPlanifDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Date de livraison estimée</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !planifDateLivraison && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {planifDateLivraison ? format(planifDateLivraison, "PPP", { locale: fr }) : "Sélectionner une date (optionnel)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={planifDateLivraison}
                    onSelect={setPlanifDateLivraison}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanifDialog(false)}>Annuler</Button>
            <Button onClick={handlePlanifier}>Planifier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incident dialog */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler un incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type d'incident</Label>
              <Select value={incidentForm.type} onValueChange={(v) => setIncidentForm((p) => ({ ...p, type: v as TypeIncident }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_INCIDENT_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gravité</Label>
              <Select value={incidentForm.gravite} onValueChange={(v) => setIncidentForm((p) => ({ ...p, gravite: v as GraviteIncident }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GRAVITE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={incidentForm.description}
                onChange={(e) => setIncidentForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Décrivez l'incident..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncidentDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleAddIncident}>Signaler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
