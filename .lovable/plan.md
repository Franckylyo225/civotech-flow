
# Module Paramètres — Plan d'implémentation

## Ce qui existe déjà
- ✅ Table `user_roles` avec enum `app_role` (DG, COMMERCIAL, LOGISTIQUE, FINANCE, ACHATS, ASSISTANTE)
- ✅ Table `profiles` (nom, prénom, téléphone, avatar)
- ✅ Authentification email/mot de passe
- ✅ RLS policies par rôle sur toutes les tables
- ✅ Fonction `has_role()` pour le contrôle d'accès

## Phase 1 — Fondations (Tables + Pages de base)

### 1.1 Table `company_settings`
- Informations entreprise (nom, logo, adresse, téléphone, email, site web)
- Paramètres métier (devise, format date, fuseau horaire, langue)
- Paramètres financiers (taux TVA, conditions paiement, préfixes factures)
- Stocké en JSON flexible pour éviter les migrations à chaque nouveau champ

### 1.2 Table `activity_logs`
- Journal d'activité (user_id, action, table concernée, détails, timestamp)
- Pour traçabilité des changements importants

### 1.3 Mise à jour enum `app_role`
- Ajouter les rôles manquants : MAINTENANCE, ADMIN (si souhaité)
- Ou garder les rôles existants et mapper LOGISTIQUE→Maintenance, FINANCE→Comptabilité

### 1.4 Pages UI
- `/parametres` avec onglets : Entreprise | Utilisateurs | Rôles | Sécurité | Profil

## Phase 2 — Gestion utilisateurs + Rôles

### 2.1 Page Gestion Utilisateurs (DG/ADMIN only)
- Liste des utilisateurs avec statut, rôle, dernière connexion
- Création d'utilisateur (invitation par email)
- Modification / désactivation
- Réinitialisation mot de passe

### 2.2 Page Rôles & Permissions
- Vue matricielle : rôle × module × actions (lecture/création/validation/suppression)
- Basé sur les rôles existants dans l'enum

### 2.3 Page Profil Utilisateur
- Modification infos personnelles
- Changement mot de passe
- Préférences (langue, notifications)

## Phase 3 — Sécurité & Notifications

### 3.1 Journal d'activité
- Logs des actions critiques (connexion, modification données, validations)
- Interface de consultation avec filtres

### 3.2 Notifications in-app
- Table `notifications` (user_id, type, message, lu, created_at)
- Icône cloche dans le header avec badge
- Notifications automatiques (validation DG, mission assignée, paiement)

### 3.3 Dashboard Admin
- Stats utilisateurs actifs, répartition par rôle
- Activité récente, alertes sécurité

## Décisions à prendre
1. **Rôles** : Garder les 6 actuels ou ajouter MAINTENANCE + ADMIN ?
2. **Multi-tenant** : Ce n'est pas un SaaS, donc une seule entreprise ? 
3. **Notifications email/SMS** : Prioritaire ou à faire plus tard ?
