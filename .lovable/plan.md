

# Plan: Triggers automatiques pour le journal d'activité

## Constat
Les fonctions de notification (`on_devis_created`, `on_devis_soumis_dg`, etc.) existent mais **aucun trigger n'est attaché** aux tables. Le journal `activity_logs` n'est pas non plus alimenté automatiquement.

## Migration SQL unique

### 1. Fonction générique `log_activity()`
Fonction trigger SECURITY DEFINER qui insère dans `activity_logs` à chaque INSERT/UPDATE/DELETE sur les tables surveillées. Elle capture :
- `user_id` depuis `auth.uid()`
- `action` (CREATE/UPDATE/DELETE)
- `table_cible` (nom de la table)
- `enregistrement_id` (ID de l'enregistrement)
- `details` (JSON avec les champs modifiés pour UPDATE, ou les données clés pour INSERT)

### 2. Triggers activity_logs sur 6 tables
Attacher `log_activity()` en AFTER INSERT/UPDATE/DELETE sur :
- `devis`
- `operations`
- `factures`
- `decaissements`
- `demandes_achat`
- `maintenances`

### 3. Triggers notifications (manquants)
Attacher les fonctions existantes qui ne sont pas connectées :
- `on_devis_created` → AFTER INSERT on `devis`
- `on_devis_soumis_dg` → AFTER UPDATE on `devis`
- `on_maintenance_created` → AFTER INSERT on `maintenances`
- `on_demande_achat_soumise_dg` → AFTER UPDATE on `demandes_achat`
- `on_decaissement_created` → AFTER INSERT on `decaissements`

## Pas de changement UI
Le `LogsTab.tsx` existant affiche déjà les données de `activity_logs` — il fonctionnera automatiquement une fois les triggers en place.

## Sécurité
- La fonction `log_activity()` utilise `SECURITY DEFINER` pour pouvoir insérer dans `activity_logs` quel que soit le rôle
- Les données sensibles (mots de passe, tokens) ne sont jamais loguées

