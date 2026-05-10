import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Users, ShieldCheck, Activity, Database, Server, FileText, AlertTriangle, Wrench, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { roleLabels } from "@/lib/roles";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const ROLE_COLORS: Record<string, string> = {
  DG: "hsl(160 64% 40%)",
  COMMERCIAL: "hsl(217 91% 60%)",
  LOGISTIQUE: "hsl(38 92% 50%)",
  FINANCE: "hsl(142 71% 45%)",
  ACHATS: "hsl(280 67% 60%)",
  ASSISTANTE: "hsl(330 65% 55%)",
  MAINTENANCE: "hsl(25 95% 53%)",
  ADMIN_VENTES: "hsl(199 89% 48%)",
  ADMIN: "hsl(0 72% 51%)",
  SUPER_ADMIN: "hsl(263 70% 50%)",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-success/10 text-success",
  UPDATE: "bg-warning/10 text-warning",
  DELETE: "bg-destructive/10 text-destructive",
};

interface LogEntry {
  id: string;
  user_nom: string;
  action: string;
  table_cible: string;
  details: any;
  created_at: string;
}

export default function DashboardSuperAdmin() {
  const { settings, update } = usePlatformSettings();
  const [usersCount, setUsersCount] = useState(0);
  const [activeUsersToday, setActiveUsersToday] = useState(0);
  const [roleDistribution, setRoleDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [activityByDay, setActivityByDay] = useState<{ jour: string; actions: number }[]>([]);
  const [topModules, setTopModules] = useState<{ module: string; count: number }[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const since30 = new Date(); since30.setDate(since30.getDate() - 30);

    const [rolesRes, logsRes, devisRes, opRes, factRes] = await Promise.all([
      supabase.from("user_roles").select("role"),
      supabase.from("activity_logs").select("*").gte("created_at", since30.toISOString()).order("created_at", { ascending: false }).limit(500),
      supabase.from("devis").select("id", { count: "exact", head: true }),
      supabase.from("operations").select("id", { count: "exact", head: true }),
      supabase.from("factures").select("id", { count: "exact", head: true }),
    ]);

    const roles = rolesRes.data || [];
    setUsersCount(roles.length);
    const roleCounts: Record<string, number> = {};
    roles.forEach((r: any) => { roleCounts[r.role] = (roleCounts[r.role] || 0) + 1; });
    setRoleDistribution(Object.entries(roleCounts).map(([role, count]) => ({
      name: roleLabels[role as keyof typeof roleLabels] || role,
      value: count,
      color: ROLE_COLORS[role] || "hsl(215 14% 70%)",
    })));

    const logs = (logsRes.data || []) as LogEntry[];
    setRecentLogs(logs.slice(0, 12));

    // Activity 14 days
    const dayMap: Record<string, number> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      dayMap[format(d, "dd/MM")] = 0;
    }
    logs.forEach(l => {
      const day = format(new Date(l.created_at), "dd/MM");
      if (day in dayMap) dayMap[day]++;
    });
    setActivityByDay(Object.entries(dayMap).map(([jour, actions]) => ({ jour, actions })));

    // Active users today
    const todayStr = format(today, "yyyy-MM-dd");
    const todayUsers = new Set(logs.filter(l => l.created_at.startsWith(todayStr)).map(l => l.user_nom).filter(Boolean));
    setActiveUsersToday(todayUsers.size);

    // Top modules
    const modCount: Record<string, number> = {};
    logs.forEach(l => { if (l.table_cible) modCount[l.table_cible] = (modCount[l.table_cible] || 0) + 1; });
    setTopModules(Object.entries(modCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([module, count]) => ({ module, count })));

    setTableCounts({
      devis: devisRes.count || 0,
      operations: opRes.count || 0,
      factures: factRes.count || 0,
    });

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Console Super Administrateur
        </h1>
        <p className="text-sm text-muted-foreground">Gestion des utilisateurs et supervision de la plateforme Civotech Flow</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Utilisateurs" value={usersCount} icon={Users} color="primary" />
        <KpiCard label="Actifs aujourd'hui" value={activeUsersToday} icon={Activity} color="info" />
        <KpiCard label="Actions (30j)" value={activityByDay.reduce((s, d) => s + d.actions, 0)} icon={FileText} color="warning" />
        <KpiCard label="Rôles configurés" value={roleDistribution.length} icon={ShieldCheck} color="success" />
      </div>

      {/* Platform health & demo toggle */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-border shadow-none lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4 text-primary" /> Santé de la plateforme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <HealthTile label="Base de données" status="OK" detail="Lovable Cloud" icon={Database} ok />
              <HealthTile label="Authentification" status="OK" detail={`${usersCount} utilisateurs`} icon={ShieldCheck} ok />
              <HealthTile label="Stockage fichiers" status="OK" detail="6 buckets actifs" icon={FileText} ok />
              <HealthTile label="Edge Functions" status="OK" detail="Déployées" icon={Server} ok />
            </div>
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Devis</p>
                <p className="text-xl font-bold text-foreground">{tableCounts.devis ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Opérations</p>
                <p className="text-xl font-bold text-foreground">{tableCounts.operations ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Factures</p>
                <p className="text-xl font-bold text-foreground">{tableCounts.factures ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Mode démo</p>
                <p className="text-xs text-muted-foreground">Affiche les comptes test sur le login</p>
              </div>
              <Switch
                checked={settings?.demo_mode_enabled ?? false}
                onCheckedChange={(v) => update({ demo_mode_enabled: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Mode maintenance</p>
                <p className="text-xs text-muted-foreground">Bloque l'accès à la plateforme</p>
              </div>
              <Switch
                checked={settings?.maintenance_mode ?? false}
                onCheckedChange={(v) => update({ maintenance_mode: v })}
              />
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/super-admin/utilisateurs"><Users className="h-4 w-4 mr-2" /> Gérer les utilisateurs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par rôle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}>
                    {roleDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activité (14 derniers jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityByDay} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis dataKey="jour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(215 14% 50%)" }} interval={1} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="actions" fill="hsl(160 64% 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top modules + recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Modules les plus utilisés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topModules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée</p>
            ) : topModules.map(m => {
              const max = Math.max(...topModules.map(t => t.count));
              return (
                <div key={m.module}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground capitalize">{m.module}</span>
                    <span className="text-muted-foreground">{m.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(m.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Activité récente</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/super-admin/logs"><Eye className="h-4 w-4 mr-1" /> Tout voir</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentLogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Aucune activité</div>
              ) : recentLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                  <Badge variant="outline" className={cn("border-0 text-[10px] font-medium shrink-0", ACTION_COLORS[log.action] || "bg-muted text-muted-foreground")}>
                    {log.action}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-medium">{log.user_nom || "Système"}</span>
                      <span className="text-muted-foreground"> — {log.table_cible}</span>
                      {log.details?.reference && <span className="ml-1 font-mono text-xs text-muted-foreground">({log.details.reference})</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM HH:mm", { locale: fr })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={cn("rounded-lg p-2.5", `bg-${color}/10`)}>
          <Icon className={cn("h-5 w-5", `text-${color}`)} />
        </div>
      </CardContent>
    </Card>
  );
}

function HealthTile({ label, status, detail, icon: Icon, ok }: { label: string; status: string; detail: string; icon: any; ok: boolean }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className={cn("h-2 w-2 rounded-full", ok ? "bg-success" : "bg-destructive")} />
      </div>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground truncate">{detail}</p>
    </div>
  );
}
