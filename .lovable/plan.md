
## Phase 1 — Migrations DB

### Table `maintenances` (nouvelle)
- `id`, `camion_id` (FK → camions), `type` (enum: PREVENTIVE, CORRECTIVE, REMPLACEMENT)
- `description`, `pieces_changees`, `cout_estime`, `cout_reel`
- `date_prevue`, `date_debut`, `date_fin`
- `statut` (enum: PLANIFIEE, EN_COURS, TERMINEE, ANNULEE)
- `km_declenchement` (pour planification auto)
- `created_by`, `created_at`, `updated_at`
- RLS: DG + LOGISTIQUE = gestion complète, autres = lecture

### Modifications table `chauffeurs`
- Ajouter: `type_permis` (text), `date_expiration_permis` (date), `experience_annees` (int)
- Remplacer `disponible` (boolean) → `statut` (enum: DISPONIBLE, EN_MISSION, EN_REPOS, INDISPONIBLE)
- Ajouter: `camion_assigne_id` (FK → camions, nullable)

### Modifications table `camions`
- Ajouter: `type_vehicule` (text — ex: Porteur, Semi-remorque, Fourgon...)
- Ajouter: `km_actuel` (numeric) pour le suivi kilométrique

## Phase 2 — UI Module "Gestion du Parc"

### Onglet 1 : Véhicules
- Tableau existant enrichi (type véhicule, km)
- Clic sur un véhicule → fiche détail avec :
  - Infos générales
  - Historique missions (depuis table `operations` via `camion_id`)
  - Historique maintenance (depuis table `maintenances`)
  - Actions : "Envoyer en maintenance", "Consulter performance"

### Onglet 2 : Maintenance
- Liste des maintenances avec filtres (statut, type, véhicule)
- Formulaire création/édition
- Stats : coûts totaux, maintenances en cours, planifiées
- Alertes visuelles pour maintenances en retard

### Onglet 3 : Chauffeurs
- Tableau avec statut coloré, permis, véhicule assigné
- Fiche détail : historique missions (via `operations.chauffeur_id`), incidents
- Alerte permis expirant (< 30 jours)
- Assignation véhicule

## Phase 3 — Règles métier
- Véhicule en maintenance → statut auto `EN_MAINTENANCE`, indisponible pour assignation
- Chauffeur en mission → indisponible pour nouvelle assignation
- Maintenance planifiée → notification visuelle sur le véhicule
- Code vérifie ces contraintes avant assignation dans les opérations

## Ordre d'exécution
1. Migrations DB (maintenances + alter chauffeurs + alter camions)
2. Refacto UI : éclatement en composants (VehiculesTab, MaintenanceTab, ChauffeurstTab)
3. Stores/hooks pour maintenance
4. Règles métier et alertes
