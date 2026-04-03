import { useState } from "react";
import { useDevisStore } from "@/hooks/use-devis-store";
import DevisListPage from "./DevisListPage";
import DevisCreateDialog from "./DevisCreateDialog";
import DevisDetailPage from "./DevisDetailPage";
import { Loader2 } from "lucide-react";

export default function DevisModule() {
  const { devisList, clients, loading, addDevis, updateDevis, updateStatut, createOperationFromDevis } = useDevisStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const selectedDevis = devisList.find((d) => d.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedDevis) {
    return (
      <DevisDetailPage
        devis={selectedDevis}
        onUpdateStatut={updateStatut}
        onCreateOperation={createOperationFromDevis}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <>
      <DevisListPage
        devisList={devisList}
        onSelectDevis={(id) => setSelectedId(id)}
        onNewDevis={() => setShowCreate(true)}
      />
      <DevisCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        clients={clients}
        onSave={addDevis}
      />
    </>
  );
}
