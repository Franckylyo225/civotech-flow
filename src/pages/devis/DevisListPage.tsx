import { useMemo, useState } from "react";
import {
  Plus, LayoutGrid, List, Search, Download, FileText, Archive,
  Eye, Copy, MoreHorizontal, ArrowUpDown, Send, CheckCircle2, Trash2, Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { Devis, DevisStatut } from "@/types/devis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateDevisPdf } from "@/lib/generate-devis-pdf";

interface DevisListPageProps {
  devisList: Devis[];
  onSelectDevis: (id: string) => void;
  onNewDevis: () => void;
  onQuickAction?: (devisId: string, statut: DevisStatut) => void;
}

// Catégories métier visibles (5 buckets)
type StatutCat = "brouillon" | "attente_dg" | "envoye_client" | "valide_client" | "refuse";

const CAT_CONFIG: Record<StatutCat, {
  label: string; dot: string; valueColor: string; badgeBg: string; badgeText: string;
}> = {
  brouillon:     { label: "Brouillons",     dot: "bg-[#9CA3AF]", valueColor: "text-[#444441]", badgeBg: "bg-[#F1EFE8]", badgeText: "text-[#444441]" },
  attente_dg:    { label: "Attente DG",     dot: "bg-[#EF9F27]", valueColor: "text-[#BA7517]", badgeBg: "bg-[#FAEEDA]", badgeText: "text-[#633806]" },
  envoye_client: { label: "Envoyés client", dot: "bg-[#378ADD]", valueColor: "text-[#185FA5]", badgeBg: "bg-[#E6F1FB]", badgeText: "text-[#0C447C]" },
  valide_client: { label: "Validés",        dot: "bg-[#1D9E75]", valueColor: "text-[#0F6E56]", badgeBg: "bg-[#EAF3DE]", badgeText: "text-[#27500A]" },
  refuse:        { label: "Refusés",        dot: "bg-[#E24B4A]", valueColor: "text-[#A32D2D]", badgeBg: "bg-[#FCEBEB]", badgeText: "text-[#791F1F]" },
};

const SEGMENT_COLOR: Record<StatutCat, string> = {
  brouillon: "bg-[#9CA3AF]",
  attente_dg: "bg-[#EF9F27]",
  envoye_client: "bg-[#378ADD]",
  valide_client: "bg-[#1D9E75]",
  refuse: "bg-[#E24B4A]",
};

function toCat(s: DevisStatut): StatutCat | "archive" {
  switch (s) {
    case "BROUILLON": return "brouillon";
    case "SOUMIS_DG":
    case "APPROUVE_DG": return "attente_dg";
    case "ENVOYE_CLIENT": return "envoye_client";
    case "VALIDE_CLIENT": return "valide_client";
    case "REFUSE_DG":
    case "REFUSE_CLIENT": return "refuse";
    case "ARCHIVE": return "archive";
  }
}

function stepsForCat(cat: StatutCat): { done: number; refused: boolean } {
  switch (cat) {
    case "brouillon": return { done: 1, refused: false };
    case "attente_dg": return { done: 2, refused: false };
    case "envoye_client": return { done: 3, refused: false };
    case "valide_client": return { done: 5, refused: false };
    case "refuse": return { done: 3, refused: true };
  }
}

function formatFCFA(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function inPeriod(iso: string, periode: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  if (periode === "all") return true;
  if (periode === "mois") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (periode === "trimestre") {
    const q = Math.floor(now.getMonth() / 3);
    return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === q;
  }
  if (periode === "annee") return d.getFullYear() === now.getFullYear();
  return true;
}

function expireDate(createdAt: string): string {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

function expireSoon(createdAt: string): boolean {
  const exp = new Date(expireDate(createdAt));
  const diff = (exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff < 7;
}

export default function DevisListPage({ devisList, onSelectDevis, onNewDevis, onQuickAction }: DevisListPageProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | StatutCat>("ALL");
  const [clientFilter, setClientFilter] = useState<string>("ALL");
  const [periodeFilter, setPeriodeFilter] = useState<string>("mois");
  const [showArchived, setShowArchived] = useState(false);
  const [activeKpi, setActiveKpi] = useState<"total" | StatutCat>("total");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<"reference" | "montant" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const isCommercialOrDG = user?.role === "COMMERCIAL" || user?.role === "DG";

  // Liste hors archivés (jamais comptés dans les KPI)
  const baseList = useMemo(
    () => devisList.filter((d) => (showArchived ? d.statut === "ARCHIVE" : d.statut !== "ARCHIVE")),
    [devisList, showArchived],
  );

  const archivedCount = useMemo(() => devisList.filter((d) => d.statut === "ARCHIVE").length, [devisList]);

  const clientsList = useMemo(() => {
    const set = new Map<string, string>();
    devisList.forEach((d) => { if (d.client?.nom) set.set(d.client.nom, d.client.nom); });
    return Array.from(set.values()).sort();
  }, [devisList]);

  // Filtrage avant KPI bucket
  const preFiltered = useMemo(() => {
    return baseList.filter((d) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const inText =
          d.reference.toLowerCase().includes(q) ||
          (d.client?.nom || "").toLowerCase().includes(q) ||
          String(d.montantTotal).includes(q);
        if (!inText) return false;
      }
      const cat = toCat(d.statut);
      if (cat === "archive") return false;
      if (statusFilter !== "ALL" && cat !== statusFilter) return false;
      if (clientFilter !== "ALL" && d.client?.nom !== clientFilter) return false;
      if (!inPeriod(d.createdAt, periodeFilter)) return false;
      return true;
    });
  }, [baseList, searchQuery, statusFilter, clientFilter, periodeFilter]);

  // KPI cards (recalculés sur preFiltered)
  const buckets = useMemo(() => {
    const acc: Record<StatutCat, { count: number; total: number }> = {
      brouillon: { count: 0, total: 0 },
      attente_dg: { count: 0, total: 0 },
      envoye_client: { count: 0, total: 0 },
      valide_client: { count: 0, total: 0 },
      refuse: { count: 0, total: 0 },
    };
    preFiltered.forEach((d) => {
      const c = toCat(d.statut);
      if (c !== "archive") { acc[c].count++; acc[c].total += d.montantTotal; }
    });
    return acc;
  }, [preFiltered]);

  const totalCount = preFiltered.length;
  const totalCA = preFiltered.reduce((s, d) => s + d.montantTotal, 0);

  // Application du filtre KPI actif puis tri
  const filtered = useMemo(() => {
    let arr = preFiltered;
    if (activeKpi !== "total") arr = arr.filter((d) => toCat(d.statut) === activeKpi);
    arr = [...arr].sort((a, b) => {
      let cmp = 0;
      if (sortField === "reference") cmp = a.reference.localeCompare(b.reference);
      else if (sortField === "montant") cmp = a.montantTotal - b.montantTotal;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [preFiltered, activeKpi, sortField, sortDir]);

  const segments = (["attente_dg", "envoye_client", "valide_client", "refuse", "brouillon"] as StatutCat[])
    .map((c) => ({ cat: c, pct: totalCount > 0 ? (buckets[c].count / totalCount) * 100 : 0 }))
    .filter((s) => s.pct > 0);

  const toggleSort = (f: typeof sortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("desc"); }
  };

  const allSelected = filtered.length > 0 && filtered.every((d) => selectedIds.includes(d.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : filtered.map((d) => d.id));
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleExportAll = async () => {
    try {
      for (const d of filtered) await generateDevisPdf(d);
      toast.success(`${filtered.length} devis exportés`);
    } catch (e: any) { toast.error("Erreur export: " + e.message); }
  };

  const handleBulkExport = async () => {
    const list = devisList.filter((d) => selectedIds.includes(d.id));
    try {
      for (const d of list) await generateDevisPdf(d);
      toast.success(`${list.length} devis exportés`);
    } catch (e: any) { toast.error("Erreur export: " + e.message); }
  };

  const handleBulkSubmit = () => {
    if (!onQuickAction) return;
    devisList
      .filter((d) => selectedIds.includes(d.id) && d.statut === "BROUILLON")
      .forEach((d) => onQuickAction(d.id, "SOUMIS_DG"));
    toast.success("Devis soumis au DG");
    setSelectedIds([]);
  };

  const handleBulkArchive = () => {
    if (!onQuickAction) return;
    selectedIds.forEach((id) => onQuickAction(id, "ARCHIVE"));
    toast.success(`${selectedIds.length} devis archivés`);
    setSelectedIds([]);
  };

  const handleDuplicate = (d: Devis) => {
    toast.info(`Duplication de ${d.reference} (à venir)`);
  };

  const kpiCards: { key: "total" | StatutCat; label: string; value: number | string; sub: string; dot?: string; valueColor?: string }[] = [
    { key: "total", label: "Total pipeline", value: totalCount, sub: formatFCFA(totalCA) },
    { key: "attente_dg", label: "Attente DG", value: buckets.attente_dg.count, sub: formatFCFA(buckets.attente_dg.total), dot: CAT_CONFIG.attente_dg.dot, valueColor: CAT_CONFIG.attente_dg.valueColor },
    { key: "envoye_client", label: "Envoyés client", value: buckets.envoye_client.count, sub: formatFCFA(buckets.envoye_client.total), dot: CAT_CONFIG.envoye_client.dot, valueColor: CAT_CONFIG.envoye_client.valueColor },
    { key: "valide_client", label: "Validés", value: buckets.valide_client.count, sub: formatFCFA(buckets.valide_client.total), dot: CAT_CONFIG.valide_client.dot, valueColor: CAT_CONFIG.valide_client.valueColor },
    { key: "refuse", label: "Refusés", value: buckets.refuse.count, sub: "Ce mois", dot: CAT_CONFIG.refuse.dot, valueColor: CAT_CONFIG.refuse.valueColor },
  ];

  return (
    <div className="space-y-5">
      {/* Section 1 — En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestion des devis</h1>
          <p className="text-[13px] text-muted-foreground">
            {totalCount} devis · {formatFCFA(totalCA)} de valeur totale en pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExportAll}>
            <Download className="mr-1.5 h-4 w-4" /> Exporter
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast.info("Modèles bientôt disponibles")}>
            <FileText className="mr-1.5 h-4 w-4" /> Modèles
          </Button>
          {isCommercialOrDG && (
            <Button onClick={onNewDevis} size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Nouveau devis
            </Button>
          )}
        </div>
      </div>

      {/* Section 2 — KPI cards */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpiCards.map((k) => {
            const active = activeKpi === k.key;
            return (
              <button
                key={k.key}
                onClick={() => setActiveKpi(k.key)}
                className={cn(
                  "text-left rounded-[10px] border bg-card px-4 py-3 min-h-[80px] transition-all",
                  active ? "border-2 border-primary" : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-center gap-2">
                  {k.dot && <span className={cn("h-2 w-2 rounded-full", k.dot)} />}
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                </div>
                <div className={cn("text-2xl font-semibold mt-1", k.valueColor || "text-foreground")}>{k.value}</div>
                <div className="text-[11px] text-muted-foreground">{k.sub}</div>
              </button>
            );
          })}
        </div>
        {/* Barre proportions */}
        {totalCount > 0 && (
          <div className="flex h-1.5 gap-[2px] rounded">
            {segments.map((s) => (
              <div
                key={s.cat}
                className={cn("rounded-[2px]", SEGMENT_COLOR[s.cat])}
                style={{ width: `${s.pct}%` }}
                title={`${CAT_CONFIG[s.cat].label} ${Math.round(s.pct)}%`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Section 3 — Filtres */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative flex-1 min-w-[200px] max-w-[400px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence, client, montant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="attente_dg">Attente DG</SelectItem>
              <SelectItem value="envoye_client">Envoyé client</SelectItem>
              <SelectItem value="valide_client">Validé client</SelectItem>
              <SelectItem value="refuse">Refusé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les clients</SelectItem>
              {clientsList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={periodeFilter} onValueChange={setPeriodeFilter}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mois">Ce mois</SelectItem>
              <SelectItem value="trimestre">Ce trimestre</SelectItem>
              <SelectItem value="annee">Cette année</SelectItem>
              <SelectItem value="all">Toutes dates</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showArchived ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="mr-1.5 h-4 w-4" />
            Archivés ({archivedCount})
          </Button>
          <div className="ml-auto flex rounded-md border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon" className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon" className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-[10px] bg-primary/10 border border-primary/30 px-4 py-2.5">
          <span className="text-sm font-medium text-primary">
            {selectedIds.length} devis sélectionné(s)
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkSubmit}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Soumettre au DG
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter PDF
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkArchive}>
              <Archive className="mr-1.5 h-3.5 w-3.5" /> Archiver
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Section 4 — Tableau */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6]">
              <tr className="text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                <th className="w-[36px] px-3 py-2.5">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tout sélectionner" />
                </th>
                <th className="text-left px-3 py-2.5 w-[170px]">
                  <button onClick={() => toggleSort("reference")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Référence <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5">Client</th>
                <th className="text-right px-3 py-2.5 w-[130px]">
                  <button onClick={() => toggleSort("montant")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Montant TTC <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 w-[130px]">Statut</th>
                <th className="text-left px-3 py-2.5 w-[110px]">Progression</th>
                <th className="text-right px-3 py-2.5 w-[90px]">
                  <button onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-right px-3 py-2.5 w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const cat = toCat(d.statut);
                if (cat === "archive" && !showArchived) return null;
                const cfg = cat !== "archive" ? CAT_CONFIG[cat] : null;
                const steps = cat !== "archive" ? stepsForCat(cat) : { done: 0, refused: false };
                const exp = expireDate(d.createdAt);
                const expSoon = expireSoon(d.createdAt);
                const checked = selectedIds.includes(d.id);
                const canSubmit = d.statut === "BROUILLON";
                const canMarkValide = d.statut === "ENVOYE_CLIENT";
                const canSeeOp = d.statut === "VALIDE_CLIENT" || d.statut === "ARCHIVE";

                return (
                  <tr
                    key={d.id}
                    onClick={() => onSelectDevis(d.id)}
                    className="group border-t border-border cursor-pointer hover:bg-[#F9FAFB]"
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className={cn("transition-opacity", checked ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleOne(d.id)} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-[12px] text-foreground">{d.reference}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDate(d.createdAt)} · {d.lignes.length} ligne{d.lignes.length > 1 ? "s" : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] text-foreground">{d.client?.nom || "—"}</div>
                      <div className={cn("text-[10px]", expSoon ? "text-destructive font-medium" : "text-muted-foreground")}>
                        {d.client?.contact || "—"}
                        {cat !== "refuse" && cat !== "archive" && <> · expire {formatDate(exp)}</>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-primary">
                      {formatFCFA(d.montantTotal)}
                    </td>
                    <td className="px-3 py-2.5">
                      {cfg && (
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium", cfg.badgeBg, cfg.badgeText)}>
                          {cfg.label.replace(/s$/, "")}
                        </span>
                      )}
                      {cat === "archive" && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">Archivé</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-[3px]">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1 w-3.5 rounded-[2px]",
                              i < steps.done
                                ? steps.refused ? "bg-[#E24B4A]" : "bg-primary"
                                : "bg-[#D1D5DB]",
                            )}
                          />
                        ))}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {steps.refused ? "Refusé" : `Étape ${steps.done}/5`}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] text-muted-foreground">
                      {formatDate(d.createdAt)}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectDevis(d.id)}
                          className="h-[26px] w-[26px] inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
                          title="Voir"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(d)}
                          className="h-[26px] w-[26px] inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
                          title="Dupliquer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-[26px] w-[26px] inline-flex items-center justify-center rounded-md border border-border hover:bg-muted"
                              title="Plus"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {canSubmit && onQuickAction && (
                              <>
                                <DropdownMenuItem onClick={() => onQuickAction(d.id, "APPROUVE_DG")}>
                                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Valider directement
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onQuickAction(d.id, "SOUMIS_DG")}>
                                  <Send className="mr-2 h-3.5 w-3.5" /> Soumettre au DG
                                </DropdownMenuItem>
                              </>
                            )}
                            {canMarkValide && onQuickAction && (
                              <DropdownMenuItem onClick={() => onQuickAction(d.id, "VALIDE_CLIENT")}>
                                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Marquer validé client
                              </DropdownMenuItem>
                            )}
                            {canSeeOp && (
                              <DropdownMenuItem onClick={() => toast.info("Ouverture opération à venir")}>
                                <LinkIcon className="mr-2 h-3.5 w-3.5" /> Voir l'opération liée
                              </DropdownMenuItem>
                            )}
                            {onQuickAction && d.statut !== "ARCHIVE" && (
                              <DropdownMenuItem onClick={() => onQuickAction(d.id, "ARCHIVE")}>
                                <Archive className="mr-2 h-3.5 w-3.5" /> Archiver
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => toast.info("Suppression à venir")}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                    Aucun devis ne correspond à vos critères
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 5 — Pagination simplifiée (toutes données affichées sur 1 page tant que < pageSize) */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Affichage 1–{filtered.length} sur {filtered.length} devis
            </span>
            <div className="flex items-center gap-2">
              <Select defaultValue="25">
                <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" disabled className="h-8 w-8 p-0">‹</Button>
                <Button size="sm" className="h-8 w-8 p-0">1</Button>
                <Button size="sm" variant="ghost" disabled className="h-8 w-8 p-0">›</Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
