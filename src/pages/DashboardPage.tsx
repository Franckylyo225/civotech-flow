import { useAuth } from "@/lib/auth-context";
import { roleLabels } from "@/lib/roles";
import { useApprobationsStore } from "@/hooks/use-approbations-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  FileText, Truck, Receipt, ShoppingCart, TrendingUp, TrendingDown,
  ArrowRight, CheckCircle2, XCircle, Clock, Eye, ClipboardCheck, Wallet,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";

// --- Mock data ---
const overviewData = [
  { mois: "Jan", entrees: 4200000, sorties: 1800000 },
  { mois: "Fév", entrees: 3800000, sorties: 2100000 },
  { mois: "Mar", entrees: 5100000, sorties: 2400000 },
  { mois: "Avr", entrees: 6200000, sorties: 2800000 },
  { mois: "Mai", entrees: 5800000, sorties: 3100000 },
  { mois: "Jun", entrees: 7100000, sorties: 2600000 },
];

const operationsEnCours = [
  { id: 1, reference: "OP-2025-005", client: "Orange CI", trajet: "Abidjan → Korhogo", camion: "AB-1234-CI", chauffeur: "Koné Ibrahim", statut: "EN_COURS" as const, progression: 65 },
  { id: 2, reference: "OP-2025-006", client: "SOTRA", trajet: "Abidjan → Bouaké", camion: "AB-5678-CI", chauffeur: "Traoré Moussa", statut: "EN_COURS" as const, progression: 30 },
  { id: 3, reference: "OP-2025-007", client: "Cargill CI", trajet: "San Pedro → Abidjan", camion: "AB-9012-CI", chauffeur: "Diallo Seydou", statut: "PLANIFIEE" as const, progression: 0 },
];

const statCards = [
  { label: "Devis en cours", value: "12", icon: FileText, trend: "+15%", trendUp: true, link: "Voir détails" },
  { label: "Missions actives", value: "5", icon: Truck, trend: "+10%", trendUp: true, link: "Voir détails" },
  { label: "CA du mois", value: "7 100 000", unit: "FCFA", icon: Receipt, trend: "+28%", trendUp: true, link: "Voir détails" },
  { label: "Validations", value: "—", icon: ShoppingCart, trend: "en attente", trendUp: false, link: "Voir détails" },
];

function formatK(value: number) {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(0) + "K";
  return value.toString();
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
      <p className="text-sm font-semibold text-foreground mb-1">{label} 2025</p>
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

  // Override validations stat card with real count
  const dynamicStatCards = statCards.map(s =>
    s.label === "Validations" ? { ...s, value: String(appCounts.total), trend: appCounts.total > 0 ? "en attente" : "à jour", trendUp: appCounts.total === 0 } : s
  );
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
        {dynamicStatCards.map((stat) => (
          <Card key={stat.label} className="border border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-lg bg-muted p-2.5">
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                {stat.trendUp ? (
                  <Badge variant="outline" className="border-0 bg-accent text-accent-foreground text-xs font-medium gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-0 bg-warning/10 text-warning text-xs font-medium">
                    {stat.trend}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">
                {stat.value}
                {stat.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{stat.unit}</span>}
              </p>
              <button className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                {stat.link} <ArrowRight className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overview chart + Validations */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Chart */}
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overviewData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 14% 50%)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 14% 50%)" }} tickFormatter={formatK} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="entrees" name="Entrées" stroke="hsl(160 64% 40%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(160 64% 40%)" }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="sorties" name="Sorties" stroke="hsl(215 14% 70%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(215 14% 70%)" }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Validation requests */}
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Demandes de validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {validationRequests.map((req) => (
              <div key={req.id} className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                <div className={`mt-0.5 rounded-lg p-2 ${req.type === "devis" ? "bg-accent" : "bg-warning/10"}`}>
                  {req.type === "devis" ? (
                    <FileText className={`h-4 w-4 ${req.type === "devis" ? "text-primary" : "text-warning"}`} />
                  ) : (
                    <ShoppingCart className="h-4 w-4 text-warning" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{req.reference}</span>
                    <Badge variant="outline" className="border-0 bg-warning/10 text-warning text-[10px]">
                      En attente
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">{req.titre}</p>
                  <p className="text-sm font-semibold text-primary mt-0.5">
                    {req.montant.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button className="rounded-lg p-1.5 text-success hover:bg-success/10 transition-colors" title="Approuver">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors" title="Refuser">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Operations en cours */}
      <Card className="border border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Opérations en cours</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
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
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground">Progression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {operationsEnCours.map((op) => (
                  <tr key={op.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-sm font-mono font-medium text-foreground">{op.reference}</span>
                    </td>
                    <td className="py-3 pr-4 text-sm text-foreground">{op.client}</td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{op.trajet}</td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{op.camion}</td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{op.chauffeur}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className={`border-0 text-xs font-medium ${
                        op.statut === "EN_COURS"
                          ? "bg-accent text-accent-foreground"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {op.statut === "EN_COURS" ? "En cours" : "Planifiée"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${op.progression}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{op.progression}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
