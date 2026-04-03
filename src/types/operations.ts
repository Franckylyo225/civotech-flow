export type OperationStatut = "DEMANDE" | "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "ARCHIVEE";
export type CategorieDepense = "CARBURANT" | "PEAGE" | "TAXE" | "AUTRE";
export type TypeIncident = "PANNE" | "ACCIDENT" | "RETARD" | "VOL" | "AUTRE";
export type GraviteIncident = "FAIBLE" | "MOYENNE" | "CRITIQUE";

export interface Camion {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  capaciteTonnes: number;
  annee: number;
  statut: "DISPONIBLE" | "EN_MISSION" | "EN_MAINTENANCE";
}

export interface Chauffeur {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  numeroPermis: string;
  disponible: boolean;
}

export interface LigneDepense {
  id: string;
  operationId: string;
  categorie: CategorieDepense;
  description: string;
  montant: number;
  date: string;
}

export interface Incident {
  id: string;
  operationId: string;
  type: TypeIncident;
  description: string;
  gravite: GraviteIncident;
  dateIncident: string;
  resolu: boolean;
  createdAt: string;
}

export interface Operation {
  id: string;
  reference: string;
  devisReference?: string;
  clientNom: string;
  camionId?: string;
  camion?: Camion;
  chauffeurId?: string;
  chauffeur?: Chauffeur;
  lieuEmbarquement: string;
  lieuLivraison: string;
  dateDepart?: string;
  dateLivraisonEstimee?: string;
  dateLivraisonReelle?: string;
  dureeEstimeeHeures?: number;
  statut: OperationStatut;
  bonLivraisonUrl?: string;
  depenses: LigneDepense[];
  montantDevis: number;
  poidsKg?: number;
  nombreColis?: number;
  natureMarchandise?: string;
  precautions?: string;
  commentaires?: string;
  createdAt: string;
  updatedAt: string;
  incidents: Incident[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  heure: string;
  titre: string;
  description: string;
  statut: "done" | "current" | "pending";
}

export const OPERATION_STATUT_CONFIG: Record<OperationStatut, { label: string; color: string; bgColor: string }> = {
  DEMANDE: { label: "Demande", color: "text-orange-600", bgColor: "bg-orange-50" },
  PLANIFIEE: { label: "Planifiée", color: "text-warning", bgColor: "bg-warning/10" },
  EN_COURS: { label: "En transit", color: "text-info", bgColor: "bg-info/10" },
  TERMINEE: { label: "Livrée", color: "text-success", bgColor: "bg-success/10" },
  ARCHIVEE: { label: "Archivée", color: "text-muted-foreground", bgColor: "bg-muted" },
};

export const CATEGORIE_DEPENSE_CONFIG: Record<CategorieDepense, { label: string }> = {
  CARBURANT: { label: "Carburant" },
  PEAGE: { label: "Péage" },
  TAXE: { label: "Taxe" },
  AUTRE: { label: "Autre" },
};

export const TYPE_INCIDENT_CONFIG: Record<TypeIncident, { label: string; icon: string }> = {
  PANNE: { label: "Panne", icon: "🔧" },
  ACCIDENT: { label: "Accident", icon: "💥" },
  RETARD: { label: "Retard", icon: "⏰" },
  VOL: { label: "Vol", icon: "🚨" },
  AUTRE: { label: "Autre", icon: "⚠️" },
};

export const GRAVITE_CONFIG: Record<GraviteIncident, { label: string; color: string; bgColor: string }> = {
  FAIBLE: { label: "Faible", color: "text-info", bgColor: "bg-info/10" },
  MOYENNE: { label: "Moyenne", color: "text-warning", bgColor: "bg-warning/10" },
  CRITIQUE: { label: "Critique", color: "text-destructive", bgColor: "bg-destructive/10" },
};

export function formatMontantOp(montant: number): string {
  return montant.toLocaleString("fr-FR") + " FCFA";
}

export function formatDateOp(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
