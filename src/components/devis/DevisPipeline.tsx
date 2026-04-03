import { DEVIS_STATUT_CONFIG, PIPELINE_STAGES, formatMontant, type Devis } from "@/types/devis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DevisPipelineProps {
  devisList: Devis[];
  onSelectDevis: (id: string) => void;
}

export function DevisPipeline({ devisList, onSelectDevis }: DevisPipelineProps) {
  return (
    <div className="grid grid-cols-5 gap-3 overflow-x-auto">
      {PIPELINE_STAGES.map((stage) => {
        const config = DEVIS_STATUT_CONFIG[stage];
        const items = devisList.filter((d) => d.statut === stage);
        return (
          <div key={stage} className="min-w-[220px]">
            <div className={cn("mb-3 flex items-center gap-2 rounded-lg px-3 py-2", config.bgColor)}>
              <span className={cn("text-sm font-semibold", config.color)}>{config.label}</span>
              <span className={cn("ml-auto flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold", config.bgColor, config.color)}>
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((devis) => (
                <Card
                  key={devis.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => onSelectDevis(devis.id)}
                >
                  <CardContent className="p-3">
                    <p className="text-xs font-mono text-muted-foreground">{devis.reference}</p>
                    <p className="mt-1 text-sm font-medium text-foreground truncate">{devis.client?.nom || "—"}</p>
                    <p className="mt-1 text-sm font-semibold text-primary">{formatMontant(devis.montantTotal)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{devis.lignes.length} ligne(s)</p>
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Aucun devis
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
