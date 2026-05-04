import { formatFCFA } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { SuiviPaiement } from "@/hooks/use-dashboard-commercial";

const STATUT_CLASS: Record<SuiviPaiement["statut"], string> = {
  PAYEE: "bg-success/10 text-success",
  EN_ATTENTE: "bg-warning/10 text-warning",
  EN_RETARD: "bg-destructive/10 text-destructive",
};
const STATUT_LABEL: Record<SuiviPaiement["statut"], string> = {
  PAYEE: "Payée",
  EN_ATTENTE: "En attente",
  EN_RETARD: "En retard",
};

export function SuiviPaiements({ paiements }: { paiements: SuiviPaiement[] }) {
  if (!paiements.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Aucune facture récente</p>;
  }
  return (
    <div className="space-y-2">
      {paiements.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{p.reference}</span>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", STATUT_CLASS[p.statut])}>
                {STATUT_LABEL[p.statut]}
              </span>
            </div>
            <p className="text-sm text-foreground truncate mt-0.5">{p.client}</p>
            {p.statut === "EN_RETARD" && p.joursRetard ? (
              <p className="text-[11px] text-destructive font-medium mt-0.5">
                {p.joursRetard} jour{p.joursRetard > 1 ? "s" : ""} de retard
              </p>
            ) : null}
          </div>
          <span className="text-sm font-semibold text-success tabular-nums whitespace-nowrap">
            {formatFCFA(p.montant)}
          </span>
        </div>
      ))}
    </div>
  );
}
