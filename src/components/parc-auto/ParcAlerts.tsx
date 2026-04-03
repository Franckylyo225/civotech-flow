import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMaintenancesStore } from "@/hooks/use-maintenances-store";
import { useChauffeursStore } from "@/hooks/use-chauffeurs-store";
import { useParcAutoStore } from "@/hooks/use-parc-auto-store";
import { differenceInDays, format } from "date-fns";

export default function ParcAlerts() {
  const { maintenances } = useMaintenancesStore();
  const { chauffeurs } = useChauffeursStore();
  const { camions } = useParcAutoStore();

  const now = new Date();

  // Maintenances en retard: planifiées ou en cours avec date_prevue dépassée
  const overdueMaintenances = maintenances.filter(m => {
    if (m.statut === "TERMINEE" || m.statut === "ANNULEE") return false;
    return new Date(m.date_prevue) < now;
  });

  // Permis expirant dans 30 jours ou déjà expirés
  const expiringPermis = chauffeurs
    .filter(c => {
      if (!c.date_expiration_permis) return false;
      const days = differenceInDays(new Date(c.date_expiration_permis), now);
      return days <= 30;
    })
    .map(c => ({
      ...c,
      daysLeft: differenceInDays(new Date(c.date_expiration_permis!), now),
    }));

  const getCamionLabel = (id: string) => {
    const c = camions.find(v => v.id === id);
    return c ? c.immatriculation : "—";
  };

  if (overdueMaintenances.length === 0 && expiringPermis.length === 0) return null;

  return (
    <div className="space-y-3">
      {overdueMaintenances.length > 0 && (
        <Alert className="border-warning/50 bg-warning/5">
          <Clock className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning font-semibold">
            {overdueMaintenances.length} maintenance{overdueMaintenances.length > 1 ? "s" : ""} en retard
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-1">
            <ul className="list-disc pl-4 space-y-0.5">
              {overdueMaintenances.slice(0, 5).map(m => (
                <li key={m.id}>
                  <span className="font-medium text-foreground">{getCamionLabel(m.camion_id)}</span>
                  {" — "}{m.description.slice(0, 50)}
                  {" · Prévue le "}{format(new Date(m.date_prevue), "dd/MM/yyyy")}
                  {" ("}{Math.abs(differenceInDays(new Date(m.date_prevue), now))}j de retard)
                </li>
              ))}
              {overdueMaintenances.length > 5 && (
                <li className="text-muted-foreground">… et {overdueMaintenances.length - 5} autre(s)</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {expiringPermis.length > 0 && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive font-semibold">
            {expiringPermis.length} permis de conduire à surveiller
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-1">
            <ul className="list-disc pl-4 space-y-0.5">
              {expiringPermis.slice(0, 5).map(c => (
                <li key={c.id}>
                  <span className="font-medium text-foreground">{c.prenom} {c.nom}</span>
                  {c.daysLeft < 0
                    ? <span className="text-destructive font-medium"> — Expiré depuis {Math.abs(c.daysLeft)}j</span>
                    : <span className="text-warning font-medium"> — Expire dans {c.daysLeft}j ({format(new Date(c.date_expiration_permis!), "dd/MM/yyyy")})</span>
                  }
                </li>
              ))}
              {expiringPermis.length > 5 && (
                <li className="text-muted-foreground">… et {expiringPermis.length - 5} autre(s)</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
