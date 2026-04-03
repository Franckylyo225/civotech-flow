import { useState, useEffect, useMemo } from "react";
import { Search, Filter, MapPin, ArrowRight, CalendarIcon, X } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { useOperationsStore } from "@/hooks/use-operations-store";
import type { Operation, OperationStatut } from "@/types/operations";
import { OPERATION_STATUT_CONFIG } from "@/types/operations";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import OperationDetail from "./OperationDetail";

type PeriodFilter = "ALL" | "TODAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "ALL", label: "Toute période" },
  { value: "TODAY", label: "Aujourd'hui" },
  { value: "WEEK", label: "Cette semaine" },
  { value: "MONTH", label: "Ce mois" },
  { value: "QUARTER", label: "Ce trimestre" },
  { value: "YEAR", label: "Cette année" },
];

function getDateRange(period: PeriodFilter): { start: Date; end: Date } | null {
  if (period === "ALL") return null;
  const now = new Date();
  switch (period) {
    case "TODAY": return { start: startOfDay(now), end: endOfDay(now) };
    case "WEEK": return { start: startOfWeek(now, { locale: fr }), end: endOfWeek(now, { locale: fr }) };
    case "MONTH": return { start: startOfMonth(now), end: endOfMonth(now) };
    case "QUARTER": return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "YEAR": return { start: startOfYear(now), end: endOfYear(now) };
  }
}

const TABS: { label: string; statut: OperationStatut | "ALL" }[] = [
  { label: "Toutes", statut: "ALL" },
  { label: "Demandes", statut: "DEMANDE" },
  { label: "Planifiées", statut: "PLANIFIEE" },
  { label: "En transit", statut: "EN_COURS" },
  { label: "Livrées", statut: "TERMINEE" },
];

export default function OperationsModule() {
  const { operations, camions, chauffeurs, loading, updateStatut, affecterOperation, addDepense, planifierOperation, addIncident, toggleIncidentResolu, updateOperation } = useOperationsStore();
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<OperationStatut | "ALL">("ALL");
  const [period, setPeriod] = useState<PeriodFilter>("ALL");

  useEffect(() => {
    if (operations.length > 0 && !selectedId) setSelectedId(operations[0].id);
  }, [operations, selectedId]);

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Chargement des opérations...</div>;

  const dateRange = getDateRange(period);

  const filtered = operations.filter((o) => {
    const matchSearch =
      o.reference.toLowerCase().includes(search.toLowerCase()) ||
      o.clientNom.toLowerCase().includes(search.toLowerCase()) ||
      o.lieuEmbarquement.toLowerCase().includes(search.toLowerCase()) ||
      o.lieuLivraison.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "ALL" || o.statut === activeTab;
    const matchPeriod = !dateRange || (new Date(o.createdAt) >= dateRange.start && new Date(o.createdAt) <= dateRange.end);
    return matchSearch && matchTab && matchPeriod;
  });

  const selectedOp = operations.find((o) => o.id === selectedId);

  const getCounts = (statut: OperationStatut | "ALL") => {
    if (statut === "ALL") return filtered.length;
    return filtered.filter((o) => o.statut === statut).length;
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 -m-6">
      {/* Left panel — operations list */}
      <div className="w-[340px] shrink-0 border-r border-border bg-card flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3">Opérations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher ici..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted border-0"
            />
          </div>
          <div className="mt-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="bg-muted border-0 text-xs h-8">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap border-b border-border px-3 gap-0.5 py-1">
          {TABS.map((tab) => {
            const count = getCounts(tab.statut);
            const isActive = activeTab === tab.statut;
            return (
              <button
                key={tab.statut}
                onClick={() => setActiveTab(tab.statut)}
                className={cn(
                  "px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.label} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((op) => {
            const isSelected = op.id === selectedId;
            const config = OPERATION_STATUT_CONFIG[op.statut];
            return (
              <button
                key={op.id}
                onClick={() => setSelectedId(op.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-border transition-colors",
                  isSelected
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : "hover:bg-muted/50 border-l-2 border-l-transparent"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-foreground">{op.reference}</span>
                  <Badge variant="outline" className={cn("border-0 text-[10px] font-medium", config.bgColor, config.color)}>
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{op.clientNom}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{op.lieuEmbarquement.split(",")[0]}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                  <span className="truncate">{op.lieuLivraison.split(",")[0]}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aucune opération trouvée
            </div>
          )}
        </div>
      </div>

      {/* Right panel — detail */}
      <div className="flex-1 overflow-y-auto bg-background">
        {selectedOp ? (
          <OperationDetail
            operation={selectedOp}
            camions={camions}
            chauffeurs={chauffeurs}
            onUpdateStatut={updateStatut}
            onAffecter={affecterOperation}
            onAddDepense={addDepense}
            onPlanifier={planifierOperation}
            onAddIncident={addIncident}
            onToggleIncidentResolu={toggleIncidentResolu}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Sélectionnez une opération
          </div>
        )}
      </div>
    </div>
  );
}
