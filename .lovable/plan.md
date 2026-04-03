
## État actuel — Ce qui est implémenté ✅

### Base de données
- **camions** — immatriculation, marque, modèle, type_vehicule, km_actuel, statut auto (DISPONIBLE/EN_MISSION/EN_MAINTENANCE)
- **chauffeurs** — nom, prénom, permis, expérience, statut auto (DISPONIBLE/EN_MISSION), camion_assigne_id
- **maintenances** — type (PREVENTIVE/CORRECTIVE/REMPLACEMENT), statut, coûts, pièces, dates, lié à camion
- **fournisseurs** — nom, contact, catégorie (PIECES_AUTO/CARBURANT/PNEUMATIQUES/SERVICES/AUTRE), actif
- **demandes_achat** — référence auto DA-YYYY-XXX, lié à maintenance, workflow 9 statuts, urgence
- **devis_fournisseurs** — lié à demande_achat + fournisseur, montant, délai, retenu (sélection DG)
- **decaissements** — référence auto DEC-YYYY-XXX, lié à demande_achat + devis retenu, workflow 4 statuts
- **Triggers automatiques** : statut camion (maintenance+opérations), statut chauffeur (opérations)
- **RLS** : DG accès complet, LOGISTIQUE (parc+maintenance), ACHATS (DA+devis+fournisseurs), FINANCE (décaissements), COMMERCIAL (devis+opérations)

### Workflow Maintenance → Achats → DG → Finance ✅
1. ✅ Maintenance créée avec pièces → **demande d'achat auto-générée** (statut SOUMISE)
2. ✅ Service Achats ajoute **devis fournisseurs** (comparaison, meilleur prix mis en évidence)
3. ✅ Achats sélectionne le devis retenu ⭐ et **soumet au DG**
4. ✅ DG **valide/refuse** avec commentaire → si validé, **décaissement auto-généré**
5. ✅ DG **approuve le décaissement**
6. ✅ Finance **enregistre le paiement** (référence, date) → demande passe en PAYEE

### Modules UI
- **Dashboard** — statistiques de base
- **Devis** — création, pipeline, validation DG, grille tarifaire, PDF
- **Opérations** — CRUD, timeline, incidents, dépenses, assignation camion/chauffeur
- **Clients** — CRUD
- **Parc Auto** — 3 onglets (Véhicules, Maintenance, Chauffeurs), alertes (maintenance retard + permis expirant), indicateur DA lié
- **Achats & Fournisseurs** — 2 onglets (Demandes d'achat avec détail/devis/workflow, Fournisseurs CRUD)
- **Finance & Comptabilité** — Décaissements (approbation DG, paiement Finance), onglet Factures placeholder

### Automatisations
- Référence auto : DEV-YYYY-XXX, OP-YYYY-XXX, DA-YYYY-XXX, DEC-YYYY-XXX
- Statut camion auto (maintenance > mission > disponible)
- Statut chauffeur auto (mission > disponible)
- Demande d'achat auto depuis maintenance
- Décaissement auto depuis validation DG

---

## Prochaines étapes 🔜

### Phase 4 — Compléter le workflow
- [ ] Clôture automatique de la demande d'achat après paiement (PAYEE → CLOTUREE)
- [ ] Lien retour : après paiement, mettre la maintenance en EN_COURS (pièces disponibles)
- [ ] Historique / audit trail des transitions de statut (qui a fait quoi, quand)

### Phase 5 — Module Factures
- [ ] Table `factures` (client, opération, montant HT/TTC, statut: BROUILLON/ENVOYEE/PAYEE)
- [ ] Génération facture depuis opération terminée
- [ ] Suivi paiements clients
- [ ] Export PDF facture

### Phase 6 — Dashboard enrichi
- [ ] KPI par rôle (DG: vue globale, COMMERCIAL: CA, LOGISTIQUE: parc, FINANCE: trésorerie)
- [ ] Graphiques Recharts (CA mensuel, coûts maintenance, opérations par statut)
- [ ] Alertes centralisées (maintenance retard, permis, DA en attente DG, décaissements)

### Phase 7 — Calendrier & Planning
- [ ] Calendrier DG (react-big-calendar déjà installé)
- [ ] Planning chauffeurs / véhicules
- [ ] Vue timeline des opérations

### Phase 8 — Gestion utilisateurs
- [ ] Module admin utilisateurs (CRUD, assignation rôle)
- [ ] Page profil utilisateur
- [ ] Notifications in-app

### Phase 9 — Rapports
- [ ] Rapport rentabilité par opération (revenus - dépenses)
- [ ] Rapport coûts maintenance par véhicule
- [ ] Rapport performance chauffeurs
- [ ] Export CSV/PDF
