import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Search, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LogEntry {
  id: string;
  user_nom: string;
  user_email: string;
  action: string;
  table_cible: string;
  details: any;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-success/10 text-success",
  UPDATE: "bg-warning/10 text-warning",
  DELETE: "bg-destructive/10 text-destructive",
  LOGIN: "bg-info/10 text-info",
  VALIDATE: "bg-primary/10 text-primary",
};

export default function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs((data || []) as LogEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    const term = search.toLowerCase();
    return (l.user_nom || "").toLowerCase().includes(term) ||
      (l.action || "").toLowerCase().includes(term) ||
      (l.table_cible || "").toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4">
      <Card className="border border-border shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher dans les logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} /> Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Journal d'activité ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{log.user_nom || log.user_email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("border-0 text-xs font-medium", ACTION_COLORS[log.action] || "bg-muted text-muted-foreground")}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.table_cible || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {loading ? "Chargement..." : "Aucune activité enregistrée"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
