import { AlertTriangle } from "lucide-react";
import { useMaintenancesStore } from "@/hooks/use-maintenances-store";
import { useParcAutoStore } from "@/hooks/use-parc-auto-store";
import { differenceInDays, format } from "date-fns";
import { getDocStatus } from "@/lib/vehicule-docs";

export default function ParcAlerts() {
  const { maintenances } = useMaintenancesStore();
  const { camions } = useParcAutoStore();
  const now = new Date();

  const overdueMaintenances = maintenances.filter(m => {
    if (m.statut === "TERMINEE" || m.statut === "ANNULEE") return false;
    return new Date(m.date_prevue) < now;
  });

  const expiringDocs: { camion: string; type: string; days: number }[] = [];
  camions.forEach(c => {
    [
      { type: "Assurance", date: c.date_assurance },
      { type: "Visite tech.", date: c.date_visite_tech },
      { type: "Vignette", date: c.date_vignette },
    ].forEach(d => {
      const s = getDocStatus(d.date, now);
      if (s.status === "warning" || s.status === "expired") {
        expiringDocs.push({ camion: c.immatriculation, type: d.type, days: s.days ?? 0 });
      }
    });
  });

  if (overdueMaintenances.length === 0 && expiringDocs.length === 0) return null;

  const getCamionLabel = (id: string) => camions.find(v => v.id === id)?.immatriculation || "—";

  const maintDetail = overdueMaintenances.slice(0, 2).map(m =>
    `${getCamionLabel(m.camion_id)} (${Math.abs(differenceInDays(new Date(m.date_prevue), now))}j)`
  ).join(", ") + (overdueMaintenances.length > 2 ? ` +${overdueMaintenances.length - 2}` : "");

  const docDetail = expiringDocs.slice(0, 2).map(d =>
    `${d.camion} ${d.type} ${d.days < 0 ? `exp.` : `${d.days}j`}`
  ).join(", ") + (expiringDocs.length > 2 ? ` +${expiringDocs.length - 2}` : "");

  return (
    <div
      className="flex items-start gap-3 rounded-md border p-3 text-sm"
      style={{ background: "#FCEBEB", borderColor: "#F09595" }}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#791F1F" }} />
      <div className="text-[13px] leading-snug" style={{ color: "#791F1F" }}>
        {overdueMaintenances.length > 0 && (
          <span>
            <strong>{overdueMaintenances.length} maintenance{overdueMaintenances.length > 1 ? "s" : ""} en retard</strong> · {maintDetail}
          </span>
        )}
        {overdueMaintenances.length > 0 && expiringDocs.length > 0 && <span className="mx-2">·</span>}
        {expiringDocs.length > 0 && (
          <span>
            <strong>{expiringDocs.length} document{expiringDocs.length > 1 ? "s" : ""} expirant</strong> · {docDetail}
          </span>
        )}
      </div>
    </div>
  );
}
