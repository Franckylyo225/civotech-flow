import { formatFCFA } from "@/utils/format";
import { cn } from "@/lib/utils";

interface PipelineDevisProps {
  pipeline: {
    brouillon: number;
    soumis: number;
    envoye: number;
    valide: number;
    refuse: number;
    valeurTotale: number;
  };
}

const COLS = [
  { key: "brouillon", label: "Brouillon", classes: "bg-muted text-muted-foreground" },
  { key: "soumis", label: "Attente DG", classes: "bg-warning/10 text-warning" },
  { key: "envoye", label: "Envoyé client", classes: "bg-info/10 text-info" },
  { key: "valide", label: "Validé", classes: "bg-success/10 text-success" },
  { key: "refuse", label: "Refusé", classes: "bg-destructive/10 text-destructive" },
] as const;

export function PipelineDevis({ pipeline }: PipelineDevisProps) {
  const total = COLS.reduce((s, c) => s + (pipeline[c.key] || 0), 0);
  return (
    <div>
      <div className="grid grid-cols-5 gap-3">
        {COLS.map((c) => {
          const v = pipeline[c.key] || 0;
          const pct = total > 0 ? Math.round((v / total) * 100) : 0;
          return (
            <div key={c.key} className={cn("rounded-lg p-3 text-center", c.classes)}>
              <p className="text-2xl font-bold tabular-nums">{v}</p>
              <p className="mt-0.5 text-xs font-medium">{c.label}</p>
              <p className="text-[10px] opacity-80 mt-0.5">{pct}%</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Valeur totale en pipeline :{" "}
        <span className="font-semibold text-foreground">{formatFCFA(pipeline.valeurTotale)}</span>
      </p>
    </div>
  );
}
