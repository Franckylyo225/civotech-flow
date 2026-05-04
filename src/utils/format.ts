import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const formatFCFA = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n || 0) + " FCFA";

export const formatFCFACompact = (n: number): string => {
  const v = n || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M FCFA";
  if (v >= 1_000) return Math.round(v / 1000) + "k FCFA";
  return formatFCFA(v);
};

export const formatPct = (n: number): string => Math.round(n * 10) / 10 + "%";

export const formatRelativeTime = (date: string | Date): string => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
};

export const truncate = (s: string, max = 12): string =>
  s.length > max ? s.slice(0, max) + "…" : s;
