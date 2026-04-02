import { useState, useCallback } from "react";
import type { Operation, OperationStatut, Camion, Chauffeur, LigneDepense, CategorieDepense } from "@/types/operations";

const MOCK_CAMIONS: Camion[] = [
  { id: "cam1", immatriculation: "AB-1234-CI", marque: "Renault", modele: "T480", capaciteTonnes: 25, annee: 2022, statut: "EN_MISSION" },
  { id: "cam2", immatriculation: "AB-5678-CI", marque: "Mercedes", modele: "Actros 2645", capaciteTonnes: 30, annee: 2021, statut: "EN_MISSION" },
  { id: "cam3", immatriculation: "AB-9012-CI", marque: "Iveco", modele: "Stralis 460", capaciteTonnes: 28, annee: 2023, statut: "DISPONIBLE" },
  { id: "cam4", immatriculation: "CD-3456-CI", marque: "MAN", modele: "TGS 26.440", capaciteTonnes: 26, annee: 2020, statut: "EN_MAINTENANCE" },
  { id: "cam5", immatriculation: "CD-7890-CI", marque: "Scania", modele: "R450", capaciteTonnes: 32, annee: 2023, statut: "DISPONIBLE" },
];

const MOCK_CHAUFFEURS: Chauffeur[] = [
  { id: "ch1", nom: "Koné", prenom: "Ibrahim", telephone: "+225 07 12 34 56", numeroPermis: "CI-2020-45678", disponible: false },
  { id: "ch2", nom: "Traoré", prenom: "Moussa", telephone: "+225 05 98 76 54", numeroPermis: "CI-2019-32145", disponible: false },
  { id: "ch3", nom: "Diallo", prenom: "Seydou", telephone: "+225 01 45 67 89", numeroPermis: "CI-2021-78901", disponible: true },
  { id: "ch4", nom: "Ouattara", prenom: "Bakary", telephone: "+225 07 65 43 21", numeroPermis: "CI-2022-11234", disponible: true },
];

