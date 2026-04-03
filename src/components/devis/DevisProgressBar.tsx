import { PIPELINE_STAGES, DEVIS_STATUT_CONFIG, type DevisStatut } from "@/types/devis";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface DevisProgressBarProps {
  statut: DevisStatut;
  className?: string;
}

export function DevisProgressBar({ statut, className }: DevisProgressBarProps) {
  const isRefused = statut === "REFUSE_DG" || statut === "REFUSE_CLIENT";
  const currentIndex = PIPELINE_STAGES.indexOf(statut);
  const progress = isRefused ? -1 : currentIndex;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {PIPELINE_STAGES.map((stage, i) => {
        const done = !isRefused && i <= progress;
        const active = !isRefused && i === progress;
        return (
          <div key={stage} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "h-1.5 w-full rounded-full transition-all",
                  done ? "bg-primary" : isRefused ? "bg-destructive/30" : "bg-muted"
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DevisProgressLabel({ statut }: { statut: DevisStatut }) {
  const isRefused = statut === "REFUSE_DG" || statut === "REFUSE_CLIENT";
  const currentIndex = PIPELINE_STAGES.indexOf(statut);
  const stepsTotal = PIPELINE_STAGES.length;
  const stepsDone = isRefused ? 0 : currentIndex + 1;

  if (isRefused) {
    return (
      <span className="text-xs text-destructive font-medium">Refusé</span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">
      Étape {stepsDone}/{stepsTotal} — {DEVIS_STATUT_CONFIG[statut]?.label}
    </span>
  );
}
