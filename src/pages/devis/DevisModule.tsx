import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useDevisStore } from "@/hooks/use-devis-store";
import DevisListPage from "./DevisListPage";
import DevisCreatePage from "./DevisCreatePage";
import DevisDetailPage from "./DevisDetailPage";

export default function DevisModule() {
  const { devisList, clients, addDevis, updateStatut } = useDevisStore();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedDevis = devisList.find((d) => d.id === selectedId);

  if (selectedDevis) {
    return (
      <DevisDetailPage
        devis={selectedDevis}
        onUpdateStatut={(id, statut, comment) => {
          updateStatut(id, statut, comment);
        }}
      />
    );
  }

  return (
    <DevisListPage
      devisList={devisList}
      onSelectDevis={(id) => setSelectedId(id)}
    />
  );
}