const MOCK_OPERATIONS: Operation[] = [
  {
    id: "op1", reference: "OP-2025-005", devisReference: "DEV-2025-005",
    clientNom: "Orange CI", camionId: "cam1", camion: MOCK_CAMIONS[0],
    chauffeurId: "ch1", chauffeur: MOCK_CHAUFFEURS[0],
    lieuEmbarquement: "Abidjan, Zone Industrielle", lieuLivraison: "Korhogo, Centre-Ville",
    dateDepart: "2025-04-01T06:00:00Z", dateLivraisonEstimee: "2025-04-02T18:00:00Z",
    dureeEstimeeHeures: 14, statut: "EN_COURS", montantDevis: 1000000,
    poidsKg: 8500, nombreColis: 12,
    depenses: [
      { id: "dep1", operationId: "op1", categorie: "CARBURANT", description: "Plein diesel — Station Total Abidjan", montant: 185000, date: "2025-04-01T05:30:00Z" },
      { id: "dep2", operationId: "op1", categorie: "PEAGE", description: "Péage autoroute Abidjan-Yamoussoukro", montant: 15000, date: "2025-04-01T08:00:00Z" },
    ],
    createdAt: "2025-03-28T10:00:00Z", updatedAt: "2025-04-01T06:00:00Z",
    timeline: [
      { id: "t1", date: "28 Mar 2025", heure: "10:00", titre: "Opération créée", description: "Depuis le devis DEV-2025-005", statut: "done" },
      { id: "t2", date: "30 Mar 2025", heure: "14:00", titre: "Camion & chauffeur affectés", description: "Renault T480 — AB-1234-CI / Koné Ibrahim", statut: "done" },
      { id: "t3", date: "01 Avr 2025", heure: "06:00", titre: "Départ d'Abidjan", description: "Chargement terminé, départ Zone Industrielle", statut: "done" },
      { id: "t4", date: "01 Avr 2025", heure: "12:00", titre: "Passage Yamoussoukro", description: "Point de contrôle intermédiaire", statut: "current" },
      { id: "t5", date: "02 Avr 2025", heure: "18:00", titre: "Livraison à Korhogo", description: "Livraison prévue au centre-ville", statut: "pending" },
      { id: "t6", date: "02 Avr 2025", heure: "19:00", titre: "Bon de livraison", description: "Upload du BL signé", statut: "pending" },
    ],
  },
  {
    id: "op2", reference: "OP-2025-006", devisReference: "DEV-2025-003",
    clientNom: "SOTRA", camionId: "cam2", camion: MOCK_CAMIONS[1],
    chauffeurId: "ch2", chauffeur: MOCK_CHAUFFEURS[1],
    lieuEmbarquement: "Abidjan, Port Autonome", lieuLivraison: "Bouaké, Gare Routière",
    dateDepart: "2025-04-01T08:00:00Z", dateLivraisonEstimee: "2025-04-01T20:00:00Z",
    dureeEstimeeHeures: 8, statut: "EN_COURS", montantDevis: 1300000,
    poidsKg: 15000, nombreColis: 6,
    depenses: [
      { id: "dep3", operationId: "op2", categorie: "CARBURANT", description: "Plein diesel — Station Shell", montant: 165000, date: "2025-04-01T07:00:00Z" },
    ],
    createdAt: "2025-03-22T11:00:00Z", updatedAt: "2025-04-01T08:00:00Z",
    timeline: [
      { id: "t7", date: "22 Mar 2025", heure: "11:00", titre: "Opération créée", description: "Depuis le devis DEV-2025-003", statut: "done" },
      { id: "t8", date: "31 Mar 2025", heure: "16:00", titre: "Camion & chauffeur affectés", description: "Mercedes Actros — AB-5678-CI / Traoré Moussa", statut: "done" },
      { id: "t9", date: "01 Avr 2025", heure: "08:00", titre: "Départ du Port", description: "Chargement terminé", statut: "done" },
      { id: "t10", date: "01 Avr 2025", heure: "20:00", titre: "Arrivée à Bouaké", description: "Livraison prévue Gare Routière", statut: "current" },
    ],
  },
  {
    id: "op3", reference: "OP-2025-007",
    clientNom: "Cargill CI",
    lieuEmbarquement: "San Pedro, Zone Portuaire", lieuLivraison: "Abidjan, Entrepôt Vridi",
    dateLivraisonEstimee: "2025-04-05T16:00:00Z",
    dureeEstimeeHeures: 10, statut: "DEMANDE", montantDevis: 6000000,
    poidsKg: 30000, nombreColis: 1,
    depenses: [],
    createdAt: "2025-03-18T16:00:00Z", updatedAt: "2025-03-18T16:00:00Z",
    timeline: [
      { id: "t11", date: "18 Mar 2025", heure: "16:00", titre: "Demande créée", description: "Demande du service commercial", statut: "done" },
      { id: "t12", date: "—", heure: "—", titre: "Validation logistique", description: "En attente de traitement", statut: "pending" },
      { id: "t13", date: "—", heure: "—", titre: "Affectation camion", description: "En attente", statut: "pending" },
    ],
  },
  {
    id: "op4", reference: "OP-2025-004", devisReference: "DEV-2025-001",
    clientNom: "CIE Énergie", camionId: "cam3", camion: MOCK_CAMIONS[2],
    chauffeurId: "ch3", chauffeur: MOCK_CHAUFFEURS[2],
    lieuEmbarquement: "Abidjan, Plateau", lieuLivraison: "Yamoussoukro, Centrale Électrique",
    dateDepart: "2025-03-25T07:00:00Z", dateLivraisonEstimee: "2025-03-25T17:00:00Z",
    dateLivraisonReelle: "2025-03-25T16:30:00Z",
    dureeEstimeeHeures: 6, statut: "TERMINEE", montantDevis: 1575000,
    poidsKg: 12000, nombreColis: 8, bonLivraisonUrl: "/uploads/bl-op4.pdf",
    depenses: [
      { id: "dep4", operationId: "op4", categorie: "CARBURANT", description: "Plein diesel", montant: 140000, date: "2025-03-25T06:00:00Z" },
      { id: "dep5", operationId: "op4", categorie: "PEAGE", description: "Péage autoroute", montant: 12000, date: "2025-03-25T08:00:00Z" },
      { id: "dep6", operationId: "op4", categorie: "AUTRE", description: "Repas chauffeur", montant: 5000, date: "2025-03-25T12:00:00Z" },
    ],
    createdAt: "2025-03-20T08:00:00Z", updatedAt: "2025-03-25T17:00:00Z",
    timeline: [
      { id: "t14", date: "20 Mar 2025", heure: "08:00", titre: "Opération créée", description: "Depuis le devis DEV-2025-001", statut: "done" },
      { id: "t15", date: "23 Mar 2025", heure: "10:00", titre: "Camion & chauffeur affectés", description: "Iveco Stralis — AB-9012-CI / Diallo Seydou", statut: "done" },
      { id: "t16", date: "25 Mar 2025", heure: "07:00", titre: "Départ d'Abidjan", description: "Chargement terminé", statut: "done" },
      { id: "t17", date: "25 Mar 2025", heure: "16:30", titre: "Livraison effectuée", description: "Livré à la Centrale Électrique", statut: "done" },
      { id: "t18", date: "25 Mar 2025", heure: "17:00", titre: "BL uploadé", description: "Bon de livraison signé", statut: "done" },
    ],
  },
  {
    id: "op5", reference: "OP-2025-003",
    clientNom: "Bolloré Transport", camionId: "cam2", camion: MOCK_CAMIONS[1],
    chauffeurId: "ch2", chauffeur: MOCK_CHAUFFEURS[1],
    lieuEmbarquement: "Abidjan, Port", lieuLivraison: "Abidjan, Zone Industrielle Yopougon",
    dateDepart: "2025-03-15T09:00:00Z", dateLivraisonEstimee: "2025-03-15T14:00:00Z",
    dateLivraisonReelle: "2025-03-15T13:45:00Z",
    dureeEstimeeHeures: 4, statut: "TERMINEE", montantDevis: 1750000,
    poidsKg: 22000, nombreColis: 3, bonLivraisonUrl: "/uploads/bl-op3.pdf",
    depenses: [
      { id: "dep7", operationId: "op5", categorie: "CARBURANT", description: "Diesel", montant: 85000, date: "2025-03-15T08:00:00Z" },
    ],
    createdAt: "2025-03-12T09:00:00Z", updatedAt: "2025-03-15T14:00:00Z",
    timeline: [
      { id: "t19", date: "12 Mar 2025", heure: "09:00", titre: "Opération créée", description: "Transport conteneur", statut: "done" },
      { id: "t20", date: "15 Mar 2025", heure: "09:00", titre: "Départ", description: "Port Autonome", statut: "done" },
      { id: "t21", date: "15 Mar 2025", heure: "13:45", titre: "Livré", description: "Zone Industrielle Yopougon", statut: "done" },
    ],
  },
];

