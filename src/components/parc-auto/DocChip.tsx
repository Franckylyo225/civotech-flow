import { getDocStatus, type DocStatus } from "@/lib/vehicule-docs";

const STYLES: Record<DocStatus, { bg: string; color: string }> = {
  ok: { bg: "#EAF3DE", color: "#27500A" },
  warning: { bg: "#FAEEDA", color: "#633806" },
  expired: { bg: "#FCEBEB", color: "#791F1F" },
  missing: { bg: "#F3F4F6", color: "#6B7280" },
};

export function DocChip({ label, date }: { label: string; date?: string | null }) {
  const { status, days } = getDocStatus(date);
  const s = STYLES[status];
  let text = `${label} —`;
  if (status === "missing") text = `${label} —`;
  else if (status === "expired") text = `${label} exp.`;
  else if (status === "warning") text = `${label} ${days}j`;
  else text = `${label} OK`;
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {text}
    </span>
  );
}
