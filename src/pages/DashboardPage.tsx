import { useAuth } from "@/lib/auth-context";
import { useApprobationsStore } from "@/hooks/use-approbations-store";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  FileText, Truck, Receipt, ShoppingCart, TrendingUp,
  ArrowRight, CheckCircle2, ClipboardCheck, Wallet,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function formatK(value: number) {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(0) + "K";
  return value.toString();
}

function formatMontant(value: number) {
  return value.toLocaleString("fr-FR");
}

function trendPercent(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "—";
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string; bg: string }> = {
  devis: { label: "Devis", icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  demande_achat: { label: "Achat", icon: ShoppingCart, color: "text-warning", bg: "bg-warning/10" },
  decaissement: { label: "Décaissement", icon: Wallet, color: "text-info", bg: "bg-info/10" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm" style={{ color: p.color }}>
          {p.name}: {(p.value as number).toLocaleString("fr-FR")} FCFA
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { items: approbations, counts: appCounts } = useApprobationsStore();
  const { stats, operations, chartData, loading } = useDashboardData();

  const caTrend = trendPercent(stats.caMois, stats.caMoisPrecedent);
  const caTrendUp = stats.caMois >= stats.caMoisPrecedent;

  const statCards = [
    { label: "Devis en cours", value: String(stats.devisEnCours), icon: FileText, trend: "", trendUp: true, link: "/devis" },
    { label: "Missions actives", value: String(stats.missionsActives), icon: Truck, trend: "", trendUp: true, link: "/operations" },
    { label: "CA du mois", value: formatMontant(stats.caMois), unit: "FCFA", icon: Receipt, trend: caTrend, trendUp: caTrendUp, link: "/factures" },
    { label: "Validations", value: String(appCounts.total), icon: ClipboardCheck, trend: appCounts.total > 0 ? "en attente" : "à jour", trendUp: appCounts.total === 0, link: "/approbations" },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble de vos activités et revenus
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-lg bg-muted p-2.5">
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                {stat.trend && (
                  stat.trendUp ? (
                    <Badge variant="outline" className="border-0 bg-accent text-accent-foreground text-xs font-medium gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-0 bg-warning/10 text-warning text-xs font-medium">
                      {stat.trend}
                    </Badge>
                  )
                )}
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">
                {loading ? "—" : stat.value}
                {stat.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{stat.unit}</span>}
              </p>
              <Link to={stat.link} className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Voir détails <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overview chart + Approbations */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Vue d'ensemble</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Entrées
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" /> Sorties
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[280px]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Chargement...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                    <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 14% 50%)" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 14% 50%)" }} tickFormatter={formatK} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="entrees" name="Entrées" stroke="hsl(160 64% 40%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(160 64% 40%)" }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="sorties" name="Sorties" stroke="hsl(215 14% 70%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(215 14% 70%)" }} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Approbations
              {appCounts.total > 0 && (
                <Badge variant="outline" className="border-0 bg-destructive/10 text-destructive text-xs ml-1">
                  {appCounts.total}
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/approbations">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {approbations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success/40 mb-2" />
                <p className="text-sm">Aucune demande en attente</p>
              </div>
            ) : (
              approbations.slice(0, 4).map((item) => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.devis;
                return (
                  <Link key={item.id} to="/approbations" className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                    <div className={`mt-0.5 rounded-lg p-2 ${cfg.bg}`}>
                      <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{item.reference}</span>
                        <Badge variant="outline" className={`border-0 text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-0.5 truncate">{item.titre}</p>
                      <p className="text-sm font-semibold text-primary mt-0.5">
                        {item.montant.toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operations en cours */}
      <Card className="border border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Opérations en cours</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
            <Link to="/operations">Voir tout <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>
          ) : operations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Aucune opération en cours</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-xs font-medium text-muted-foreground">Référence</th>
                    <th className="pb-3 text-left text-xs font-medium text-muted-foreground">Client</th>
                    <th className="pb-3 text-left text-xs font-medium text-muted-foreground">Trajet</th>
                    <th className="pb-3 text-left text-xs font-medium text-muted-foreground">Camion</th>
                    <th className="pb-3 text-left text-xs font-medium text-muted-foreground">Chauffeur</th>
                    <th className="pb-3 text-left text-xs font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {operations.map((op) => (
                    <tr key={op.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="text-sm font-mono font-medium text-foreground">{op.reference}</span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-foreground">{op.client_nom}</td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">{op.trajet}</td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">{op.camion}</td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">{op.chauffeur}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={cn("border-0 text-xs font-medium",
                          op.statut === "EN_COURS"
                            ? "bg-accent text-accent-foreground"
                            : "bg-warning/10 text-warning"
                        )}>
                          {op.statut === "EN_COURS" ? "En cours" : "Planifiée"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
