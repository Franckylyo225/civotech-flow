import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Briefcase, FileSignature, Calendar, Megaphone, ArrowRight, Clock,
  CheckCircle2, AlertCircle, Plus, MapPin, FileText,
} from "lucide-react";

const SB_STATUT: Record<string, { label: string; class: string }> = {
  BROUILLON: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  SOUMISE_DG: { label: "En attente DG", class: "bg-warning/10 text-warning" },
  VALIDEE_DG: { label: "Validée DG", class: "bg-primary/10 text-primary" },
  REFUSEE_DG: { label: "Refusée", class: "bg-destructive/10 text-destructive" },
  PAYEE: { label: "Payée", class: "bg-success/10 text-success" },
};

const SI_STATUT: Record<string, { label: string; class: string }> = {
  received: { label: "Reçue", class: "bg-muted text-muted-foreground" },
  pending_DG: { label: "En attente DG", class: "bg-warning/10 text-warning" },
  approved_for_payment: { label: "À payer", class: "bg-primary/10 text-primary" },
  cheque_ready: { label: "Chèque prêt", class: "bg-info/10 text-info" },
  processing: { label: "En traitement", class: "bg-info/10 text-info" },
  paid: { label: "Payée", class: "bg-success/10 text-success" },
  delivered: { label: "Remise", class: "bg-success/10 text-success" },
  archived: { label: "Archivée", class: "bg-muted text-muted-foreground" },
};

const TYPE_EVT_COLOR: Record<string, string> = {
  REUNION: "bg-primary/10 text-primary",
  RDV: "bg-info/10 text-info",
  DEPLACEMENT: "bg-warning/10 text-warning",
  RAPPEL: "bg-accent text-accent-foreground",
  AUTRE: "bg-muted text-muted-foreground",
};

