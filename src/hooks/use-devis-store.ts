import { useState, useCallback } from "react";
import type { Devis, DevisStatut, Client, LigneDevis } from "@/types/devis";

const MOCK_CLIENTS: Client[] = [
  { id: "c1", nom: "SOTRA", email: "contact@sotra.ci", telephone: "+225 27 20 25 80 80", adresse: "Boulevard de Vridi", ville: "Abidjan", pays: "Côte d'Ivoire" },
  { id: "c2", nom: "Bolloré Transport", email: "info@bollore.ci", telephone: "+225 27 21 75 10 00", adresse: "Zone Portuaire", ville: "Abidjan", pays: "Côte d'Ivoire" },
  { id: "c3", nom: "CIE Énergie", email: "contact@cie.ci", telephone: "+225 27 20 20 60 00", adresse: "Plateau", ville: "Abidjan", pays: "Côte d'Ivoire" },
  { id: "c4", nom: "Cargill Côte d'Ivoire", email: "ci@cargill.com", telephone: "+225 27 21 25 90 00", adresse: "Zone Industrielle", ville: "San Pedro", pays: "Côte d'Ivoire" },
  { id: "c5", nom: "Orange CI", email: "b2b@orange.ci", telephone: "+225 07 00 00 00", adresse: "Riviera 2", ville: "Abidjan", pays: "Côte d'Ivoire" },
];

const MOCK_DEVIS: Devis[] = [
  {
    id: "d1", reference: "DEV-2025-001", clientId: "c1", client: MOCK_CLIENTS[0],
    lignes: [
      { id: "l1", description: "Transport Abidjan → Bouaké (20T)", quantite: 3, prixUnitaire: 450000, montant: 1350000 },
      { id: "l2", description: "Manutention chargement", quantite: 3, prixUnitaire: 75000, montant: 225000 },
    ],
    montantTotal: 1575000, statut: "BROUILLON", createdBy: "2", createdAt: "2025-03-28T10:00:00Z", updatedAt: "2025-03-28T10:00:00Z",
  },
  {
    id: "d2", reference: "DEV-2025-002", clientId: "c2", client: MOCK_CLIENTS[1],
    lignes: [
      { id: "l3", description: "Transport conteneur 40' — Port → Entrepôt", quantite: 5, prixUnitaire: 350000, montant: 1750000 },
    ],
    montantTotal: 1750000, statut: "SOUMIS_DG", createdBy: "2", createdAt: "2025-03-25T14:30:00Z", updatedAt: "2025-03-26T09:00:00Z",
  },
  {
    id: "d3", reference: "DEV-2025-003", clientId: "c3", client: MOCK_CLIENTS[2],
    lignes: [
      { id: "l4", description: "Transport matériel électrique Abidjan → Yamoussoukro", quantite: 2, prixUnitaire: 500000, montant: 1000000 },
      { id: "l5", description: "Escorte sécurisée", quantite: 2, prixUnitaire: 150000, montant: 300000 },
    ],
    montantTotal: 1300000, statut: "APPROUVE_DG", createdBy: "2", createdAt: "2025-03-20T08:00:00Z", updatedAt: "2025-03-22T11:00:00Z",
  },
  {
    id: "d4", reference: "DEV-2025-004", clientId: "c4", client: MOCK_CLIENTS[3],
    lignes: [
      { id: "l6", description: "Transport cacao San Pedro → Abidjan (30T)", quantite: 10, prixUnitaire: 600000, montant: 6000000 },
    ],
    montantTotal: 6000000, statut: "ENVOYE_CLIENT", createdBy: "2", createdAt: "2025-03-15T09:00:00Z", updatedAt: "2025-03-18T16:00:00Z",
  },
  {
    id: "d5", reference: "DEV-2025-005", clientId: "c5", client: MOCK_CLIENTS[4],
    lignes: [
      { id: "l7", description: "Transport équipements télécom Abidjan → Korhogo", quantite: 1, prixUnitaire: 800000, montant: 800000 },
      { id: "l8", description: "Installation sur site", quantite: 1, prixUnitaire: 200000, montant: 200000 },
    ],
    montantTotal: 1000000, statut: "VALIDE_CLIENT", createdBy: "2", createdAt: "2025-03-10T07:00:00Z", updatedAt: "2025-03-14T10:00:00Z",
  },
  {
    id: "d6", reference: "DEV-2025-006", clientId: "c1", client: MOCK_CLIENTS[0],
    lignes: [
      { id: "l9", description: "Transport pièces détachées Abidjan → Daloa", quantite: 2, prixUnitaire: 380000, montant: 760000 },
    ],
    montantTotal: 760000, statut: "REFUSE_DG", commentaireRefus: "Tarif trop bas, revoir la marge sur ce trajet.", createdBy: "2", createdAt: "2025-03-08T11:00:00Z", updatedAt: "2025-03-09T14:00:00Z",
  },
  {
    id: "d7", reference: "DEV-2025-007", clientId: "c2", client: MOCK_CLIENTS[1],
    lignes: [
      { id: "l10", description: "Transport vrac Port → Zone Industrielle", quantite: 8, prixUnitaire: 280000, montant: 2240000 },
    ],
    montantTotal: 2240000, statut: "REFUSE_CLIENT", createdBy: "2", createdAt: "2025-03-05T10:00:00Z", updatedAt: "2025-03-12T09:00:00Z",
  },
  {
    id: "d8", reference: "DEV-2025-008", clientId: "c3", client: MOCK_CLIENTS[2],
    lignes: [
      { id: "l11", description: "Transport transformateurs Abidjan → Man", quantite: 4, prixUnitaire: 550000, montant: 2200000 },
    ],
    montantTotal: 2200000, statut: "SOUMIS_DG", createdBy: "2", createdAt: "2025-04-01T08:00:00Z", updatedAt: "2025-04-01T08:00:00Z",
  },
];

let nextDevisNum = 9;

export function useDevisStore() {
  const [devisList, setDevisList] = useState<Devis[]>(MOCK_DEVIS);
  const [clients] = useState<Client[]>(MOCK_CLIENTS);

  const addDevis = useCallback((data: { clientId: string; lignes: Omit<LigneDevis, "id" | "montant">[] }) => {
    const client = MOCK_CLIENTS.find((c) => c.id === data.clientId)!;
    const lignes: LigneDevis[] = data.lignes.map((l, i) => ({
      id: `new-l-${Date.now()}-${i}`,
      description: l.description,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      montant: l.quantite * l.prixUnitaire,
    }));
    const montantTotal = lignes.reduce((sum, l) => sum + l.montant, 0);
    const ref = `DEV-2025-${String(nextDevisNum++).padStart(3, "0")}`;
    const now = new Date().toISOString();
    const newDevis: Devis = {
      id: `d-${Date.now()}`, reference: ref, clientId: data.clientId, client,
      lignes, montantTotal, statut: "BROUILLON", createdBy: "2", createdAt: now, updatedAt: now,
    };
    setDevisList((prev) => [newDevis, ...prev]);
    return newDevis;
  }, []);

  const updateStatut = useCallback((devisId: string, newStatut: DevisStatut, commentaire?: string) => {
    setDevisList((prev) =>
      prev.map((d) =>
        d.id === devisId
          ? { ...d, statut: newStatut, commentaireRefus: commentaire || d.commentaireRefus, updatedAt: new Date().toISOString() }
          : d
      )
    );
  }, []);

  return { devisList, clients, addDevis, updateStatut };
}