export function useOperationsStore() {
  const [operations, setOperations] = useState<Operation[]>(MOCK_OPERATIONS);
  const [camions] = useState<Camion[]>(MOCK_CAMIONS);
  const [chauffeurs] = useState<Chauffeur[]>(MOCK_CHAUFFEURS);

  const updateStatut = useCallback((opId: string, statut: OperationStatut) => {
    setOperations((prev) => prev.map((o) => o.id === opId ? { ...o, statut, updatedAt: new Date().toISOString() } : o));
  }, []);

  const affecterOperation = useCallback((opId: string, camionId: string, chauffeurId: string) => {
    setOperations((prev) => prev.map((o) => {
      if (o.id !== opId) return o;
      const camion = MOCK_CAMIONS.find((c) => c.id === camionId);
      const chauffeur = MOCK_CHAUFFEURS.find((c) => c.id === chauffeurId);
      return { ...o, camionId, camion, chauffeurId, chauffeur, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const addDepense = useCallback((opId: string, depense: Omit<LigneDepense, "id" | "operationId">) => {
    setOperations((prev) => prev.map((o) => {
      if (o.id !== opId) return o;
      const newDep: LigneDepense = { ...depense, id: `dep-${Date.now()}`, operationId: opId };
      return { ...o, depenses: [...o.depenses, newDep], updatedAt: new Date().toISOString() };
    }));
  }, []);

  return { operations, camions, chauffeurs, updateStatut, affecterOperation, addDepense };
}
