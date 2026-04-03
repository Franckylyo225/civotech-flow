import { useState } from "react";
import { useDevisStore } from "@/hooks/use-devis-store";
import DevisListPage from "./DevisListPage";
import DevisCreatePage from "./DevisCreatePage";
import DevisDetailPage from "./DevisDetailPage";
import { Loader2 } from "lucide-react";

export default function DevisModule() {
  const { devisList, clients, loading, addDevis, updateStatut, createOperationFromDevis } = useDevisStore();
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

  if (showCreate) {
    return (
      <DevisCreatePage
        clients={clients}
        onSave={async (data) => {
          await addDevis(data);
          setShowCreate(false);
        }}
        onCancel={() => setShowCreate(false)}
      />
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
    <DevisListPage
      devisList={devisList}
      onSelectDevis={(id) => setSelectedId(id)}
      onNewDevis={() => setShowCreate(true)}
    />
  );
}
