import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDashboardCommercial, type Periode } from "@/hooks/use-dashboard-commercial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard-commercial/KpiCard";
import { SparklineCA } from "@/components/dashboard-commercial/SparklineCA";
import { PipelineDevis } from "@/components/dashboard-commercial/PipelineDevis";
import { TopClients } from "@/components/dashboard-commercial/TopClients";
import { SuiviPaiements } from "@/components/dashboard-commercial/SuiviPaiements";
import { AlertesCommercial } from "@/components/dashboard-commercial/AlertesCommercial";
import { formatFCFA } from "@/utils/format";
import { Download, FileText, CheckCircle2, Target, ShoppingBag, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PERIODES: { key: Periode; label: string }[] = [
  { key: "7jours", label: "7 jours" },
  { key: "mois", label: "Ce mois" },
  { key: "trimestre", label: "Trimestre" },
  { key: "annee", label: "Année" },
];

export default function DashboardCommercial() {
  const { user } = useAuth();
  const [periode, setPeriode] = useState<Periode>("mois");
  const { data, isLoading, isError, refetch } = useDashboardCommercial(periode, user?.id);

  const handleExport = () => {
    if (!data) return;
    try {
      const doc = new jsPDF();
      const periodeLabel = PERIODES.find((p) => p.key === periode)?.label || "";
      doc.setFontSize(16);
      doc.text(`Tableau de bord commercial — ${periodeLabel}`, 14, 18);
      doc.setFontSize(10);
      doc.text(`${user?.prenom || ""} ${user?.nom || ""}`, 14, 26);
      doc.text(`Édité le ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`, 14, 32);

      autoTable(doc, {
        startY: 40,
        head: [["Indicateur", "Valeur"]],
        body: [
          ["CA signé", formatFCFA(data.kpis.caSigne)],
          ["Évolution CA", `${Math.round(data.kpis.evolutionCaPct * 10) / 10}%`],
          ["Devis créés", String(data.kpis.nbDevisTotal)],
          ["Devis validés", String(data.kpis.nbDevisValides)],
          ["Taux de conversion", `${Math.round(data.kpis.tauxConversion * 10) / 10}%`],
          ["Panier moyen", formatFCFA(data.kpis.panierMoyen)],
          ["Valeur en pipeline", formatFCFA(data.pipeline.valeurTotale)],
        ],
      });

      if (data.topClients.length) {
        autoTable(doc, {
          head: [["Top clients", "CA validé"]],
          body: data.topClients.map((c) => [c.nom, formatFCFA(c.total)]),
        });
      }

      doc.save(`dashboard-commercial-${periode}-${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("Rapport exporté");
    } catch (e) {
      toast.error("Erreur lors de l'export");
    }
  };

  if (isError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">Erreur lors du chargement du tableau de bord.</p>
        <Button onClick={() => refetch()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Tableau de bord · {user?.prenom} {user?.nom}
          </h1>
          <p className="text-sm text-muted-foreground">Activité commerciale — Devis, clients & paiements</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {PERIODES.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriode(p.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  periode === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
            <Download className="h-4 w-4 mr-1.5" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-[10px]" />)
        ) : (
          <>
            <KpiCard
              label="CA signé"
              value={data.kpis.caSigne}
              unit="fcfa"
              evolution={data.kpis.evolutionCaPct}
              evolutionLabel="vs période préc."
              icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            />
            <KpiCard
              label="Devis créés"
              value={data.kpis.nbDevisTotal}
              icon={<FileText className="h-4 w-4 text-primary" />}
            />
            <KpiCard
              label="Taux de conversion"
              value={data.kpis.tauxConversion}
              unit="pct"
              icon={<Target className="h-4 w-4 text-info" />}
            />
            <KpiCard
              label="Panier moyen"
              value={data.kpis.panierMoyen}
              unit="fcfa"
              icon={<ShoppingBag className="h-4 w-4 text-warning" />}
            />
          </>
        )}
      </div>

      {/* Sparkline CA + Conversion mini */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Évolution CA — 6 derniers mois</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-[100px] w-full" />
            ) : (
              <SparklineCA data={data.evolutionCA} />
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading || !data ? (
              <Skeleton className="h-[100px] w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Devis validés</span>
                  <span className="font-semibold text-foreground tabular-nums">{data.kpis.nbDevisValides}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Devis refusés</span>
                  <span className="font-semibold text-foreground tabular-nums">{data.kpis.nbDevisRefuses}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">CA période préc.</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatFCFA(data.kpis.caSignePrecedent)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pipeline devis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? <Skeleton className="h-24 w-full" /> : <PipelineDevis pipeline={data.pipeline} />}
        </CardContent>
      </Card>

      {/* Top clients + Suivi paiements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top clients (période)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? <Skeleton className="h-32 w-full" /> : <TopClients clients={data.topClients} />}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Suivi des paiements</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/finance">Voir <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <SuiviPaiements paiements={data.suiviPaiements} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertes + Opérations récentes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Alertes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? <Skeleton className="h-40 w-full" /> : <AlertesCommercial alertes={data.alertes} />}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Opérations récentes</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/operations">Voir <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-40 w-full" />
            ) : data.operationsRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucune opération récente</p>
            ) : (
              <div className="space-y-2">
                {data.operationsRecentes.map((o) => (
                  <Link
                    key={o.id}
                    to="/operations"
                    className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{o.reference}</span>
                        <Badge variant="outline" className="text-[10px] border-0 bg-muted text-muted-foreground">
                          {o.statut}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground truncate mt-0.5">{o.client}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{o.trajet}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
