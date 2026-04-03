import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, ShieldCheck, Activity, Clock, UserCheck, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const ROLE_LABELS: Record<string, string> = {
  DG: "Direction Générale",
  COMMERCIAL: "Commercial",
  LOGISTIQUE: "Logistique",
  FINANCE: "Finance",
  ACHATS: "Achats",
  ASSISTANTE: "Assistante DG",
  MAINTENANCE: "Maintenance",
  ADMIN: "Administrateur",
};

const ROLE_COLORS: Record<string, string> = {
  DG: "hsl(160 64% 40%)",
  COMMERCIAL: "hsl(217 91% 60%)",
  LOGISTIQUE: "hsl(38 92% 50%)",
  FINANCE: "hsl(142 71% 45%)",
  ACHATS: "hsl(280 67% 60%)",
  ASSISTANTE: "hsl(330 65% 55%)",
  MAINTENANCE: "hsl(25 95% 53%)",
  ADMIN: "hsl(0 72% 51%)",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-success/10 text-success",
  UPDATE: "bg-warning/10 text-warning",
  DELETE: "bg-destructive/10 text-destructive",
  LOGIN: "bg-info/10 text-info",
  VALIDATE: "bg-primary/10 text-primary",
};

interface LogEntry {
  id: string;
  user_nom: string;
  action: string;
  table_cible: string;
  details: any;
  created_at: string;
}

export default function AdminDashboardTab() {
  const [usersCount, setUsersCount] = useState(0);
  const [roleDistribution, setRoleDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [activityByDay, setActivityByDay] = useState<{ jour: string; actions: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [rolesRes, logsRes] = await Promise.all([
      supabase.from("user_roles").select("role"),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    // Users count & role distribution
    const roles = rolesRes.data || [];
    setUsersCount(roles.length);

    const roleCounts: Record<string, number> = {};
    roles.forEach((r: any) => {
      roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
    });
    setRoleDistribution(
      Object.entries(roleCounts).map(([role, count]) => ({
        name: ROLE_LABELS[role] || role,
        value: count,
        color: ROLE_COLORS[role] || "hsl(215 14% 70%)",
      }))
    );

    // Recent logs
    const logs = (logsRes.data || []) as LogEntry[];
    setRecentLogs(logs.slice(0, 10));

    // Activity by day (last 7 days)
    const dayMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayMap[format(d, "dd/MM")] = 0;
    }
    logs.forEach(l => {
      const day = format(new Date(l.created_at), "dd/MM");
      if (day in dayMap) dayMap[day]++;
    });
    setActivityByDay(Object.entries(dayMap).map(([jour, actions]) => ({ jour, actions })));

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold text-foreground mt-1">{usersCount}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rôles actifs</p>
                <p className="text-2xl font-bold text-foreground mt-1">{roleDistribution.length}</p>
              </div>
              <div className="rounded-lg bg-warning/10 p-2.5">
                <ShieldCheck className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actions (7j)</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {activityByDay.reduce((s, d) => s + d.actions, 0)}
                </p>
              </div>
              <div className="rounded-lg bg-info/10 p-2.5">
                <Activity className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Role distribution pie */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Répartition par rôle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {roleDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity bar chart */}
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Activité (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityByDay} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis dataKey="jour" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 14% 50%)" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="actions" name="Actions" fill="hsl(160 64% 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Aucune activité enregistrée</div>
            ) : (
              recentLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <Badge variant="outline" className={cn("border-0 text-xs font-medium shrink-0", ACTION_COLORS[log.action] || "bg-muted text-muted-foreground")}>
                    {log.action}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-medium">{log.user_nom || "Système"}</span>
                      {" — "}
                      <span className="text-muted-foreground">{log.table_cible}</span>
                      {log.details?.reference && (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">({log.details.reference})</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM HH:mm")}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
