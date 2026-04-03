import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { FileText, Users, TrendingUp, ArrowRight, CheckCircle2, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUT_LABELS: Record<string, { label: string; class: string }> = {
  BROUILLON: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  SOUMIS_DG: { label: "En validation", class: "bg-warning/10 text-warning" },
  APPROUVE_DG: { label: "Approuvé DG", class: "bg-accent text-accent-foreground" },
  ENVOYE_CLIENT: { label: "Envoyé", class: "bg-info/10 text-info" },
  VALIDE_CLIENT: { label: "Validé client", class: "bg-primary/10 text-primary" },
  REFUSE_DG: { label: "Refusé DG", class: "bg-destructive/10 text-destructive" },
  REFUSE_CLIENT: { label: "Refusé client", class: "bg-destructive/10 text-destructive" },
};

interface DevisRecent {
  id: string;
  reference: string;
  client_nom: string;
  montant: number;
  statut: string;
}

export default function DashboardCommercial() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ brouillons: 0, enValidation: 0, envoyes: 0, valides: 0, totalClients: 0, caMois: 0 });
  const [recentDevis, setRecentDevis] = useState<DevisRecent[]>([]);

  useEffect(() => {
    async function fetch() {
      const [brRes, valRes, envRes, validRes, clientsRes, devisRes] = await Promise.all([
        supabase.from("devis").select("id", { count: "exact", head: true }).eq("statut", "BROUILLON"),
        supabase.from("devis").select("id", { count: "exact", head: true }).eq("statut", "SOUMIS_DG"),
        supabase.from("devis").select("id", { count: "exact", head: true }).eq("statut", "ENVOYE_CLIENT"),
        supabase.from("devis").select("id", { count: "exact", head: true }).eq("statut", "VALIDE_CLIENT"),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("devis").select("id, reference, montant, statut, client_id")
          .order("created_at", { ascending: false }).limit(6),
      ]);

      const devisData = devisRes.data || [];
      const clientIds = [...new Set(devisData.filter(d => d.client_id).map(d => d.client_id))];
      const clientMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase.from("clients").select("id, nom").in("id", clientIds);
        (clients || []).forEach(c => { clientMap[c.id] = c.nom; });
      }

      setStats({
        brouillons: brRes.count || 0,
        enValidation: valRes.count || 0,
        envoyes: envRes.count || 0,
        valides: validRes.count || 0,
        totalClients: clientsRes.count || 0,
        caMois: 0,
      });

      setRecentDevis(devisData.map(d => ({
        id: d.id,
        reference: d.reference,
        client_nom: d.client_id ? (clientMap[d.client_id] || "—") : "—",
        montant: d.montant,
        statut: d.statut,
      })));

      setLoading(false);
    }
    fetch();
  }, []);

  const statCards = [
    { label: "Brouillons", value: stats.brouillons, icon: FileText, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "En validation DG", value: stats.enValidation, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Envoyés client", value: stats.envoyes, icon: Send, color: "text-info", bg: "bg-info/10" },
    { label: "Clients", value: stats.totalClients, icon: Users, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Activité commerciale — Devis & Clients</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border border-border shadow-none">
            <CardContent className="p-5">
              <div className={`rounded-lg ${s.bg} p-2.5 w-fit mb-3`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{loading ? "—" : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline + devis récents */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Pipeline visuel */}
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader><CardTitle className="text-base font-semibold">Pipeline devis</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              { label: "Brouillons", count: stats.brouillons, color: "bg-muted-foreground" },
              { label: "En validation DG", count: stats.enValidation, color: "bg-warning" },
              { label: "Envoyés client", count: stats.envoyes, color: "bg-info" },
              { label: "Validés client", count: stats.valides, color: "bg-primary" },
            ].map((step) => {
              const total = stats.brouillons + stats.enValidation + stats.envoyes + stats.valides;
              const pct = total > 0 ? Math.max((step.count / total) * 100, step.count > 0 ? 8 : 0) : 0;
              return (
                <div key={step.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{step.label}</span>
                    <span className="font-semibold text-foreground">{loading ? "—" : step.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${step.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Devis récents */}
        <Card className="lg:col-span-3 border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Derniers devis</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/devis">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>
            ) : recentDevis.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Aucun devis</div>
            ) : (
              <div className="space-y-2">
                {recentDevis.map((d) => {
                  const cfg = STATUT_LABELS[d.statut] || STATUT_LABELS.BROUILLON;
                  return (
                    <Link key={d.id} to={`/devis/${d.id}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{d.reference}</span>
                          <Badge variant="outline" className={`border-0 text-[10px] ${cfg.class}`}>{cfg.label}</Badge>
                        </div>
                        <p className="text-sm text-foreground truncate mt-0.5">{d.client_nom}</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {d.montant.toLocaleString("fr-FR")} FCFA
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
