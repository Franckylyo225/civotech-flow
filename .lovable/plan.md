
## Module Trésorerie & Flux Financiers

### 1. Migration DB
- Table `comptes_tresorerie` (id, nom, type [BANQUE/CAISSE], solde, actif, created_by, timestamps)
- Table `transactions_tresorerie` (id, reference, type [ENCAISSEMENT/DECAISSEMENT/TRANSFERT], montant, date_transaction, compte_source_id, compte_destination_id, facture_id, decaissement_id, description, created_by, timestamps)
- Trigger pour auto-update des soldes à chaque INSERT sur transactions
- RLS: DG + FINANCE full access, others read-only

### 2. Hooks/Store
- `use-tresorerie-store.ts` — CRUD comptes + transactions, calculs soldes

### 3. Pages UI
- Refonte `FinanceModule.tsx` — ajouter onglet "Trésorerie"
- `TresorerieDashboard.tsx` — KPIs (solde total, banque, caisse, entrées, sorties) + dernières transactions
- `TransactionsTab.tsx` — liste filtrable (date, type, compte) avec couleurs vert/rouge
- `ComptesTab.tsx` — gestion des comptes banque/caisse
- Dialog transfert banque → caisse

### 4. Intégrations existantes
- Lors du paiement facture → auto-créer encaissement
- Lors du décaissement validé → auto-créer transaction sortie
- Pas de duplication de logique de validation
