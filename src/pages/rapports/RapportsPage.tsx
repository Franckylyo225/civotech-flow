import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart3, TrendingUp, TrendingDown, Truck, FileText, Receipt, CreditCard,
  DollarSign, Users, Wrench, CalendarIcon, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["hsl(160 64% 40%)", "hsl(210 80% 55%)", "hsl(38 92% 50%)", "hsl(0 72% 51%)", "hsl(270 60% 55%)"];

type Period = "6m" | "12m" | "ytd";

function getPeriodMonths(period: Period): Date[] {
  const now = new Date();
  const months: Date[] = [];
  if (period === "ytd") {
    for (let m = 0; m <= now.getMonth(); m++) months.push(new Date(now.getFullYear(), m, 1));
  } else {
    const count = period === "6m" ? 6 : 12;
    for (let i = count - 1; i >= 0; i--) months.push(startOfMonth(subMonths(now, i)));
  }
  return months;
}

function formatK(v: number) {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(0) + "K";
  return v.toString();
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("fr-FR") : p.value} {p.dataKey.includes("montant") || p.dataKey.includes("ca") || p.dataKey.includes("entrees") || p.dataKey.includes("sorties") ? "F" : ""}
        </p>
      ))}
    </div>
  );
};

export default function RapportsPage() {
  const [period, setPeriod] = useState<Period>("6m");
  const [operations, setOperations] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [decaissements, setDecaissements] = useState<any[]>([]);
  const [devis, setDevis] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [camions, setCamions] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("operations").select("id, reference, client_nom, montant_devis, statut, created_at, date_depart, date_livraison_reelle, lieu_embarquement, lieu_livraison"),
      supabase.from("factures").select("id, montant_ttc, montant_paye, statut, date_emission, created_at, client_id"),
      supabase.from("decaissements").select("id, montant, statut, created_at, date_paiement, motif, operation_id, demande_achat_id"),
      supabase.from("devis").select("id, montant, statut, created_at"),
      supabase.from("clients").select("id, nom"),
      supabase.from("camions").select("id, immatriculation, statut, km_actuel"),
      supabase.from("maintenances").select("id, cout_reel, cout_estime, statut, created_at, camion_id"),
    ]).then(([ops, facs, decs, devs, cls, cams, mtnces]) => {
      setOperations(ops.data || []);
      setFactures(facs.data || []);
      setDecaissements(decs.data || []);
      setDevis(devs.data || []);
      setClients(cls.data || []);
      setCamions(cams.data || []);
      setMaintenances(mtnces.data || []);
      setLoading(false);
    });
  }, []);

  const months = useMemo(() => getPeriodMonths(period), [period]);

  // --- KPIs ---
  const totalCA = factures.filter(f => ["PAYEE", "PARTIELLEMENT_PAYEE"].includes(f.statut)).reduce((s, f) => s + (f.montant_paye || 0), 0);
  const totalDecaisse = decaissements.filter(d => d.statut === "PAYE").reduce((s, d) => s + d.montant, 0);
  const beneficeBrut = totalCA - totalDecaisse;
  const opsTerminees = operations.filter(o => o.statut === "TERMINEE" || o.statut === "ARCHIVEE").length;
  const opsEnCours = operations.filter(o => o.statut === "EN_COURS").length;
  const devisValides = devis.filter(d => d.statut === "VALIDE_CLIENT" || d.statut === "APPROUVE_DG").length;
  const tauxConversion = devis.length > 0 ? Math.round((devisValides / devis.length) * 100) : 0;
  const facturesImpayees = factures.filter(f => f.statut === "ENVOYEE" || f.statut === "PARTIELLEMENT_PAYEE");
  const montantImpaye = facturesImpayees.reduce((s, f) => s + (f.montant_ttc - f.montant_paye), 0);

  // --- Monthly chart data ---
  const monthlyData = useMemo(() => months.map(m => {
    const mKey = format(m, "yyyy-MM");
    const label = format(m, "MMM yy", { locale: fr });
    const entrees = factures
      .filter(f => ["PAYEE", "PARTIELLEMENT_PAYEE"].includes(f.statut) && f.date_emission?.startsWith(mKey))
      .reduce((s, f) => s + (f.montant_paye || 0), 0);
    const sorties = decaissements
      .filter(d => d.statut === "PAYE" && (d.date_paiement?.startsWith(mKey) || d.created_at?.startsWith(mKey)))
      .reduce((s, d) => s + d.montant, 0);
    const nbOps = operations.filter(o => o.created_at?.startsWith(mKey)).length;
    const nbDevis = devis.filter(d => d.created_at?.startsWith(mKey)).length;
    return { label, entrees, sorties, benefice: entrees - sorties, nbOps, nbDevis };
  }), [months, factures, decaissements, operations, devis]);

  // --- Operations by status ---
  const opsByStatut = useMemo(() => {
    const map: Record<string, number> = {};
    operations.forEach(o => { map[o.statut] = (map[o.statut] || 0) + 1; });
    const labels: Record<string, string> = { DEMANDE: "Demande", PLANIFIEE: "Planifiée", EN_COURS: "En cours", TERMINEE: "Terminée", ARCHIVEE: "Archivée" };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [operations]);

  // --- Top clients by CA ---
  const topClients = useMemo(() => {
    const map: Record<string, { nom: string; ca: number; ops: number }> = {};
    operations.forEach(o => {
      const key = o.client_nom || "Inconnu";
      if (!map[key]) map[key] = { nom: key, ca: 0, ops: 0 };
      map[key].ca += o.montant_devis || 0;
      map[key].ops += 1;
    });
    return Object.values(map).sort((a, b) => b.ca - a.ca).slice(0, 5);
  }, [operations]);

  // --- Devis funnel ---
  const devisFunnel = useMemo(() => {
    const statuts: Record<string, string> = {
      BROUILLON: "Brouillon", SOUMIS_DG: "Soumis DG", APPROUVE_DG: "Approuvé DG",
      ENVOYE_CLIENT: "Envoyé", VALIDE_CLIENT: "Validé", REFUSE_CLIENT: "Refusé", REFUSE_DG: "Refusé DG",
    };
    const map: Record<string, number> = {};
    devis.forEach(d => { map[d.statut] = (map[d.statut] || 0) + 1; });
    return Object.entries(statuts).map(([k, label]) => ({ name: label, value: map[k] || 0 })).filter(d => d.value > 0);
  }, [devis]);

  // --- Maintenance costs ---
  const maintenanceCost = maintenances.reduce((s, m) => s + (m.cout_reel || m.cout_estime || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Chargement des rapports...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Rapports & Statistiques
          </h1>
          <p className="text-sm text-muted-foreground">Analyse de l'activité et de la performance</p>
        </div>
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="6m">6 derniers mois</SelectItem>
            <SelectItem value="12m">12 derniers mois</SelectItem>
            <SelectItem value="ytd">Année en cours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Chiffre d'affaires", value: totalCA, icon: Receipt, color: "primary", prefix: "" },
          { label: "Décaissements", value: totalDecaisse, icon: CreditCard, color: "warning", prefix: "" },
          { label: "Bénéfice brut", value: beneficeBrut, icon: beneficeBrut >= 0 ? TrendingUp : TrendingDown, color: beneficeBrut >= 0 ? "success" : "destructive", prefix: "" },
          { label: "Créances impayées", value: montantImpaye, icon: DollarSign, color: "info", prefix: "" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("rounded-lg p-2.5", `bg-${kpi.color}/10`)}>
                  <kpi.icon className={cn("h-5 w-5", `text-${kpi.color}`)} />
                </div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">F</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Opérations terminées", value: opsTerminees, sub: `${opsEnCours} en cours`, icon: Truck, color: "primary" },
          { label: "Taux conversion devis", value: `${tauxConversion}%`, sub: `${devisValides}/${devis.length} validés`, icon: FileText, color: "success" },
          { label: "Coût maintenances", value: `${maintenanceCost.toLocaleString("fr-FR")} F`, sub: `${maintenances.length} interventions`, icon: Wrench, color: "warning" },
          { label: "Clients actifs", value: topClients.length, sub: `${clients.length} au total`, icon: Users, color: "info" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border border-border shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", `bg-${kpi.color}/10`)}>
                <kpi.icon className={cn("h-5 w-5", `text-${kpi.color}`)} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                {kpi.sub && <p className="text-xs text-muted-foreground">{kpi.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Revenue/Expenses chart */}
        <Card className="lg:col-span-3 border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Entrées vs Sorties</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} tickFormatter={formatK} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="entrees" name="Entrées" fill="hsl(160 64% 40%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sorties" name="Sorties" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Operations pie */}
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Répartition opérations</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px] flex items-center justify-center">
              {opsByStatut.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={opsByStatut} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {opsByStatut.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune opération</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Benefice trend */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Évolution du bénéfice</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} tickFormatter={formatK} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="benefice" name="Bénéfice" stroke="hsl(160 64% 40%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(160 64% 40%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Devis funnel */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Pipeline devis</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[260px]">
              {devisFunnel.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={devisFunnel} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} width={75} />
                    <Tooltip />
                    <Bar dataKey="value" name="Nombre" fill="hsl(210 80% 55%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Aucun devis</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top clients + Activity volume */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top clients */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top 5 clients par CA</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {topClients.map((c, i) => (
              <div key={c.nom} className="flex items-center gap-3">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white", i === 0 ? "bg-primary" : i === 1 ? "bg-primary/80" : "bg-muted-foreground/40")}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.nom}</p>
                  <p className="text-xs text-muted-foreground">{c.ops} opération(s)</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{c.ca.toLocaleString("fr-FR")} F</p>
              </div>
            ))}
            {topClients.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
          </CardContent>
        </Card>

        {/* Monthly activity volume */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Volume d'activité mensuel</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="nbOps" name="Opérations" fill="hsl(160 64% 40%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="nbDevis" name="Devis" fill="hsl(210 80% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
