import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Receipt, Wallet, TrendingUp, ArrowRight, AlertCircle, CreditCard, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function formatMontant(v: number) { return v.toLocaleString("fr-FR"); }

export default function DashboardFinance() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    caTotal: 0, facturesImpayees: 0, montantImpaye: 0,
    decaissementsMois: 0, decaissementsEnAttente: 0,
    facturesEnRetard: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentFactures, setRecentFactures] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      const now = new Date();
      const moisActuel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [factPayeesRes, factImpayeesRes, decMoisRes, decAttenteRes, factRetardRes, factRecentRes] = await Promise.all([
        supabase.from("factures").select("montant_ttc, montant_paye").in("statut", ["PAYEE", "PARTIELLEMENT_PAYEE"]),
        supabase.from("factures").select("montant_ttc, montant_paye").in("statut", ["ENVOYEE", "PARTIELLEMENT_PAYEE"]),
        supabase.from("decaissements").select("montant").eq("statut", "PAYE").gte("date_paiement", `${moisActuel}-01`),
        supabase.from("decaissements").select("id", { count: "exact", head: true }).eq("statut", "EN_ATTENTE"),
        supabase.from("factures").select("id", { count: "exact", head: true })
          .eq("statut", "ENVOYEE").lt("date_echeance", now.toISOString().slice(0, 10)),
        supabase.from("factures").select("id, reference, montant_ttc, montant_paye, statut, date_echeance, client_id")
          .in("statut", ["ENVOYEE", "PARTIELLEMENT_PAYEE"]).order("date_echeance", { ascending: true }).limit(5),
      ]);

      const caTotal = (factPayeesRes.data || []).reduce((s, f) => s + (f.montant_paye || f.montant_ttc || 0), 0);
      const impayeData = factImpayeesRes.data || [];
      const montantImpaye = impayeData.reduce((s, f) => s + ((f.montant_ttc || 0) - (f.montant_paye || 0)), 0);
      const decMois = (decMoisRes.data || []).reduce((s, d) => s + (d.montant || 0), 0);

      // Client names for recent factures
      const clientIds = [...new Set((factRecentRes.data || []).filter(f => f.client_id).map(f => f.client_id))];
      const clientMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase.from("clients").select("id, nom").in("id", clientIds);
        (clients || []).forEach(c => { clientMap[c.id] = c.nom; });
      }

      setStats({
        caTotal,
        facturesImpayees: impayeData.length,
        montantImpaye,
        decaissementsMois: decMois,
        decaissementsEnAttente: decAttenteRes.count || 0,
        facturesEnRetard: factRetardRes.count || 0,
      });

      setRecentFactures((factRecentRes.data || []).map(f => ({
        ...f,
        client_nom: f.client_id ? (clientMap[f.client_id] || "—") : "—",
        reste: (f.montant_ttc || 0) - (f.montant_paye || 0),
      })));

      // Chart: 6 derniers mois entrées vs sorties
      const points: any[] = [];
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

      const [allFact, allDec] = await Promise.all([
        supabase.from("factures").select("montant_paye, montant_ttc, date_emission, statut")
          .gte("date_emission", sixMonthsAgo).in("statut", ["PAYEE", "PARTIELLEMENT_PAYEE"]),
        supabase.from("decaissements").select("montant, date_paiement, created_at")
          .eq("statut", "PAYE").gte("created_at", sixMonthsAgo),
      ]);

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        points.push({ mois: MOIS_LABELS[d.getMonth()], entrees: 0, sorties: 0 });
      }

      (allFact.data || []).forEach(f => {
        const d = new Date(f.date_emission);
        const idx = points.findIndex(p => p.mois === MOIS_LABELS[d.getMonth()]);
        if (idx >= 0) points[idx].entrees += f.montant_paye || f.montant_ttc || 0;
      });

      (allDec.data || []).forEach(d => {
        const date = new Date(d.date_paiement || d.created_at);
        const idx = points.findIndex(p => p.mois === MOIS_LABELS[date.getMonth()]);
        if (idx >= 0) points[idx].sorties += d.montant || 0;
      });

      setChartData(points);
      setLoading(false);
    }
    fetch();
  }, []);

  const statCards = [
    { label: "CA total encaissé", value: formatMontant(stats.caTotal), unit: "FCFA", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { label: "Impayés", value: formatMontant(stats.montantImpaye), unit: "FCFA", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", sub: `${stats.facturesImpayees} facture(s)` },
    { label: "Décaissements du mois", value: formatMontant(stats.decaissementsMois), unit: "FCFA", icon: TrendingDown, color: "text-warning", bg: "bg-warning/10" },
    { label: "Décaiss. en attente", value: String(stats.decaissementsEnAttente), icon: CreditCard, color: "text-info", bg: "bg-info/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Finance & Comptabilité — Trésorerie & Facturation</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border border-border shadow-none">
            <CardContent className="p-5">
              <div className={`rounded-lg ${s.bg} p-2.5 w-fit mb-3`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">
                {loading ? "—" : s.value}
                {s.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{s.unit}</span>}
              </p>
              {"sub" in s && s.sub && <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Chart */}
        <Card className="lg:col-span-3 border border-border shadow-none">
          <CardHeader><CardTitle className="text-base font-semibold">Flux financiers (6 mois)</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="h-[280px]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Chargement...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                    <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 14% 50%)" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215 14% 50%)" }} tickFormatter={(v) => v >= 1000000 ? (v/1000000).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(0)+"K" : v} />
                    <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " FCFA"} />
                    <Bar dataKey="entrees" name="Entrées" fill="hsl(160 64% 40%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sorties" name="Sorties" fill="hsl(215 14% 70%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Factures impayées */}
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-destructive" />
              Factures en attente
              {stats.facturesEnRetard > 0 && (
                <Badge variant="outline" className="border-0 bg-destructive/10 text-destructive text-xs">{stats.facturesEnRetard} en retard</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/factures">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {recentFactures.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Aucune facture en attente</div>
            ) : (
              recentFactures.map((f: any) => (
                <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{f.reference}</span>
                      {f.date_echeance && new Date(f.date_echeance) < new Date() && (
                        <Badge variant="outline" className="border-0 text-[10px] bg-destructive/10 text-destructive">En retard</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground truncate">{f.client_nom}</p>
                  </div>
                  <span className="text-sm font-semibold text-destructive whitespace-nowrap">
                    {formatMontant(f.reste)} FCFA
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
