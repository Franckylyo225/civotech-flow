import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Truck, Package, Users, Wrench, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLogistique() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    opsEnCours: 0, opsPlanifiees: 0,
    camionsDispo: 0, camionsTotal: 0, camionsMaint: 0,
    chauffeursDispo: 0, chauffeursTotal: 0,
    maintenancesPlanifiees: 0,
  });
  const [operations, setOperations] = useState<any[]>([]);
  const [alertes, setAlertes] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      const [opsEC, opsP, camDispo, camTotal, camMaint, chDispo, chTotal, maintP, opsListRes] = await Promise.all([
        supabase.from("operations").select("id", { count: "exact", head: true }).eq("statut", "EN_COURS"),
        supabase.from("operations").select("id", { count: "exact", head: true }).eq("statut", "PLANIFIEE"),
        supabase.from("camions").select("id", { count: "exact", head: true }).eq("statut", "DISPONIBLE"),
        supabase.from("camions").select("id", { count: "exact", head: true }),
        supabase.from("camions").select("id", { count: "exact", head: true }).eq("statut", "EN_MAINTENANCE"),
        supabase.from("chauffeurs").select("id", { count: "exact", head: true }).eq("statut", "DISPONIBLE"),
        supabase.from("chauffeurs").select("id", { count: "exact", head: true }),
        supabase.from("maintenances").select("id", { count: "exact", head: true }).in("statut", ["PLANIFIEE", "EN_COURS"]),
        supabase.from("operations").select("id, reference, client_nom, lieu_embarquement, lieu_livraison, statut")
          .in("statut", ["EN_COURS", "PLANIFIEE"]).order("date_depart", { ascending: true }).limit(6),
      ]);

      setStats({
        opsEnCours: opsEC.count || 0, opsPlanifiees: opsP.count || 0,
        camionsDispo: camDispo.count || 0, camionsTotal: camTotal.count || 0, camionsMaint: camMaint.count || 0,
        chauffeursDispo: chDispo.count || 0, chauffeursTotal: chTotal.count || 0,
        maintenancesPlanifiees: maintP.count || 0,
      });
      setOperations(opsListRes.data || []);

      // Alertes: camions en maintenance
      const { data: maintAlerts } = await supabase
        .from("maintenances").select("id, description, camion_id, type, statut")
        .in("statut", ["PLANIFIEE", "EN_COURS"]).limit(4);
      const camionIds = [...new Set((maintAlerts || []).map(m => m.camion_id))];
      const camionMap: Record<string, string> = {};
      if (camionIds.length > 0) {
        const { data: camions } = await supabase.from("camions").select("id, immatriculation").in("id", camionIds);
        (camions || []).forEach(c => { camionMap[c.id] = c.immatriculation; });
      }
      setAlertes((maintAlerts || []).map(m => ({ ...m, immatriculation: camionMap[m.camion_id] || "—" })));
      setLoading(false);
    }
    fetch();
  }, []);

  const statCards = [
    { label: "Missions en cours", value: stats.opsEnCours, icon: Truck, color: "text-primary", bg: "bg-primary/10" },
    { label: "Missions planifiées", value: stats.opsPlanifiees, icon: Truck, color: "text-warning", bg: "bg-warning/10" },
    { label: `Camions dispo.`, value: `${stats.camionsDispo}/${stats.camionsTotal}`, icon: Package, color: "text-info", bg: "bg-info/10" },
    { label: `Chauffeurs dispo.`, value: `${stats.chauffeursDispo}/${stats.chauffeursTotal}`, icon: Users, color: "text-accent-foreground", bg: "bg-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Suivi logistique — Opérations & Parc</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border border-border shadow-none">
            <CardContent className="p-5">
              <div className={`rounded-lg ${s.bg} p-2.5 w-fit mb-3`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{loading ? "—" : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Opérations actives</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/operations">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>
            ) : operations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Aucune opération active</div>
            ) : (
              <div className="space-y-2">
                {operations.map((op: any) => (
                  <div key={op.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{op.reference}</span>
                        <Badge variant="outline" className={cn("border-0 text-[10px]",
                          op.statut === "EN_COURS" ? "bg-accent text-accent-foreground" : "bg-warning/10 text-warning"
                        )}>
                          {op.statut === "EN_COURS" ? "En cours" : "Planifiée"}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{op.client_nom}</p>
                      <p className="text-xs text-muted-foreground">{op.lieu_embarquement} → {op.lieu_livraison}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-warning" />
              Maintenances
              {stats.maintenancesPlanifiees > 0 && (
                <Badge variant="outline" className="border-0 bg-warning/10 text-warning text-xs">{stats.maintenancesPlanifiees}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/parc-auto">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {alertes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm">Aucune maintenance en cours</p>
              </div>
            ) : (
              alertes.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.immatriculation}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                    <Badge variant="outline" className="border-0 text-[10px] bg-warning/10 text-warning mt-1">
                      {a.type} — {a.statut === "EN_COURS" ? "En cours" : "Planifiée"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
