import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatFCFA } from "@/utils/format";
import { TrendingDown, TrendingUp } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: "fcfa" | "pct" | "count";
  evolution?: number;
  evolutionLabel?: string;
  icon?: React.ReactNode;
}

export function KpiCard({ label, value, unit, evolution, evolutionLabel, icon }: KpiCardProps) {
  const formatted =
    typeof value === "number"
      ? unit === "fcfa"
        ? formatFCFA(value)
        : unit === "pct"
        ? `${Math.round(value * 10) / 10}%`
        : value.toLocaleString("fr-FR")
      : value;

  const showEvol = typeof evolution === "number" && Number.isFinite(evolution);
  const positive = (evolution ?? 0) > 0;
  const negative = (evolution ?? 0) < 0;

  return (
    <Card className="border border-border shadow-none rounded-[10px] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-xl font-bold text-foreground tabular-nums">{formatted}</p>
      {showEvol && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
            positive && "bg-success/10 text-success",
            negative && "bg-destructive/10 text-destructive",
            !positive && !negative && "bg-muted text-muted-foreground",
          )}
        >
          {positive ? <TrendingUp className="h-3 w-3" /> : negative ? <TrendingDown className="h-3 w-3" /> : null}
          {Math.abs(Math.round(evolution! * 10) / 10)}%
          {evolutionLabel && <span className="text-muted-foreground/80 ml-1">{evolutionLabel}</span>}
        </div>
      )}
    </Card>
  );
}
