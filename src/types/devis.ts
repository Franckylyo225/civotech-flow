export type DevisStatut =
  | "BROUILLON"
  | "SOUMIS_DG"
  | "APPROUVE_DG"
  | "REFUSE_DG"
  | "ENVOYE_CLIENT"
  | "VALIDE_CLIENT"
  | "REFUSE_CLIENT";

export interface LigneDevis {
  id: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface Client {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  pays: string;
}

export interface Devis {
  id: string;
  reference: string;
  clientId: string;
  client: Client;
  lignes: LigneDevis[];
  montantTotal: number;
  statut: DevisStatut;
  commentaireRefus?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const DEVIS_STATUT_CONFIG: Record<DevisStatut, { label: string; color: string; bgColor: string }> = {
  BROUILLON: { label: "Brouillon", color: "text-muted-foreground", bgColor: "bg-muted" },
  SOUMIS_DG: { label: "Soumis au DG", color: "text-warning", bgColor: "bg-warning/10" },
  APPROUVE_DG: { label: "Approuvé DG", color: "text-success", bgColor: "bg-success/10" },
  REFUSE_DG: { label: "Refusé DG", color: "text-destructive", bgColor: "bg-destructive/10" },
  ENVOYE_CLIENT: { label: "Envoyé client", color: "text-primary", bgColor: "bg-primary/10" },
  VALIDE_CLIENT: { label: "Validé client", color: "text-success", bgColor: "bg-success/10" },
  REFUSE_CLIENT: { label: "Refusé client", color: "text-destructive", bgColor: "bg-destructive/10" },
};

export const PIPELINE_STAGES: DevisStatut[] = [
  "BROUILLON",
  "SOUMIS_DG",
  "APPROUVE_DG",
  "ENVOYE_CLIENT",
  "VALIDE_CLIENT",
];

export function formatMontant(montant: number): string {
  return montant.toLocaleString("fr-FR") + " FCFA";
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
