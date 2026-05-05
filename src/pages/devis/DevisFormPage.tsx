import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Save, Send, FileText, Download, Copy,
  AlertTriangle, CheckCircle2, XCircle, Truck, Mail,
  UserCheck, UserX, MessageSquare, Upload, X as XIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDevisStore } from "@/hooks/use-devis-store";
import { TarifPickerPopover } from "@/components/devis/TarifPickerPopover";
import { calculeDevisTotaux, formatMontant, formatDate, type DevisStatut, type TypeRemise } from "@/types/devis";
import { DevisPDFPreview } from "@/pdf/DevisPDFPreview";
import { DevisStatutBadge } from "@/components/devis/DevisStatutBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LigneForm = { id?: string; description: string; quantite: number; prixUnitaire: number };
type Mission = {
  embarquement: string; livraison: string; dateDepart: string; duree: string;
  marchandise: string; tonnage: string;
};

const VALIDITE_OPTIONS = [15, 30, 45, 60];
const DUREE_OPTIONS = ["1j", "2j", "3j", "4j", "5j+"];

export default function DevisFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { devisList, clients, addDevis, updateDevis, updateStatut, createOperationFromDevis } = useDevisStore();

  const isNew = !id || id === "nouveau";
  const devis = !isNew ? devisList.find((d) => d.id === id) : undefined;

  // ── Form state
  const [clientId, setClientId] = useState("");
  const [refCommande, setRefCommande] = useState("");
  const [contactClient, setContactClient] = useState("");
  const [lignes, setLignes] = useState<LigneForm[]>([{ description: "", quantite: 1, prixUnitaire: 0 }]);
  const [tauxTva, setTauxTva] = useState(18);
  const [typeRemise, setTypeRemise] = useState<TypeRemise>("POURCENTAGE");
  const [valeurRemise, setValeurRemise] = useState(0);
  const [validiteJours, setValiditeJours] = useState(30);
  const [noteInterne, setNoteInterne] = useState("");
  const [mission, setMission] = useState<Mission>({
    embarquement: "", livraison: "", dateDepart: "", duree: "", marchandise: "", tonnage: "",
  });
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRefusDialog, setShowRefusDialog] = useState(false);
  const [refusType, setRefusType] = useState<"DG" | "CLIENT">("CLIENT");
  const [commentaireRefus, setCommentaireRefus] = useState("");
  const [showOpDialog, setShowOpDialog] = useState(false);
  const [opForm, setOpForm] = useState({
    lieu_embarquement: "", lieu_livraison: "", poids_kg: "", nombre_colis: "",
    nature_marchandise: "", precautions: "", commentaires: "",
  });
  const [bonCommandeFile, setBonCommandeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Hydrate from devis when loaded
  useEffect(() => {
    if (!devis) return;
    setClientId(devis.clientId || "");
    setLignes(devis.lignes.length > 0
      ? devis.lignes.map((l) => ({ id: l.id, description: l.description, quantite: l.quantite, prixUnitaire: l.prixUnitaire }))
      : [{ description: "", quantite: 1, prixUnitaire: 0 }]);
    setTauxTva(devis.tauxTva);
    setTypeRemise(devis.typeRemise);
    setValeurRemise(devis.valeurRemise);
  }, [devis?.id]);

  const statut: DevisStatut = devis?.statut ?? "BROUILLON";
  const isEditable = statut === "BROUILLON" && (user?.role === "DG" || user?.role === "COMMERCIAL");
  const role = user?.role;

  // ── Totaux
  const totaux = useMemo(
    () => calculeDevisTotaux(lignes, tauxTva, typeRemise, valeurRemise),
    [lignes, tauxTva, typeRemise, valeurRemise]
  );

  // ── Validité / expiration
  const baseDate = devis ? new Date(devis.createdAt) : new Date();
  const expirationDate = useMemo(() => {
    const d = new Date(baseDate); d.setDate(d.getDate() + validiteJours); return d;
  }, [baseDate, validiteJours]);
  const joursAvantExpiration = Math.ceil((expirationDate.getTime() - Date.now()) / 86_400_000);
  const expireBientot = joursAvantExpiration < 7 && joursAvantExpiration >= 0;

  // ── Lignes helpers
  const addLigne = () => setLignes((p) => [...p, { description: "", quantite: 1, prixUnitaire: 0 }]);
  const removeLigne = (i: number) => { if (lignes.length > 1) setLignes((p) => p.filter((_, idx) => idx !== i)); };
  const updateLigne = (i: number, patch: Partial<LigneForm>) =>
    setLignes((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  // ── Validation commune
  const validate = (): boolean => {
    if (!clientId) { toast.error("Veuillez sélectionner un client"); return false; }
    if (lignes.some((l) => !l.description.trim() || l.prixUnitaire <= 0)) {
      toast.error("Veuillez remplir toutes les lignes correctement"); return false;
    }
    return true;
  };

  // ── Actions
  const handleSave = async (): Promise<string | null> => {
    if (!validate()) return null;
    setSaving(true);
    try {
      if (isNew) {
        const created = await addDevis({ clientId, lignes, tauxTva, typeRemise, valeurRemise });
        if (created?.id) {
          toast.success("Brouillon enregistré");
          navigate(`/devis/${created.id}`, { replace: true });
          return created.id;
        }
        return null;
      } else {
        await updateDevis(id!, { lignes, tauxTva, typeRemise, valeurRemise });
        toast.success("Devis enregistré");
        return id!;
      }
    } finally { setSaving(false); }
  };

  const handleSubmitToDG = async () => {
    let devisId = id;
    if (isNew) {
      const created = await handleSave();
      if (!created) return;
      devisId = created;
    } else if (!validate()) return;
    if (!devisId) return;
    await updateStatut(devisId, "SOUMIS_DG");
    toast.success("Devis soumis au DG");
    setShowSubmitDialog(false);
  };

  const handleQuickStatut = async (newStatut: DevisStatut, msg: string) => {
    if (!id) return;
    await updateStatut(id, newStatut);
    toast.success(msg);
  };

  const handleCancel = async () => {
    if (!id) { navigate("/devis"); return; }
    await updateStatut(id, "ARCHIVE");
    toast.success("Devis annulé");
    navigate("/devis");
  };

  const handleRefus = async () => {
    if (!id || !commentaireRefus.trim()) return;
    await updateStatut(id, refusType === "DG" ? "BROUILLON" : "REFUSE_CLIENT", commentaireRefus);
    setShowRefusDialog(false); setCommentaireRefus("");
    toast.success(refusType === "DG" ? "Renvoyé en brouillon" : "Refus client enregistré");
  };

  const handleDuplicate = async () => {
    const created = await addDevis({ clientId, lignes, tauxTva, typeRemise, valeurRemise });
    if (created?.id) {
      toast.success(`Devis dupliqué : ${created.reference || "nouveau brouillon"}`);
      navigate(`/devis/${created.id}`);
    }
  };

  const handleCreateOperation = async () => {
    if (!devis) return;
    if (!opForm.lieu_embarquement.trim() || !opForm.lieu_livraison.trim()) {
      toast.error("Lieux de récupération et de livraison obligatoires"); return;
    }
    if (!bonCommandeFile) { toast.error("Le bon de commande est obligatoire"); return; }
    const ok = await createOperationFromDevis(devis, {
      lieu_embarquement: opForm.lieu_embarquement.trim(),
      lieu_livraison: opForm.lieu_livraison.trim(),
      poids_kg: opForm.poids_kg ? Number(opForm.poids_kg) : null,
      nombre_colis: opForm.nombre_colis ? Number(opForm.nombre_colis) : null,
      nature_marchandise: opForm.nature_marchandise.trim(),
      precautions: opForm.precautions.trim(),
      commentaires: opForm.commentaires.trim(),
      bon_commande_file: bonCommandeFile,
    });
    if (ok) { setShowOpDialog(false); navigate("/operations"); }
  };

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] bg-[#F8F9FA]">
      {/* TOPBAR sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/devis")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium truncate">
            {isNew ? "Nouveau devis" : devis?.reference || "Devis"}
          </span>
          {!isNew && devis && <DevisStatutBadge statut={statut} />}
        </div>
        <div className="flex items-center gap-2">
          {/* BROUILLON */}
          {statut === "BROUILLON" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => devis && generateDevisPdf(devis)} disabled={isNew}>
                <FileText className="mr-1 h-4 w-4" /> Aperçu PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-4 w-4" /> Enregistrer
              </Button>
              {isEditable && (
                <Button size="sm" onClick={() => { if (validate()) setShowSubmitDialog(true); }}>
                  <Send className="mr-1 h-4 w-4" /> Soumettre au DG
                </Button>
              )}
            </>
          )}
          {/* SOUMIS_DG */}
          {statut === "SOUMIS_DG" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => devis && generateDevisPdf(devis)}>
                <Download className="mr-1 h-4 w-4" /> Télécharger PDF
              </Button>
              {role === "DG" && (
                <>
                  <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => handleQuickStatut("APPROUVE_DG", "Devis approuvé")}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Approuver
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => { setRefusType("DG"); setShowRefusDialog(true); }}>
                    <XCircle className="mr-1 h-4 w-4" /> Refuser
                  </Button>
                </>
              )}
            </>
          )}
          {/* APPROUVE_DG */}
          {statut === "APPROUVE_DG" && (role === "COMMERCIAL" || role === "DG") && (
            <>
              <Button variant="ghost" size="sm" onClick={() => devis && generateDevisPdf(devis)}>
                <Download className="mr-1 h-4 w-4" /> Télécharger PDF
              </Button>
              <Button size="sm" onClick={() => handleQuickStatut("ENVOYE_CLIENT", "Devis envoyé au client")}>
                <Mail className="mr-1 h-4 w-4" /> Envoyer au client
              </Button>
            </>
          )}
          {/* ENVOYE_CLIENT */}
          {statut === "ENVOYE_CLIENT" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => devis && generateDevisPdf(devis)}>
                <Download className="mr-1 h-4 w-4" /> Télécharger PDF
              </Button>
              {(role === "COMMERCIAL" || role === "DG") && (
                <>
                  <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => handleQuickStatut("VALIDE_CLIENT", "Validation client enregistrée")}>
                    <UserCheck className="mr-1 h-4 w-4" /> Validé par le client
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => { setRefusType("CLIENT"); setShowRefusDialog(true); }}>
                    <UserX className="mr-1 h-4 w-4" /> Refusé par le client
                  </Button>
                </>
              )}
            </>
          )}
          {/* VALIDE_CLIENT */}
          {statut === "VALIDE_CLIENT" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => devis && generateDevisPdf(devis)}>
                <Download className="mr-1 h-4 w-4" /> Télécharger PDF
              </Button>
              {(role === "COMMERCIAL" || role === "DG" || role === "LOGISTIQUE") && (
                <Button size="sm" onClick={() => setShowOpDialog(true)}>
                  <Truck className="mr-1 h-4 w-4" /> Nouvelle Opération
                </Button>
              )}
            </>
          )}
          {/* REFUSE */}
          {(statut === "REFUSE_DG" || statut === "REFUSE_CLIENT") && (
            <>
              <Button variant="ghost" size="sm" onClick={() => devis && generateDevisPdf(devis)}>
                <Download className="mr-1 h-4 w-4" /> Télécharger PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDuplicate}>
                <Copy className="mr-1 h-4 w-4" /> Dupliquer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* CONTENU */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-4">
        {/* COLONNE GAUCHE */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Bandeau commentaire refus */}
          {devis?.commentaireRefus && (statut === "BROUILLON" || statut === "REFUSE_CLIENT") && (
            <Card>
              <div className="flex items-start gap-3 p-4 border-l-4 border-warning bg-warning/5 rounded-[10px]">
                <MessageSquare className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-warning">
                    {statut === "BROUILLON" ? "Retour DG — À corriger" : "Motif du refus client"}
                  </p>
                  <p className="text-sm mt-1">{devis.commentaireRefus}</p>
                </div>
              </div>
            </Card>
          )}

          {/* CARTE 1 : Client */}
          <Card title="Client">
            {isEditable && !selectedClient ? (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : selectedClient ? (
              <div className="rounded-lg border border-[#6EE7B7] bg-[#ECFDF5] p-3 flex items-start justify-between">
                <div>
                  <div className="text-[14px] font-medium text-[#065F46]">{selectedClient.nom}</div>
                  <div className="text-[11px] text-[#0F6E56] mt-0.5">
                    {[selectedClient.email, selectedClient.telephone].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {selectedClient.adresse && (
                    <div className="text-[11px] text-[#0F6E56]">{selectedClient.adresse}</div>
                  )}
                </div>
                {isEditable && (
                  <button className="text-[12px] text-[#0F6E56] hover:underline" onClick={() => setClientId("")}>
                    Changer
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun client renseigné</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Field label="Référence commande client">
                <Input value={refCommande} onChange={(e) => setRefCommande(e.target.value)}
                  disabled={!isEditable} placeholder="Ex: PO-2026-089" />
              </Field>
              <Field label="Contact chez le client">
                <Input value={contactClient} onChange={(e) => setContactClient(e.target.value)}
                  disabled={!isEditable} placeholder="Nom du contact" />
              </Field>
            </div>
          </Card>

          {/* CARTE 2 : Lignes de prestation */}
          <Card
            title="Lignes de prestation"
            action={isEditable && (
              <Button variant="outline" size="sm" onClick={addLigne}>
                <Plus className="mr-1 h-4 w-4" /> Ajouter
              </Button>
            )}
          >
            <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
              <table className="w-full text-sm">
                <thead className="bg-[#F9FAFB] text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-[44%]">Description</th>
                    <th className="text-right px-3 py-2 font-medium">Qté</th>
                    <th className="text-right px-3 py-2 font-medium">Prix unit. (FCFA)</th>
                    <th className="text-right px-3 py-2 font-medium">Montant</th>
                    {isEditable && <th className="w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={i} className="border-t border-[#E5E7EB]">
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Input value={l.description} disabled={!isEditable}
                            onChange={(e) => updateLigne(i, { description: e.target.value })}
                            placeholder="Ex: Transport Abidjan → Bouaké" />
                          {isEditable && (
                            <TarifPickerPopover
                              onSelect={(p) => updateLigne(i, { description: p.description, prixUnitaire: p.prixUnitaire })}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" min={1} value={l.quantite} disabled={!isEditable}
                          onChange={(e) => updateLigne(i, { quantite: parseInt(e.target.value) || 0 })}
                          className="w-20 ml-auto text-right" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" min={0} value={l.prixUnitaire} disabled={!isEditable}
                          onChange={(e) => updateLigne(i, { prixUnitaire: parseInt(e.target.value) || 0 })}
                          className="w-32 ml-auto text-right" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-primary whitespace-nowrap">
                        {formatMontant(l.quantite * l.prixUnitaire)}
                      </td>
                      {isEditable && (
                        <td className="px-2 py-2">
                          <Button variant="ghost" size="icon" onClick={() => removeLigne(i)} disabled={lignes.length <= 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Remise + TVA — encadrés distincts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {/* REMISE */}
              <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-6 w-6 rounded-full bg-[#FEE2E2] text-destructive flex items-center justify-center text-[11px] font-bold">−</span>
                    <span className="text-[12px] font-semibold text-[#991B1B] uppercase tracking-wide">Remise commerciale</span>
                  </div>
                  {totaux.montantRemise > 0 && (
                    <span className="text-[12px] font-medium text-destructive">
                      − {formatMontant(totaux.montantRemise)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select value={typeRemise} onValueChange={(v) => setTypeRemise(v as TypeRemise)} disabled={!isEditable}>
                    <SelectTrigger className="w-[120px] bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POURCENTAGE">% (Pourcentage)</SelectItem>
                      <SelectItem value="MONTANT">FCFA (Montant)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Input type="number" min={0} value={valeurRemise || ""} disabled={!isEditable}
                      onChange={(e) => setValeurRemise(parseFloat(e.target.value) || 0)}
                      className="bg-white pr-12"
                      placeholder="0" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">
                      {typeRemise === "POURCENTAGE" ? "%" : "FCFA"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[#991B1B]/70 mt-1.5">Appliquée sur le sous-total HT, avant TVA</p>
              </div>

              {/* TVA */}
              <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-6 w-6 rounded-full bg-[#DBEAFE] text-[#1E40AF] flex items-center justify-center text-[11px] font-bold">+</span>
                    <span className="text-[12px] font-semibold text-[#1E40AF] uppercase tracking-wide">Taxe (TVA)</span>
                  </div>
                  {totaux.montantTva > 0 && (
                    <span className="text-[12px] font-medium text-[#1E40AF]">
                      + {formatMontant(totaux.montantTva)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input type="number" min={0} max={100} value={tauxTva} disabled={!isEditable}
                      onChange={(e) => setTauxTva(parseFloat(e.target.value) || 0)}
                      className="bg-white pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground pointer-events-none">%</span>
                  </div>
                  {isEditable && (
                    <div className="flex gap-1">
                      {[0, 18].map((v) => (
                        <button key={v} type="button" onClick={() => setTauxTva(v)}
                          className={cn(
                            "px-2 rounded text-[11px] border transition-colors",
                            tauxTva === v ? "bg-[#1E40AF] text-white border-[#1E40AF]" : "bg-white border-[#BFDBFE] text-[#1E40AF] hover:bg-[#DBEAFE]"
                          )}>
                          {v}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-[#1E40AF]/70 mt-1.5">Calculée sur le HT après remise</p>
              </div>
            </div>

            {/* Totaux */}
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] space-y-1 text-sm">
              <Row label="Sous-total HT" value={formatMontant(totaux.montantHT)} />
              {totaux.montantRemise > 0 && (
                <Row label={`Remise${typeRemise === "POURCENTAGE" ? ` (${valeurRemise}%)` : ""}`}
                  value={`- ${formatMontant(totaux.montantRemise)}`} valueClass="text-destructive" />
              )}
              <Row label={`TVA (${tauxTva}%)`} value={formatMontant(totaux.montantTva)} />
              <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB] mt-2">
                <span className="font-semibold">Total TTC</span>
                <span className="text-[15px] font-medium text-primary">{formatMontant(totaux.montantTotal)}</span>
              </div>
            </div>
          </Card>

          {/* CARTE 3 : Détails de la mission */}
          <Card title="Détails de la mission"
            subtitle="Transmis automatiquement à la logistique à la validation du devis">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Lieu d'embarquement">
                {isEditable
                  ? <Input value={mission.embarquement} onChange={(e) => setMission({ ...mission, embarquement: e.target.value })} placeholder="Port, entrepôt..." />
                  : <ReadOnly value={mission.embarquement} />}
              </Field>
              <Field label="Lieu de livraison">
                {isEditable
                  ? <Input value={mission.livraison} onChange={(e) => setMission({ ...mission, livraison: e.target.value })} placeholder="Ville, adresse..." />
                  : <ReadOnly value={mission.livraison} />}
              </Field>
              <Field label="Date souhaitée">
                {isEditable
                  ? <Input type="date" value={mission.dateDepart} onChange={(e) => setMission({ ...mission, dateDepart: e.target.value })} />
                  : <ReadOnly value={mission.dateDepart} />}
              </Field>
              <Field label="Durée estimée">
                {isEditable ? (
                  <Select value={mission.duree} onValueChange={(v) => setMission({ ...mission, duree: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {DUREE_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <ReadOnly value={mission.duree} />}
              </Field>
              <Field label="Type de marchandise">
                {isEditable
                  ? <Input value={mission.marchandise} onChange={(e) => setMission({ ...mission, marchandise: e.target.value })} placeholder="Ex: Conteneurs 40'" />
                  : <ReadOnly value={mission.marchandise} />}
              </Field>
              <Field label="Tonnage estimé">
                {isEditable
                  ? <Input value={mission.tonnage} onChange={(e) => setMission({ ...mission, tonnage: e.target.value })} placeholder="Ex: 38 tonnes" />
                  : <ReadOnly value={mission.tonnage} />}
              </Field>
            </div>
          </Card>
        </div>

        {/* COLONNE DROITE */}
        <aside className="w-full lg:w-[290px] lg:shrink-0 space-y-4">
          {/* Cycle de vie */}
          <Card title="Cycle de vie">
            <Timeline statut={statut} createdAt={devis?.createdAt} updatedAt={devis?.updatedAt}
              commentaireRefus={devis?.commentaireRefus} />
          </Card>

          {/* Validité */}
          <Card title="Validité">
            <div className="flex flex-wrap gap-1.5">
              {VALIDITE_OPTIONS.map((j) => {
                const active = validiteJours === j;
                return (
                  <button key={j} type="button" disabled={!isEditable}
                    onClick={() => setValiditeJours(j)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[12px] border transition-colors",
                      active
                        ? "bg-[#ECFDF5] border-[#0F6E56] text-[#065F46] font-medium"
                        : "bg-white border-[#E5E7EB] text-muted-foreground hover:border-[#0F6E56]/40",
                      !isEditable && "opacity-70 cursor-not-allowed",
                    )}>
                    {j} j
                  </button>
                );
              })}
            </div>
            <div className={cn(
              "mt-3 text-[12px] flex items-center gap-1.5",
              expireBientot ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              {expireBientot && <AlertTriangle className="h-3.5 w-3.5" />}
              Expire le {formatDate(expirationDate.toISOString())}
            </div>
          </Card>

          {/* Récapitulatif */}
          <Card title="Récapitulatif">
            <div className="space-y-1.5 text-[12px]">
              <Row label="Référence" value={devis?.reference || "—"} compact />
              <Row label="Créé le" value={devis ? formatDate(devis.createdAt) : formatDate(new Date().toISOString())} compact />
              <Row label="Lignes" value={String(lignes.length)} compact />
              {totaux.montantRemise > 0 && (
                <Row label="Remise" value={`- ${formatMontant(totaux.montantRemise)}`} valueClass="text-destructive" compact />
              )}
              <Row label={`TVA (${tauxTva}%)`} value={formatMontant(totaux.montantTva)} compact />
              <div className="border-t border-[#E5E7EB] pt-1.5 mt-1.5 flex justify-between items-center">
                <span className="text-muted-foreground">Total TTC</span>
                <span className="text-[15px] font-medium text-primary">{formatMontant(totaux.montantTotal)}</span>
              </div>
            </div>
          </Card>

          {/* Note interne */}
          <Card title="Note interne">
            <Textarea rows={3} disabled={!isEditable} value={noteInterne}
              onChange={(e) => setNoteInterne(e.target.value)}
              placeholder="Remarques internes, instructions..." />
            <p className="text-[10px] text-muted-foreground mt-1">Invisible sur le PDF généré.</p>
          </Card>

          {/* Actions secondaires */}
          {!isNew && (
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" /> Dupliquer ce devis
              </Button>
              {(statut === "BROUILLON" || statut === "SOUMIS_DG") && (
                <Button size="sm" variant="ghost" className="w-full justify-start bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                  onClick={() => setShowCancelDialog(true)}>
                  <XIcon className="mr-2 h-4 w-4" /> Annuler le devis
                </Button>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* MODALE — Soumettre au DG */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-7 w-7 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">Soumettre ce devis au DG ?</DialogTitle>
            <DialogDescription className="text-center">
              Le directeur recevra une notification et devra valider avant envoi au client.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-[#F9FAFB] p-3 space-y-1 text-sm">
            <Row label="Client" value={selectedClient?.nom || "—"} compact />
            <Row label="Montant" value={formatMontant(totaux.montantTotal)} compact valueClass="text-primary font-medium" />
            <Row label="Lignes" value={String(lignes.length)} compact />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSubmitDialog(false)}>Annuler</Button>
            <Button onClick={handleSubmitToDG} disabled={saving}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE — Refus */}
      <Dialog open={showRefusDialog} onOpenChange={setShowRefusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{refusType === "DG" ? "Refuser le devis" : "Marquer comme refusé par le client"}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Motif (obligatoire)..." rows={4}
            value={commentaireRefus} onChange={(e) => setCommentaireRefus(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefusDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleRefus} disabled={!commentaireRefus.trim()}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALE — Annuler */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le devis sera archivé et ne pourra plus être modifié. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Annuler le devis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODALE — Création opération (réutilise les champs mission) */}
      <Dialog open={showOpDialog} onOpenChange={setShowOpDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle Opération</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Lieu de récupération *">
                <Input value={opForm.lieu_embarquement} onChange={(e) => setOpForm((p) => ({ ...p, lieu_embarquement: e.target.value }))} />
              </Field>
              <Field label="Lieu de livraison *">
                <Input value={opForm.lieu_livraison} onChange={(e) => setOpForm((p) => ({ ...p, lieu_livraison: e.target.value }))} />
              </Field>
              <Field label="Poids (kg)">
                <Input type="number" value={opForm.poids_kg} onChange={(e) => setOpForm((p) => ({ ...p, poids_kg: e.target.value }))} />
              </Field>
              <Field label="Nombre de colis">
                <Input type="number" value={opForm.nombre_colis} onChange={(e) => setOpForm((p) => ({ ...p, nombre_colis: e.target.value }))} />
              </Field>
            </div>
            <Field label="Nature de la marchandise">
              <Input value={opForm.nature_marchandise} onChange={(e) => setOpForm((p) => ({ ...p, nature_marchandise: e.target.value }))} />
            </Field>
            <Field label="Précautions particulières">
              <Textarea rows={2} value={opForm.precautions} onChange={(e) => setOpForm((p) => ({ ...p, precautions: e.target.value }))} />
            </Field>
            <Field label="Commentaires">
              <Textarea rows={2} value={opForm.commentaires} onChange={(e) => setOpForm((p) => ({ ...p, commentaires: e.target.value }))} />
            </Field>
            <Field label="Bon de commande client *">
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                onChange={(e) => setBonCommandeFile(e.target.files?.[0] || null)} />
              {bonCommandeFile ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded border border-primary/30 bg-primary/5">
                  <span className="text-sm truncate">{bonCommandeFile.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => setBonCommandeFile(null)}>
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" type="button" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Choisir un fichier
                </Button>
              )}
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateOperation}>Créer l'opération</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────── Sous-composants ───────────────
function Card({ title, subtitle, action, children }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-4">
      {(title || action) && (
        <div className="flex items-start justify-between mb-3 gap-2">
          <div>
            {title && <div className="text-[13px] font-medium text-[#111827]">{title}</div>}
            {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground font-normal">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnly({ value }: { value: string }) {
  return <div className="text-sm py-1.5 text-foreground">{value || <span className="text-muted-foreground">—</span>}</div>;
}

function Row({ label, value, valueClass, compact }: { label: string; value: string; valueClass?: string; compact?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center", compact ? "" : "py-0.5")}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", valueClass)}>{value}</span>
    </div>
  );
}

// ─────────────── Timeline ───────────────
function Timeline({ statut, createdAt, updatedAt, commentaireRefus }: {
  statut: DevisStatut; createdAt?: string; updatedAt?: string; commentaireRefus?: string;
}) {
  const refused = statut === "REFUSE_DG" || statut === "REFUSE_CLIENT";
  const order: DevisStatut[] = ["BROUILLON", "SOUMIS_DG", "APPROUVE_DG", "ENVOYE_CLIENT", "VALIDE_CLIENT"];
  const idx = order.indexOf(statut);
  const reachedIdx = statut === "REFUSE_DG" ? 1 : statut === "REFUSE_CLIENT" ? 3 : idx;

  const steps = [
    { label: "Brouillon créé", date: createdAt },
    { label: "Soumis au DG", date: statut !== "BROUILLON" ? updatedAt : undefined },
    { label: "Validé par le DG", date: idx >= 2 ? updatedAt : undefined, refusedHere: statut === "REFUSE_DG" },
    { label: "Envoyé au client", date: idx >= 3 ? updatedAt : undefined },
    { label: "Réponse client", date: idx >= 4 ? updatedAt : undefined,
      refusedHere: statut === "REFUSE_CLIENT", validated: statut === "VALIDE_CLIENT" },
  ];

  return (
    <div className="space-y-0">
      {steps.map((s, i) => {
        const reached = i <= reachedIdx;
        const current = i === reachedIdx + 1 && !refused;
        const isRefusedStep = (s as any).refusedHere;
        const isValidatedFinal = (s as any).validated;
        const dotClass = isRefusedStep
          ? "bg-destructive"
          : isValidatedFinal
            ? "bg-success"
            : reached
              ? "bg-primary"
              : current
                ? "bg-warning animate-pulse"
                : "bg-[#D1D5DB]";
        const connectorClass = i < steps.length - 1
          ? (i < reachedIdx ? "bg-primary" : "bg-[#D1D5DB]")
          : "";
        return (
          <div key={i} className="flex gap-3 relative pb-3 last:pb-0">
            <div className="flex flex-col items-center">
              <div className={cn("h-2.5 w-2.5 rounded-full mt-1.5", dotClass)} />
              {i < steps.length - 1 && <div className={cn("w-px flex-1 mt-1", connectorClass)} />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className={cn("text-[12px]", reached || isRefusedStep || isValidatedFinal ? "text-foreground font-medium" : "text-muted-foreground")}>
                {s.label}
              </div>
              {s.date && (reached || isRefusedStep || isValidatedFinal) && (
                <div className="text-[10px] text-muted-foreground">{formatDate(s.date)}</div>
              )}
              {isRefusedStep && commentaireRefus && (
                <div className="mt-1 p-2 rounded bg-destructive/5 border border-destructive/20 text-[11px] text-destructive">
                  {commentaireRefus}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
