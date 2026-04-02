import { useAuth } from "@/lib/auth-context";
import { roleLabels } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Truck, Receipt, ShoppingCart, TrendingUp, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

const statCards = [
  { label: "Devis en cours", value: "12", icon: FileText, trend: "+3 ce mois" },
  { label: "Missions actives", value: "5", icon: Truck, trend: "2 en attente" },
  { label: "Factures impayées", value: "2 450 000 FCFA", icon: Receipt, trend: "3 factures" },
  { label: "Demandes d'achat", value: "4", icon: ShoppingCart, trend: "2 en attente DG" },
];

const recentActivity = [
  { icon: CheckCircle2, text: "Devis DEV-2025-012 approuvé par le DG", time: "Il y a 2h", variant: "success" as const },
  { icon: Truck, text: "Opération OP-2025-008 démarrée — Abidjan → Bouaké", time: "Il y a 3h", variant: "primary" as const },
  { icon: AlertTriangle, text: "Maintenance urgente — Camion AB-1234-CI", time: "Il y a 5h", variant: "warning" as const },
  { icon: Clock, text: "Facture FAC-2025-005 en attente de paiement", time: "Hier", variant: "muted" as const },
];

const variantStyles = {
  success: "text-success bg-success/10",
  primary: "text-primary bg-primary/10",
  warning: "text-warning bg-warning/10",
  muted: "text-muted-foreground bg-muted",
};

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bonjour, {user?.prenom} 👋
        </h1>
        <p className="text-muted-foreground">
          {roleLabels[user?.role || "DG"]} — Voici votre vue d'ensemble
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activité récente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`rounded-lg p-2 ${variantStyles[item.variant]}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{item.text}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
