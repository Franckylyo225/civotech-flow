import { Routes, Route, useNavigate } from "react-router-dom";
import { useDevisStore } from "@/hooks/use-devis-store";
import DevisListPage from "./DevisListPage";
import DevisFormPage from "./DevisFormPage";
import GrilleTarifairePage from "./GrilleTarifairePage";
import { Loader2, FileText, TableProperties } from "lucide-react";
import type { DevisStatut } from "@/types/devis";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";

function DevisIndex() {
  const { devisList, loading, updateStatut } = useDevisStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"devis" | "grille">("devis");

  const handleQuickAction = (devisId: string, newStatut: DevisStatut) => {
    updateStatut(devisId, newStatut);
    toast.success("Statut mis à jour");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const tabs = [
    { key: "devis" as const, label: "Devis", icon: FileText },
    { key: "grille" as const, label: "Grille tarifaire", icon: TableProperties },
  ];

  return (
    <>
      <div className="flex items-center gap-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "devis" ? (
        <DevisListPage
          devisList={devisList}
          onSelectDevis={(id) => navigate(`/devis/${id}`)}
          onNewDevis={() => navigate("/devis/nouveau")}
          onQuickAction={handleQuickAction}
        />
      ) : (
        <GrilleTarifairePage />
      )}
    </>
  );
}

export default function DevisModule() {
  return (
    <Routes>
      <Route index element={<DevisIndex />} />
      <Route path="nouveau" element={<DevisFormPage />} />
      <Route path=":id" element={<DevisFormPage />} />
    </Routes>
  );
}
