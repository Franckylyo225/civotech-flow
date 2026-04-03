export type DevisStatut =
  | "BROUILLON"
  | "SOUMIS_DG"
  | "APPROUVE_DG"
  | "REFUSE_DG"
  | "ENVOYE_CLIENT"
  | "VALIDE_CLIENT"
  | "REFUSE_CLIENT"
  | "ARCHIVE";

export type TypeRemise = "POURCENTAGE" | "MONTANT";

export interface LigneDevis {
  id: string;
  devisId: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface Client {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  contact: string | null;
  created_at?: string;
}

export interface Devis {
  id: string;
  reference: string;
  clientId: string | null;
  client?: Client;
  lignes: LigneDevis[];
  montantHT: number;
  tauxTva: number;
  montantTva: number;
  typeRemise: TypeRemise;
  valeurRemise: number;
  montantRemise: number;
  montantTotal: number;
  statut: DevisStatut;
  commentaireRefus?: string;
  description?: string;
  commercialId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDevisData {
  clientId: string;
  lignes: { description: string; quantite: number; prixUnitaire: number }[];
  tauxTva: number;
  typeRemise: TypeRemise;
  valeurRemise: number;
}

export const DEVIS_STATUT_CONFIG: Record<DevisStatut, { label: string; color: string; bgColor: string }> = {
  BROUILLON: { label: "Brouillon", color: "text-muted-foreground", bgColor: "bg-muted" },
  SOUMIS_DG: { label: "Soumis au DG", color: "text-warning", bgColor: "bg-warning/10" },
  APPROUVE_DG: { label: "Approuvé DG", color: "text-success", bgColor: "bg-success/10" },
  REFUSE_DG: { label: "Refusé DG", color: "text-destructive", bgColor: "bg-destructive/10" },
  ENVOYE_CLIENT: { label: "Envoyé client", color: "text-primary", bgColor: "bg-primary/10" },
  VALIDE_CLIENT: { label: "Validé client", color: "text-success", bgColor: "bg-success/10" },
  REFUSE_CLIENT: { label: "Refusé client", color: "text-destructive", bgColor: "bg-destructive/10" },
  ARCHIVE: { label: "Archivé", color: "text-muted-foreground", bgColor: "bg-muted/50" },
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

export function calculeDevisTotaux(
  lignes: { quantite: number; prixUnitaire: number }[],
  tauxTva: number,
  typeRemise: TypeRemise,
  valeurRemise: number
) {
  const montantHT = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const montantRemise =
    typeRemise === "POURCENTAGE"
      ? Math.round((montantHT * valeurRemise) / 100)
      : valeurRemise;
  const baseApresRemise = Math.max(0, montantHT - montantRemise);
  const montantTva = Math.round((baseApresRemise * tauxTva) / 100);
  const montantTotal = baseApresRemise + montantTva;
  return { montantHT, montantRemise, montantTva, montantTotal };
}
