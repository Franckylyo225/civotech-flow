import { useState } from "react";
import { useDevisStore } from "@/hooks/use-devis-store";
import { useGrilleTarifaireStore } from "@/hooks/use-grille-tarifaire-store";
import DevisListPage from "./DevisListPage";
import DevisCreateDialog from "./DevisCreateDialog";
import DevisDetailPage from "./DevisDetailPage";
import GrilleTarifairePage from "./GrilleTarifairePage";
import { Loader2, FileText, TableProperties } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { DevisStatut } from "@/types/devis";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DevisModule() {
  const { devisList, clients, loading, addDevis, updateDevis, updateStatut, createOperationFromDevis } = useDevisStore();
  const { tarifs } = useGrilleTarifaireStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<"devis" | "grille">("devis");

  const selectedDevis = devisList.find((d) => d.id === selectedId);

  const handleQuickAction = (devisId: string, newStatut: DevisStatut) => {
    updateStatut(devisId, newStatut);
    toast.success("Statut mis à jour");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { key: "devis" as const, label: "Devis", icon: FileText },
    { key: "grille" as const, label: "Grille tarifaire", icon: TableProperties },
  ];

  return (
    <>
      <div className="flex items-center gap-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "devis" ? (
        <>
          <DevisListPage
            devisList={devisList}
            onSelectDevis={(id) => setSelectedId(id)}
            onNewDevis={() => setShowCreate(true)}
            onQuickAction={handleQuickAction}
          />
          <DevisCreateDialog
            open={showCreate}
            onOpenChange={setShowCreate}
            clients={clients}
            tarifs={tarifs.filter((t) => t.actif)}
            onSave={addDevis}
          />
        </>
      ) : (
        <GrilleTarifairePage />
      )}

      <Dialog open={!!selectedDevis} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          {selectedDevis && (
            <DevisDetailPage
              devis={selectedDevis}
              onUpdateStatut={updateStatut}
              onUpdateDevis={updateDevis}
              onCreateOperation={createOperationFromDevis}
              onBack={() => setSelectedId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
