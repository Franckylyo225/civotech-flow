import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ShoppingCart, Users, FileText, ArrowRight, Clock, CheckCircle2, Wallet } from "lucide-react";

const STATUT_LABELS: Record<string, { label: string; class: string }> = {
  BROUILLON: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  SOUMISE: { label: "Soumise", class: "bg-info/10 text-info" },
  DEVIS_EN_COURS: { label: "Devis en cours", class: "bg-warning/10 text-warning" },
  SOUMISE_DG: { label: "Validation DG", class: "bg-warning/10 text-warning" },
  VALIDEE_DG: { label: "Validée DG", class: "bg-accent text-accent-foreground" },
  REFUSEE_DG: { label: "Refusée", class: "bg-destructive/10 text-destructive" },
  DECAISSEMENT: { label: "Décaissement", class: "bg-info/10 text-info" },
  PAYEE: { label: "Payée", class: "bg-primary/10 text-primary" },
  CLOTUREE: { label: "Clôturée", class: "bg-muted text-muted-foreground" },
};

export default function DashboardAchats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    enCours: 0, enValidation: 0, fournisseurs: 0, budgetMois: 0,
  });
  const [demandes, setDemandes] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      const now = new Date();
      const moisActuel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [ecRes, valRes, fournRes, budgetRes, listRes] = await Promise.all([
        supabase.from("demandes_achat").select("id", { count: "exact", head: true })
          .in("statut", ["BROUILLON", "SOUMISE", "DEVIS_EN_COURS"]),
        supabase.from("demandes_achat").select("id", { count: "exact", head: true }).eq("statut", "SOUMISE_DG"),
        supabase.from("fournisseurs").select("id", { count: "exact", head: true }).eq("actif", true),
        supabase.from("decaissements").select("montant").eq("statut", "PAYE").gte("date_paiement", `${moisActuel}-01`),
        supabase.from("demandes_achat").select("id, reference, designation, montant_estime, statut, urgence")
          .not("statut", "in", '("CLOTUREE","PAYEE")')
          .order("created_at", { ascending: false }).limit(6),
      ]);

      setStats({
        enCours: ecRes.count || 0,
        enValidation: valRes.count || 0,
        fournisseurs: fournRes.count || 0,
        budgetMois: (budgetRes.data || []).reduce((s, d) => s + (d.montant || 0), 0),
      });
      setDemandes(listRes.data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  const statCards = [
    { label: "Demandes en cours", value: stats.enCours, icon: ShoppingCart, color: "text-primary", bg: "bg-primary/10" },
    { label: "En validation DG", value: stats.enValidation, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Fournisseurs actifs", value: stats.fournisseurs, icon: Users, color: "text-info", bg: "bg-info/10" },
    { label: "Budget mois (payé)", value: stats.budgetMois.toLocaleString("fr-FR"), unit: "FCFA", icon: Wallet, color: "text-accent-foreground", bg: "bg-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Service Achats — Demandes & Fournisseurs</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border border-border shadow-none">
            <CardContent className="p-5">
              <div className={`rounded-lg ${s.bg} p-2.5 w-fit mb-3`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">
                {loading ? "—" : s.value}
                {"unit" in s && s.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{s.unit}</span>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Demandes d'achat actives</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
            <Link to="/achats">Voir tout <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>
          ) : demandes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto h-8 w-8 text-success/40 mb-2" />
              <p className="text-sm">Aucune demande active</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {demandes.map((d: any) => {
                const cfg = STATUT_LABELS[d.statut] || STATUT_LABELS.BROUILLON;
                return (
                  <Link key={d.id} to="/achats" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{d.reference}</span>
                        <Badge variant="outline" className={`border-0 text-[10px] ${cfg.class}`}>{cfg.label}</Badge>
                        {d.urgence === "URGENTE" && (
                          <Badge variant="outline" className="border-0 text-[10px] bg-destructive/10 text-destructive">Urgent</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-0.5 truncate">{d.designation}</p>
                      <p className="text-sm text-primary font-semibold">{(d.montant_estime || 0).toLocaleString("fr-FR")} FCFA</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
