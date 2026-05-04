import { formatFCFACompact } from "@/utils/format";

interface SparklineCAProps {
  data: { mois: string; caFCFA: number }[];
}

export function SparklineCA({ data }: SparklineCAProps) {
  const max = Math.max(1, ...data.map((d) => d.caFCFA));
  return (
    <div>
      <div className="flex items-end gap-2 h-[80px]">
        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          const h = Math.max(4, (d.caFCFA / max) * 80);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t"
                style={{
                  height: `${h}px`,
                  backgroundColor: isLast ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.3)",
                }}
                title={formatFCFACompact(d.caFCFA)}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">
            {d.mois}
          </div>
        ))}
      </div>
    </div>
  );
}
