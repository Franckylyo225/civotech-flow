import { useNavigate } from "react-router-dom";
import { formatRelativeTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Alerte } from "@/hooks/use-dashboard-commercial";

const DOT: Record<Alerte["niveau"], string> = {
  DANGER: "bg-destructive",
  WARNING: "bg-warning",
  INFO: "bg-info",
  SUCCESS: "bg-success",
};

export function AlertesCommercial({ alertes }: { alertes: Alerte[] }) {
  const navigate = useNavigate();
  if (!alertes.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Aucune alerte</p>;
  }
  return (
    <div className="space-y-2">
      {alertes.map((a) => (
        <button
          key={a.id}
          onClick={() => a.lien && navigate(a.lien)}
          className="w-full text-left flex items-start gap-3 rounded-lg border border-border p-2.5 hover:bg-muted/50 transition-colors"
        >
          <span className={cn("mt-1.5 h-2 w-2 rounded-full flex-shrink-0", DOT[a.niveau])} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-medium">{a.message}</p>
            {a.sousTexte && <p className="text-xs text-muted-foreground mt-0.5">{a.sousTexte}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(a.date)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
