import { useState, useEffect } from "react";
import { Search, Filter, MapPin, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useOperationsStore } from "@/hooks/use-operations-store";
import type { Operation, OperationStatut } from "@/types/operations";
import { OPERATION_STATUT_CONFIG } from "@/types/operations";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import OperationDetail from "./OperationDetail";

const TABS: { label: string; statut: OperationStatut | "ALL"; count?: (ops: Operation[]) => number }[] = [
  { label: "Toutes", statut: "ALL" },
  { label: "Demandes", statut: "DEMANDE" },
  { label: "Planifiées", statut: "PLANIFIEE" },
  { label: "En transit", statut: "EN_COURS" },
  { label: "Livrées", statut: "TERMINEE" },
];

export default function OperationsModule() {
  const { operations, camions, chauffeurs, loading, updateStatut, affecterOperation, addDepense, planifierOperation, addIncident, toggleIncidentResolu } = useOperationsStore();
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<OperationStatut | "ALL">("ALL");

  useEffect(() => {
    if (operations.length > 0 && !selectedId) setSelectedId(operations[0].id);
  }, [operations, selectedId]);

  if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground">Chargement des opérations...</div>;

  const filtered = operations.filter((o) => {
    const matchSearch =
      o.reference.toLowerCase().includes(search.toLowerCase()) ||
      o.clientNom.toLowerCase().includes(search.toLowerCase()) ||
      o.lieuEmbarquement.toLowerCase().includes(search.toLowerCase()) ||
      o.lieuLivraison.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "ALL" || o.statut === activeTab;
    return matchSearch && matchTab;
  });

  const selectedOp = operations.find((o) => o.id === selectedId);

  const getCounts = (statut: OperationStatut | "ALL") => {
    if (statut === "ALL") return operations.length;
    return operations.filter((o) => o.statut === statut).length;
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
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4 gap-1">
          {TABS.map((tab) => {
            const count = getCounts(tab.statut);
            const isActive = activeTab === tab.statut;
            return (
              <button
                key={tab.statut}
                onClick={() => setActiveTab(tab.statut)}
                className={cn(
                  "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label} ({count})
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
