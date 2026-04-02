import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDevisStore } from "@/hooks/use-devis-store";
import DevisListPage from "./DevisListPage";
import DevisCreatePage from "./DevisCreatePage";
import DevisDetailPage from "./DevisDetailPage";

export default function DevisModule() {
  const { devisList, clients, addDevis, updateStatut } = useDevisStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedDevis = devisList.find((d) => d.id === selectedId);

  // Show create form
  const [showCreate, setShowCreate] = useState(false);

  if (showCreate) {
    return (
      <DevisCreatePage
        clients={clients}
        onSave={(data) => {
          addDevis(data);
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
