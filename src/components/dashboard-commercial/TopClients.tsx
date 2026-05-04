import { formatFCFA, truncate } from "@/utils/format";

interface TopClient {
  id: string;
  nom: string;
  total: number;
}

export function TopClients({ clients }: { clients: TopClient[] }) {
  if (!clients.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Aucun client validé sur la période</p>;
  }
  const max = clients[0].total || 1;
  return (
    <div className="space-y-3">
      {clients.map((c) => {
        const pct = (c.total / max) * 100;
        return (
          <div key={c.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium" title={c.nom}>
                {truncate(c.nom, 18)}
              </span>
              <span className="text-foreground tabular-nums font-semibold">{formatFCFA(c.total)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
