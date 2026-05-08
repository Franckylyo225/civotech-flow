import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight,
  FileText, ShoppingCart, Receipt, ClipboardCheck, Truck,
  CheckCircle2, Calendar,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useDashboardDG, OBJECTIF_CA_DEFAUT,
  type Periode, type DashboardDGApprobation,
} from "@/hooks/use-dashboard-dg";
import { formatFCFA, formatFCFACompact, formatRelativeTime } from "@/utils/format";

const PERIODES: { id: Periode; label: string }[] = [
  { id: "7j", label: "7j" },
  { id: "mois", label: "Ce mois" },
  { id: "trimestre", label: "Trimestre" },
  { id: "annee", label: "Année" },
];

// ─────────────────────────── Period selector ───────────────────────────
function PeriodeSwitcher({ value, onChange }: { value: Periode; onChange: (p: Periode) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-[3px]">
      {PERIODES.map(p => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-colors",
              active ? "bg-background border border-border font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Banner ───────────────────────────
function AlertBanner({ items }: { items: { type: string; count: number; label: string }[] }) {
  const navigate = useNavigate();
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-3.5 py-2.5"
      style={{ backgroundColor: "#FFFBEB", borderColor: "#EF9F27", borderWidth: 0.5 }}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#EF9F27" }} />
      <p className="text-sm flex-1" style={{ color: "#7B5414" }}>
        <span className="font-semibold">{total} action{total > 1 ? "s" : ""} requise{total > 1 ? "s" : ""} :</span>{" "}
        {items.map(i => i.label).join(" · ")}
      </p>
      <Button
        size="sm" variant="ghost"
        className="h-7 text-xs font-medium text-primary hover:text-primary"
        onClick={() => navigate("/approbations")}
      >
        Tout voir <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}

// ─────────────────────────── KPI Card ───────────────────────────
function KpiCard({
  icon, label, value, valueColor, sub, subColor, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  sub?: React.ReactNode;
  subColor?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left bg-card rounded-lg border border-border p-4 transition-colors w-full",
        onClick && "hover:bg-muted/40 cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="rounded-lg bg-muted p-2 text-base leading-none">{icon}</div>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-0.5 truncate" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-1 truncate" style={{ color: subColor || "hsl(var(--muted-foreground))" }}>
          {sub}
        </p>
      )}
    </button>
  );
}

// ─────────────────────────── Custom SVG bar chart ───────────────────────────
function CABarChart({ data }: { data: { mois: string; caFCFA: number; objectifFCFA: number }[] }) {
  const max = Math.max(...data.map(d => Math.max(d.caFCFA, d.objectifFCFA)), 1);
  const W = 600;
  const H = 200;
  const pad = { l: 10, r: 10, t: 10, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const barW = innerW / data.length * 0.55;
  const stepX = innerW / data.length;
  const objY = pad.t + innerH - (data[0]?.objectifFCFA || 0) / max * innerH;
  const lastIdx = data.length - 1;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[200px] sm:h-[240px]" preserveAspectRatio="none">
        <line
          x1={pad.l} y1={objY} x2={W - pad.r} y2={objY}
          stroke="#D1D5DB" strokeDasharray="4 4" strokeWidth={1}
        />
        {data.map((d, i) => {
          const h = (d.caFCFA / max) * innerH;
          const x = pad.l + i * stepX + (stepX - barW) / 2;
          const y = pad.t + innerH - h;
          const fill = i === lastIdx ? "#0F6E56" : "#9FE1CB";
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx={3} fill={fill}>
                <title>{d.mois} : {formatFCFA(d.caFCFA)}</title>
              </rect>
              <text
                x={x + barW / 2} y={H - 10}
                textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))"
              >
                {d.mois}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0F6E56" }} /> CA mensuel
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#9FE1CB" }} /> Mois précédents
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-px w-3 border-t border-dashed border-border" /> Objectif
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────── Approbation Item ───────────────────────────
const APPRO_TYPE = {
  DEVIS: { icon: <FileText className="h-4 w-4" style={{ color: "#185FA5" }} />, bg: "#E6F1FB" },
  ACHAT: { icon: <ShoppingCart className="h-4 w-4" style={{ color: "#A32D2D" }} />, bg: "#FCEBEB" },
  FACTURE_FOURN: { icon: <Receipt className="h-4 w-4" style={{ color: "#BA7517" }} />, bg: "#FAEEDA" },
} as const;

function ApprobationCard({
  item, onApprove, onReject,
}: {
  item: DashboardDGApprobation;
  onApprove: (item: DashboardDGApprobation) => void;
  onReject: (item: DashboardDGApprobation) => void;
}) {
  const cfg = APPRO_TYPE[item.type];
  return (
    <div className="rounded-lg border border-border p-3 bg-card">
      <div className="flex items-start gap-2.5">
        <div
          className="flex items-center justify-center rounded-md shrink-0"
          style={{ backgroundColor: cfg.bg, width: 30, height: 30, borderRadius: 7 }}
        >
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-medium text-foreground truncate">{item.titre}</p>
            {item.urgent && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">URGENT</span>
            )}
          </div>
          <p className={cn("text-[10px] mt-0.5", item.urgent ? "text-destructive" : "text-muted-foreground")}>
            {formatFCFA(item.montantFCFA)} · soumis {formatRelativeTime(item.createdAt)} par {item.soumisParPrenom}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              onClick={() => onApprove(item)}
              className="text-[10px] px-2 py-1 rounded-md font-medium hover:opacity-80"
              style={{ backgroundColor: "#EAF3DE", color: "#27500A" }}
            >
              ✓ Approuver
            </button>
            <button
              onClick={() => onReject(item)}
              className="text-[10px] px-2 py-1 rounded-md font-medium hover:opacity-80"
              style={{ backgroundColor: "#FCEBEB", color: "#791F1F" }}
            >
              ✗ Refuser
            </button>
            <Link
              to={item.lien}
              className="text-[10px] px-2 py-1 rounded-md font-medium text-muted-foreground hover:bg-muted"
            >
              Voir
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Main ───────────────────────────
const STATUT_BADGE: Record<string, { label: string; className: string }> = {
  EN_COURS: { label: "En cours", className: "bg-info/10 text-info" },
  PLANIFIEE: { label: "Planifiée", className: "bg-warning/10 text-warning" },
  TERMINEE: { label: "Terminée", className: "bg-success/10 text-success" },
  DEMANDE: { label: "Demande", className: "bg-muted text-muted-foreground" },
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  REUNION: "bg-info/10 text-info",
  RDV: "bg-primary/10 text-primary",
  DEPLACEMENT: "bg-warning/10 text-warning",
  RAPPEL: "bg-destructive/10 text-destructive",
  AUTRE: "bg-muted text-muted-foreground",
};

export default function DashboardDG() {
  const navigate = useNavigate();
  const [periode, setPeriode] = useState<Periode>("mois");
  const { data, isLoading, refetch } = useDashboardDG(periode);

  // Optimistic removal of approbations after action
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<DashboardDGApprobation | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const visibleApprobations = useMemo(() => {
    if (!data) return [];
    return data.approbations.filter(a => !removedIds.has(a.id));
  }, [data, removedIds]);

  async function approveItem(item: DashboardDGApprobation) {
    setRemovedIds(prev => new Set(prev).add(item.id));
    try {
      if (item.type === "DEVIS") {
        await supabase.from("devis").update({ statut: "APPROUVE_DG" }).eq("id", item.id);
      } else if (item.type === "ACHAT") {
        await supabase.from("demandes_achat").update({ statut: "VALIDEE_DG" }).eq("id", item.id);
      } else {
        await supabase.from("supplier_invoices").update({ status: "approved_for_payment" }).eq("id", item.id);
      }
      toast.success("Approuvé · notification envoyée");
    } catch (e: any) {
      toast.error("Erreur : " + (e?.message || "approbation"));
      setRemovedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const item = rejectTarget;
    setRejectTarget(null);
    setRemovedIds(prev => new Set(prev).add(item.id));
    try {
      if (item.type === "DEVIS") {
        await supabase.from("devis").update({ statut: "REFUSE_DG", commentaire_refus: rejectReason || null }).eq("id", item.id);
      } else if (item.type === "ACHAT") {
        await supabase.from("demandes_achat").update({ statut: "REFUSEE_DG", commentaire_dg: rejectReason || null }).eq("id", item.id);
      } else {
        await supabase.from("supplier_invoices").update({ status: "archived" }).eq("id", item.id);
      }
      toast.success("Refusé");
    } catch (e: any) {
      toast.error("Erreur refus : " + (e?.message || ""));
      setRemovedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    } finally {
      setRejectReason("");
    }
  }

  // Layout helpers
  const k = data?.kpis;
  const evol = k?.evolutionCaPct;
  const total6mois = (data?.evolutionCA || []).reduce((s, m) => s + m.caFCFA, 0);
  const meilleur = (data?.evolutionCA || []).reduce((best, m) => (m.caFCFA > (best?.caFCFA || 0) ? m : best), null as any);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble — Direction Générale</p>
        </div>
        <PeriodeSwitcher value={periode} onChange={setPeriode} />
      </div>

      {/* Banner */}
      {data && <AlertBanner items={data.alertesUrgentes} />}

      {/* KPIs — 5 cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {isLoading || !k ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <KpiCard
              icon="💰" label="CA du mois"
              value={<span className="text-base sm:text-lg">{formatFCFACompact(k.caMoisFCFA).replace(" FCFA", "")}</span>}
              sub={
                <span>
                  FCFA · {evol === null ? <span className="text-muted-foreground">Nouveau</span>
                    : <span style={{ color: evol >= 0 ? "#10B981" : "#EF4444" }}>
                      {evol >= 0 ? "+" : ""}{evol}% vs préc.
                    </span>}
                </span>
              }
              onClick={() => navigate("/factures")}
            />
            <KpiCard
              icon="📋" label="Devis en cours"
              value={k.nbDevisEnCours}
              sub={k.nbDevisAValider > 0 ? `dont ${k.nbDevisAValider} à valider` : "à jour"}
              subColor={k.nbDevisAValider > 0 ? "#BA7517" : undefined}
              onClick={() => navigate("/devis")}
            />
            <KpiCard
              icon="🚛" label="Missions actives"
              value={k.nbMissionsActives}
              valueColor="#185FA5"
              sub={`${k.nbMissionsPlanifiees} planifiée${k.nbMissionsPlanifiees > 1 ? "s" : ""}`}
              onClick={() => navigate("/operations")}
            />
            <KpiCard
              icon="💸" label="Factures impayées"
              value={<span className="text-base">{formatFCFACompact(k.facturesImpayeesFCFA).replace(" FCFA", "")}</span>}
              valueColor={k.facturesImpayeesFCFA > 0 ? "#A32D2D" : undefined}
              sub={`${k.nbClientsDebiteurs} client${k.nbClientsDebiteurs > 1 ? "s" : ""} débiteur${k.nbClientsDebiteurs > 1 ? "s" : ""}`}
              onClick={() => navigate("/finance")}
            />
            <KpiCard
              icon="✅" label="Approbations"
              value={k.nbApprobationsEnAttente}
              valueColor={k.nbApprobationsEnAttente > 0 ? "#BA7517" : "#10B981"}
              sub="en attente de validation"
              onClick={() => navigate("/approbations")}
            />
          </>
        )}
      </div>

      {/* Chart + Approbations */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Évolution du CA — 6 derniers mois</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading || !data ? (
              <Skeleton className="h-[240px]" />
            ) : (
              <>
                <CABarChart data={data.evolutionCA} />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border">
                  <span>Total 6 mois : <span className="font-medium text-foreground">{formatFCFA(total6mois)}</span></span>
                  {meilleur && (
                    <span>Meilleur mois : <span className="font-medium text-foreground">{meilleur.mois} — {formatFCFA(meilleur.caFCFA)}</span></span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Approbations
              {visibleApprobations.length > 0 && (
                <Badge variant="outline" className="border-0 bg-destructive/10 text-destructive text-xs">{visibleApprobations.length}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/approbations">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 max-h-[420px] overflow-y-auto">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : visibleApprobations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success/40 mb-2" />
                <p className="text-sm">Aucune demande en attente</p>
              </div>
            ) : (
              visibleApprobations.slice(0, 5).map(item => (
                <ApprobationCard key={item.id} item={item} onApprove={approveItem} onReject={setRejectTarget} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operations + Débiteurs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Opérations en cours</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/operations">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {data && (
              <div className="flex flex-wrap gap-1.5">
                {[
                  { lbl: "En cours", val: data.statsOperations.enCours, color: "bg-info/15 text-info" },
                  { lbl: "Planifiées", val: data.statsOperations.planifiees, color: "bg-warning/15 text-warning" },
                  { lbl: "Terminées", val: data.statsOperations.terminees, color: "bg-success/15 text-success" },
                  { lbl: "À facturer", val: data.statsOperations.aFacturer, color: "bg-destructive/15 text-destructive" },
                ].map(s => (
                  <div key={s.lbl} className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5">
                    <span className="text-[11px] text-muted-foreground">{s.lbl}</span>
                    <span className={cn("text-[11px] font-semibold px-1.5 rounded", s.color)}>{s.val}</span>
                  </div>
                ))}
              </div>
            )}
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : (data?.operationsEnCours || []).length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucune opération en cours</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-2 font-medium">Réf.</th>
                      <th className="text-left py-2 pr-2 font-medium">Client</th>
                      <th className="text-left py-2 pr-2 font-medium">Trajet</th>
                      <th className="text-left py-2 pr-2 font-medium">Chauffeur</th>
                      <th className="text-left py-2 pr-2 font-medium">Camion</th>
                      <th className="text-left py-2 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(data?.operationsEnCours || []).map(op => {
                      const b = STATUT_BADGE[op.statut] || { label: op.statut, className: "bg-muted text-muted-foreground" };
                      return (
                        <tr key={op.id} className="hover:bg-muted/40">
                          <td className="py-2 pr-2 font-mono text-xs">{op.reference}</td>
                          <td className="py-2 pr-2 truncate max-w-[120px]">{op.client}</td>
                          <td className="py-2 pr-2 text-xs text-muted-foreground truncate max-w-[140px]">{op.trajet}</td>
                          <td className="py-2 pr-2 text-xs">{op.chauffeur}</td>
                          <td className="py-2 pr-2 text-xs font-mono">{op.camion}</td>
                          <td className="py-2">
                            <Badge variant="outline" className={cn("border-0 text-[10px] font-medium", b.className)}>
                              {b.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Clients débiteurs</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link to="/finance">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)
            ) : (data?.clientsDebiteurs || []).length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucun client débiteur</div>
            ) : (
              <>
                {data!.clientsDebiteurs.map((c, i) => {
                  const badge = c.joursRetard <= 0 ? null
                    : c.joursRetard < 15 ? { bg: "#FAEEDA", color: "#633806", label: `${c.joursRetard}j` }
                    : c.joursRetard <= 30 ? { bg: "#FCEBEB", color: "#791F1F", label: `${c.joursRetard}j` }
                    : { bg: "#991B1B", color: "#fff", label: `${c.joursRetard}j · RELANCE` };
                  return (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{c.clientNom}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{c.factureRef}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold" style={{ color: "#A32D2D" }}>{formatFCFA(c.montantFCFA)}</p>
                        {badge && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded inline-block mt-0.5 font-medium"
                            style={{ backgroundColor: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border flex justify-between">
                  <span className="text-xs text-muted-foreground">Total dû</span>
                  <span className="text-xs font-semibold" style={{ color: "#A32D2D" }}>
                    {formatFCFA(data!.clientsDebiteurs.reduce((s, c) => s + c.montantFCFA, 0))}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Top clients + (Parc + Agenda) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Top clients par CA — {PERIODES.find(p => p.id === periode)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-7" />)
            ) : (data?.topClients || []).length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Aucun client sur la période</div>
            ) : (
              data!.topClients.map((c, i) => {
                const max = Math.max(...data!.topClients.map(x => x.caFCFA), 1);
                const pct = (c.caFCFA / max) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-[110px] shrink-0">
                      <p className="text-xs font-medium truncate">{c.clientNom}</p>
                      <p className="text-[10px] text-muted-foreground">{c.nbOperations} opération{c.nbOperations > 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#F3F4F6" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#0F6E56" }} />
                    </div>
                    <div className="text-right w-[110px]">
                      <span className="text-xs font-semibold" style={{ color: "#0F6E56" }}>{formatFCFA(c.caFCFA)}</span>
                    </div>
                  </div>
                );
              })
            )}

            {data && (
              <div className="pt-3 mt-3 border-t border-border space-y-2">
                <p className="text-xs font-medium">Répartition CA par type de trajet</p>
                <div className="flex h-2 rounded overflow-hidden bg-muted">
                  <div style={{ width: `${data.repartitionTrajet.interVillesPct}%`, backgroundColor: "#0F6E56" }} />
                  <div style={{ width: `${data.repartitionTrajet.portPct}%`, backgroundColor: "#185FA5" }} />
                  <div style={{ width: `${data.repartitionTrajet.localPct}%`, backgroundColor: "#BA7517" }} />
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#0F6E56" }} /> Inter-villes {data.repartitionTrajet.interVillesPct}%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#185FA5" }} /> Port {data.repartitionTrajet.portPct}%</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#BA7517" }} /> Local {data.repartitionTrajet.localPct}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Parc */}
          <Card className="border border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> État du parc
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary text-xs gap-1 h-7" asChild>
                <Link to="/parc-auto">Voir <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {isLoading || !data ? (
                <Skeleton className="h-16" />
              ) : (
                <>
                  {data.parcStatus.total > 0 && (
                    <div className="flex h-1.5 gap-0.5 rounded overflow-hidden">
                      <div style={{ flex: data.parcStatus.disponibles, backgroundColor: "#10B981" }} />
                      <div style={{ flex: data.parcStatus.enMission, backgroundColor: "#185FA5" }} />
                      <div style={{ flex: data.parcStatus.enMaintenance, backgroundColor: "#BA7517" }} />
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground flex gap-2">
                    <span>{data.parcStatus.disponibles} dispo</span>·
                    <span>{data.parcStatus.enMission} mission</span>·
                    <span>{data.parcStatus.enMaintenance} maint.</span>
                  </p>
                  {data.parcStatus.docsExpirant > 0 && (
                    <p className="text-[11px]" style={{ color: "#BA7517" }}>
                      ⚠ Docs expirant : {data.parcStatus.docsExpirant} véhicule{data.parcStatus.docsExpirant > 1 ? "s" : ""}
                    </p>
                  )}
                  {data.parcStatus.maintRetard > 0 && (
                    <p className="text-[11px] text-destructive">
                      ⚠ Maint. en retard : {data.parcStatus.maintRetard} · {data.parcStatus.maintRetardJoursMax}j
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Agenda */}
          <Card className="border border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Agenda à venir
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary text-xs gap-1 h-7" asChild>
                <Link to="/calendrier">Voir <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {isLoading ? (
                <Skeleton className="h-20" />
              ) : (data?.agenda || []).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Calendar className="mx-auto h-7 w-7 text-muted-foreground/40 mb-1" />
                  <p className="text-xs">Aucun événement à venir</p>
                </div>
              ) : (
                data!.agenda.map(ev => (
                  <Link key={ev.id} to="/calendrier" className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/40">
                    <div className="flex flex-col items-center w-9 shrink-0">
                      <span className="text-base font-bold leading-none" style={{ color: "#0F6E56" }}>
                        {format(parseISO(ev.dateDebut), "dd")}
                      </span>
                      <span className="text-[9px] uppercase text-muted-foreground mt-0.5">
                        {format(parseISO(ev.dateDebut), "MMM", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ev.titre}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {format(parseISO(ev.dateDebut), "HH:mm")}{ev.lieu ? ` · ${ev.lieu}` : ""}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Motif du refus</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Précisez la raison..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmReject}>Confirmer le refus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
