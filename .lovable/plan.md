## Plan : Gestion dynamique des rôles et permissions

### Architecture
Les rôles de base (DG, COMMERCIAL, etc.) restent pour la sécurité DB (RLS). Les permissions applicatives sont gérées dans une table `role_permissions` consultée côté app.

### Étape 1 — Migration DB
- Table `role_permissions` : stocke les permissions par rôle et module (ex: rôle "COMMERCIAL", module "Devis", permissions ["lecture","creation","modification"])
- Table `custom_roles` : stocke les rôles personnalisés (nom, description, rôle_base pour le RLS)
- Pré-remplir `role_permissions` avec les permissions actuelles des 8 rôles de base

### Étape 2 — UI dans l'onglet Rôles & Permissions
- Bouton "Nouveau rôle" : dialog pour créer un rôle personnalisé (nom, description, rôle de base pour la sécurité)
- Matrice de permissions éditable : checkboxes pour chaque combinaison rôle × module × permission
- Bouton sauvegarder pour persister les changements

### Étape 3 — Hook & intégration
- Hook `use-role-permissions` pour charger/modifier les permissions
- Les rôles personnalisés héritent d'un rôle de base pour le RLS (sécurité DB)

### Limites
- Les politiques RLS restent basées sur les 8 rôles de base (sécurité côté serveur)
- Les rôles personnalisés sont des "profils de permissions" applicatifs mappés à un rôle de base
