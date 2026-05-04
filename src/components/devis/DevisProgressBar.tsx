import { type DevisStatut } from "@/types/devis";
import { cn } from "@/lib/utils";

interface DevisProgressBarProps {
  statut: DevisStatut;
  className?: string;
}

const TOTAL_STEPS = 5;

/**
 * Mapping métier (5 étapes du workflow devis) :
 *  - Brouillon      → étape 1 colorée
 *  - Attente DG     → étapes 1-2 colorées (SOUMIS_DG ou APPROUVE_DG)
 *  - Envoyé client  → étapes 1-3 colorées
 *  - Validé client  → étapes 1-5 colorées
 *  - Refusé         → étapes 1-3 colorées en rouge (REFUSE_DG ou REFUSE_CLIENT)
 *  - Archivé        → étapes 1-5 colorées
 */
export function getDevisProgress(statut: DevisStatut): { done: number; refused: boolean } {
  switch (statut) {
    case "BROUILLON": return { done: 1, refused: false };
    case "SOUMIS_DG":
    case "APPROUVE_DG": return { done: 2, refused: false };
    case "ENVOYE_CLIENT": return { done: 3, refused: false };
    case "VALIDE_CLIENT":
    case "ARCHIVE": return { done: 5, refused: false };
    case "REFUSE_DG":
    case "REFUSE_CLIENT": return { done: 3, refused: true };
  }
}

export function DevisProgressBar({ statut, className }: DevisProgressBarProps) {
  const { done, refused } = getDevisProgress(statut);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const filled = i < done;
        return (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              filled
                ? refused ? "bg-destructive" : "bg-primary"
                : "bg-muted",
            )}
          />
        );
      })}
    </div>
  );
}

export function DevisProgressLabel({ statut }: { statut: DevisStatut }) {
  const { done, refused } = getDevisProgress(statut);

  if (refused) {
    return <span className="text-xs text-destructive font-medium">Refusé</span>;
  }

  const labels: Record<DevisStatut, string> = {
    BROUILLON: "Brouillon",
    SOUMIS_DG: "Attente DG",
    APPROUVE_DG: "Attente DG",
    ENVOYE_CLIENT: "Envoyé client",
    VALIDE_CLIENT: "Validé client",
    ARCHIVE: "Archivé",
    REFUSE_DG: "Refusé",
    REFUSE_CLIENT: "Refusé",
  };

  return (
    <span className="text-xs text-muted-foreground">
      Étape {done}/{TOTAL_STEPS} — {labels[statut]}
    </span>
  );
}
