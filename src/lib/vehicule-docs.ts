import { differenceInDays } from "date-fns";

export type DocStatus = "ok" | "warning" | "expired" | "missing";

export function getDocStatus(date?: string | null, today: Date = new Date()): { status: DocStatus; days: number | null } {
  if (!date) return { status: "missing", days: null };
  const d = new Date(date);
  if (isNaN(d.getTime())) return { status: "missing", days: null };
  const days = differenceInDays(d, today);
  if (days < 0) return { status: "expired", days };
  if (days < 30) return { status: "warning", days };
  return { status: "ok", days };
}

export function vehiculeHasExpiringDoc(v: { date_assurance?: string | null; date_visite_tech?: string | null; date_vignette?: string | null }, today: Date = new Date()): boolean {
  const dates = [v.date_assurance, v.date_visite_tech, v.date_vignette];
  return dates.some(d => {
    const s = getDocStatus(d, today).status;
    return s === "warning" || s === "expired";
  });
}

export function vehiculeHasExpiredDoc(v: { date_assurance?: string | null; date_visite_tech?: string | null; date_vignette?: string | null }, today: Date = new Date()): boolean {
  return [v.date_assurance, v.date_visite_tech, v.date_vignette].some(d => getDocStatus(d, today).status === "expired");
}

export function pctVieUtile(km_actuel: number, km_max: number): number {
  if (!km_max || km_max <= 0) return 0;
  return Math.min(100, Math.round((km_actuel / km_max) * 100));
}

export function vieUtileColor(pct: number): { bar: string; text: string } {
  if (pct < 40) return { bar: "bg-success", text: "text-success" };
  if (pct < 70) return { bar: "bg-warning", text: "text-warning" };
  return { bar: "bg-destructive", text: "text-destructive" };
}