function formatFCFA(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function formatDateTime(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) +
    " · " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardAssistante() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sbEnAttente: 0,
    sbBrouillons: 0,
    sbMontantMois: 0,
    siATraiter: 0,
    siMontantATraiter: 0,
    evtSemaine: 0,
    annoncesActives: 0,
  });
  const [stockBureau, setStockBureau] = useState<any[]>([]);
  const [factFourn, setFactFourn] = useState<any[]>([]);
  const [evenements, setEvenements] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAll() {
      const now = new Date();
      const moisActuel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const debutSemaine = new Date(now);
      debutSemaine.setHours(0, 0, 0, 0);
      const finSemaine = new Date(now);
      finSemaine.setDate(finSemaine.getDate() + 7);

      const [
        sbAttRes, sbBrouRes, sbMoisRes, sbListRes,
        siAttRes, siListRes,
        evtCountRes, evtListRes,
        annoncesCountRes, annoncesListRes,
      ] = await Promise.all([
        supabase.from("stock_bureau_demandes").select("id", { count: "exact", head: true }).eq("statut", "SOUMISE_DG"),
        supabase.from("stock_bureau_demandes").select("id", { count: "exact", head: true }).eq("statut", "BROUILLON"),
        supabase.from("stock_bureau_demandes").select("montant").in("statut", ["VALIDEE_DG", "PAYEE"]).gte("created_at", `${moisActuel}-01`),
        supabase.from("stock_bureau_demandes").select("id, reference, designation, montant, statut, urgence, created_at")
          .in("statut", ["BROUILLON", "SOUMISE_DG", "VALIDEE_DG"])
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("supplier_invoices").select("amount, status").in("status", ["received", "pending_DG", "approved_for_payment"]),
        supabase.from("supplier_invoices").select("id, reference, amount, status, due_date, invoice_date")
          .in("status", ["received", "pending_DG", "approved_for_payment", "cheque_ready", "processing"])
          .order("due_date", { ascending: true, nullsFirst: false }).limit(5),
        supabase.from("evenements_calendrier").select("id", { count: "exact", head: true })
          .gte("date_debut", debutSemaine.toISOString())
          .lt("date_debut", finSemaine.toISOString()),
        supabase.from("evenements_calendrier").select("id, titre, lieu, date_debut, type_evenement, couleur, toute_journee")
          .gte("date_debut", debutSemaine.toISOString())
          .order("date_debut", { ascending: true }).limit(5),
        supabase.from("annonces").select("id", { count: "exact", head: true }).eq("statut", "actif"),
        supabase.from("annonces").select("id, titre, contenu, created_at").eq("statut", "actif")
          .order("created_at", { ascending: false }).limit(3),
      ]);

      const siATraiter = siAttRes.data?.filter((s: any) => s.status === "received" || s.status === "pending_DG").length || 0;
      const siMontant = (siAttRes.data || []).reduce((s: number, f: any) => s + Number(f.amount || 0), 0);

      setStats({
        sbEnAttente: sbAttRes.count || 0,
        sbBrouillons: sbBrouRes.count || 0,
        sbMontantMois: (sbMoisRes.data || []).reduce((s: number, d: any) => s + Number(d.montant || 0), 0),
        siATraiter,
        siMontantATraiter: siMontant,
        evtSemaine: evtCountRes.count || 0,
        annoncesActives: annoncesCountRes.count || 0,
      });
      setStockBureau(sbListRes.data || []);
      setFactFourn(siListRes.data || []);
      setEvenements(evtListRes.data || []);
      setAnnonces(annoncesListRes.data || []);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const statCards = [
    { label: "Stock Bureau — en attente DG", value: stats.sbEnAttente, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Brouillons à finaliser", value: stats.sbBrouillons, icon: FileText, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "Factures fournisseurs à traiter", value: stats.siATraiter, icon: FileSignature, color: "text-primary", bg: "bg-primary/10" },
    { label: "Événements cette semaine", value: stats.evtSemaine, icon: Calendar, color: "text-info", bg: "bg-info/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Assistante DG — vos missions du jour</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/calendrier"><Calendar className="h-4 w-4 mr-1.5" /> Calendrier DG</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/stock-bureau"><Plus className="h-4 w-4 mr-1.5" /> Demande Stock Bureau</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Montants engagés */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border border-border shadow-none">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Stock Bureau — engagé ce mois</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{loading ? "—" : formatFCFA(stats.sbMontantMois)}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3"><Briefcase className="h-6 w-6 text-primary" /></div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-none">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Factures fournisseurs en attente</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{loading ? "—" : formatFCFA(stats.siMontantATraiter)}</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-3"><FileSignature className="h-6 w-6 text-warning" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Stock Bureau */}
        <Card className="border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Demandes Stock Bureau
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/stock-bureau">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>
            ) : stockBureau.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success/40 mb-2" />
                <p className="text-sm">Aucune demande active</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stockBureau.map((d: any) => {
                  const cfg = SB_STATUT[d.statut] || SB_STATUT.BROUILLON;
                  return (
                    <Link key={d.id} to="/stock-bureau" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{d.reference}</span>
                          <Badge variant="outline" className={`border-0 text-[10px] ${cfg.class}`}>{cfg.label}</Badge>
                          {(d.urgence === "HAUTE" || d.urgence === "CRITIQUE") && (
                            <Badge variant="outline" className="border-0 text-[10px] bg-destructive/10 text-destructive">{d.urgence}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground mt-0.5 truncate">{d.designation}</p>
                      </div>
                      <p className="text-sm text-primary font-semibold whitespace-nowrap">{formatFCFA(Number(d.montant))}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Factures fournisseurs */}
        <Card className="border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-warning" /> Factures fournisseurs
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/factures-fournisseurs">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>
            ) : factFourn.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success/40 mb-2" />
                <p className="text-sm">Aucune facture en attente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {factFourn.map((f: any) => {
                  const cfg = SI_STATUT[f.status] || SI_STATUT.EN_ATTENTE;
                  const isLate = f.due_date && new Date(f.due_date) < new Date();
                  return (
                    <Link key={f.id} to="/factures-fournisseurs" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{f.reference}</span>
                          <Badge variant="outline" className={`border-0 text-[10px] ${cfg.class}`}>{cfg.label}</Badge>
                          {isLate && (
                            <Badge variant="outline" className="border-0 text-[10px] bg-destructive/10 text-destructive">
                              <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> Échue
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.due_date ? `Échéance : ${new Date(f.due_date).toLocaleDateString("fr-FR")}` : `Émise : ${new Date(f.invoice_date).toLocaleDateString("fr-FR")}`}
                        </p>
                      </div>
                      <p className="text-sm text-warning font-semibold whitespace-nowrap">{formatFCFA(Number(f.amount))}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendrier DG */}
        <Card className="border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-info" /> Prochains événements DG
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/calendrier">Calendrier <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>
            ) : evenements.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm">Aucun événement à venir</p>
              </div>
            ) : (
              <div className="space-y-2">
                {evenements.map((e: any) => {
                  const colorClass = TYPE_EVT_COLOR[e.type_evenement] || TYPE_EVT_COLOR.AUTRE;
                  return (
                    <Link key={e.id} to="/calendrier" className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: e.couleur || "hsl(var(--primary))" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`border-0 text-[10px] ${colorClass}`}>{e.type_evenement}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {e.toute_journee
                              ? new Date(e.date_debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " · journée"
                              : formatDateTime(e.date_debut)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground mt-0.5 truncate">{e.titre}</p>
                        {e.lieu && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {e.lieu}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Annonces */}
        <Card className="border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-accent-foreground" /> Annonces récentes
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/annonces">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Chargement...</div>
            ) : annonces.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm">Aucune annonce active</p>
              </div>
            ) : (
              <div className="space-y-2">
                {annonces.map((a: any) => (
                  <Link key={a.id} to="/annonces" className="block rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{a.titre}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    {a.contenu && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.contenu}</p>
                    )}
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
