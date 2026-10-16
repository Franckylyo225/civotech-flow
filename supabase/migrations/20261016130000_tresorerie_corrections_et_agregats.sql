-- Trésorerie : corrections de transactions, soldes fiables, agrégats serveur.
--
-- Contexte : trg_update_solde_comptes était AFTER INSERT uniquement, alors que la
-- policy "DG FINANCE manage transactions_tresorerie" est FOR ALL. Une transaction
-- modifiée ou supprimée ne corrigeait donc jamais le solde du compte, et l'écart
-- devenait définitif et silencieux.

-- ============================================================
-- 1) Effet d'une transaction sur les soldes, applicable ou annulable
-- ============================================================
-- _sens = +1 applique l'effet, -1 l'annule. Mutualisé pour que l'INSERT,
-- l'UPDATE, le DELETE et le recalcul utilisent exactement la même règle.
CREATE OR REPLACE FUNCTION public.appliquer_effet_transaction(
  _type public.type_transaction_tresorerie,
  _montant numeric,
  _compte_source_id uuid,
  _compte_destination_id uuid,
  _sens integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _type = 'ENCAISSEMENT' THEN
    IF _compte_destination_id IS NOT NULL THEN
      UPDATE public.comptes_tresorerie
      SET solde = solde + (_sens * _montant)
      WHERE id = _compte_destination_id;
    END IF;

  ELSIF _type = 'DECAISSEMENT' THEN
    IF _compte_source_id IS NOT NULL THEN
      UPDATE public.comptes_tresorerie
      SET solde = solde - (_sens * _montant)
      WHERE id = _compte_source_id;
    END IF;

  ELSIF _type = 'TRANSFERT' THEN
    IF _compte_source_id IS NOT NULL THEN
      UPDATE public.comptes_tresorerie
      SET solde = solde - (_sens * _montant)
      WHERE id = _compte_source_id;
    END IF;
    IF _compte_destination_id IS NOT NULL THEN
      UPDATE public.comptes_tresorerie
      SET solde = solde + (_sens * _montant)
      WHERE id = _compte_destination_id;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 2) Le trigger couvre désormais INSERT, UPDATE et DELETE
-- ============================================================
-- Sur UPDATE : on annule l'ancienne ligne puis on applique la nouvelle, ce qui
-- couvre aussi un changement de compte, de type ou de montant. Le comportement
-- sur INSERT est identique à celui d'avant.
CREATE OR REPLACE FUNCTION public.update_solde_comptes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.appliquer_effet_transaction(
      OLD.type, OLD.montant, OLD.compte_source_id, OLD.compte_destination_id, -1
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.appliquer_effet_transaction(
      NEW.type, NEW.montant, NEW.compte_source_id, NEW.compte_destination_id, 1
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_solde_comptes ON public.transactions_tresorerie;
CREATE TRIGGER trg_update_solde_comptes
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions_tresorerie
  FOR EACH ROW EXECUTE FUNCTION public.update_solde_comptes();

-- ============================================================
-- 3) Solde initial explicite + recalcul possible
-- ============================================================
-- comptes_tresorerie.solde mélangeait solde d'ouverture et mouvements, sans
-- moyen de les distinguer : impossible de recalculer un solde, donc impossible
-- de détecter ou réparer un écart. On isole le solde d'ouverture.
ALTER TABLE public.comptes_tresorerie
  ADD COLUMN IF NOT EXISTS solde_initial numeric NOT NULL DEFAULT 0;

-- Somme des mouvements d'un compte. Un transfert d'un compte vers lui-même
-- s'annule correctement (+montant puis -montant).
CREATE OR REPLACE FUNCTION public.mouvements_compte(_compte_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(t.montant) FILTER (
      WHERE t.compte_destination_id = _compte_id
        AND t.type IN ('ENCAISSEMENT', 'TRANSFERT')
    ), 0)
  - COALESCE(SUM(t.montant) FILTER (
      WHERE t.compte_source_id = _compte_id
        AND t.type IN ('DECAISSEMENT', 'TRANSFERT')
    ), 0)
  FROM public.transactions_tresorerie t
  WHERE t.compte_source_id = _compte_id
     OR t.compte_destination_id = _compte_id;
$$;

-- Reprise de l'existant : on déduit le solde d'ouverture du solde affiché
-- aujourd'hui. ATTENTION : si un solde a déjà dérivé (transaction modifiée ou
-- supprimée avant cette migration), l'écart est absorbé dans solde_initial et
-- figé comme s'il était correct. Il n'y a pas moyen de le deviner : la
-- réconciliation avec les relevés bancaires reste à faire par la comptabilité.
UPDATE public.comptes_tresorerie c
SET solde_initial = c.solde - public.mouvements_compte(c.id)
WHERE c.solde_initial = 0;

-- Garde-fou : un compte créé avec un solde d'ouverture mais sans solde_initial
-- (c'est ce que fait un INSERT qui ignore la nouvelle colonne) verrait son solde
-- d'ouverture effacé au premier recalcul. On aligne solde_initial sur solde à la
-- création. Placé en base et non dans l'application pour couvrir aussi les inserts
-- faits depuis la console SQL ou le dashboard.
CREATE OR REPLACE FUNCTION public.init_solde_initial_compte()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.solde_initial = 0 AND NEW.solde <> 0 THEN
    NEW.solde_initial := NEW.solde;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_solde_initial_compte ON public.comptes_tresorerie;
CREATE TRIGGER trg_init_solde_initial_compte
  BEFORE INSERT ON public.comptes_tresorerie
  FOR EACH ROW EXECUTE FUNCTION public.init_solde_initial_compte();

-- Recalcul des soldes à partir du grand livre. À appeler après une correction
-- en lot, ou pour vérifier la cohérence. SECURITY INVOKER : la policy
-- "DG FINANCE manage comptes_tresorerie" décide qui a le droit d'écrire.
CREATE OR REPLACE FUNCTION public.recalculer_solde_comptes()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.comptes_tresorerie c
  SET solde = c.solde_initial + public.mouvements_compte(c.id)
  WHERE c.solde <> c.solde_initial + public.mouvements_compte(c.id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculer_solde_comptes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculer_solde_comptes() FROM anon;
GRANT EXECUTE ON FUNCTION public.recalculer_solde_comptes() TO authenticated;

-- ============================================================
-- 4) Agrégats côté serveur (remplacent les totaux calculés en JS)
-- ============================================================
-- SECURITY INVOKER : la policy "View transactions_tresorerie" reste en vigueur.
CREATE OR REPLACE FUNCTION public.tresorerie_totaux()
RETURNS TABLE (total_entrees numeric, total_sorties numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'ENCAISSEMENT'), 0)::numeric,
    COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'DECAISSEMENT'), 0)::numeric
  FROM public.transactions_tresorerie t;
$$;

-- Flux par mois sur les _nb_mois derniers mois, mois vides inclus (pour que le
-- graphique n'ait pas de trou).
CREATE OR REPLACE FUNCTION public.tresorerie_flux_mensuels(_nb_mois integer DEFAULT 6)
RETURNS TABLE (mois date, encaissements numeric, decaissements numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    gs.mois::date,
    COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'ENCAISSEMENT'), 0)::numeric,
    COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'DECAISSEMENT'), 0)::numeric
  FROM generate_series(
         date_trunc('month', CURRENT_DATE)
           - ((GREATEST(COALESCE(_nb_mois, 6), 1) - 1) || ' months')::interval,
         date_trunc('month', CURRENT_DATE),
         '1 month'::interval
       ) AS gs(mois)
  LEFT JOIN public.transactions_tresorerie t
    ON date_trunc('month', t.date_transaction) = gs.mois
  GROUP BY gs.mois
  ORDER BY gs.mois;
$$;

REVOKE ALL ON FUNCTION public.tresorerie_totaux() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tresorerie_totaux() FROM anon;
GRANT EXECUTE ON FUNCTION public.tresorerie_totaux() TO authenticated;

REVOKE ALL ON FUNCTION public.tresorerie_flux_mensuels(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tresorerie_flux_mensuels(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.tresorerie_flux_mensuels(integer) TO authenticated;

-- ============================================================
-- 5) Traçabilité des corrections
-- ============================================================
-- Autoriser la comptabilité à corriger une transaction sans que ce soit journalisé
-- reviendrait à rendre la trésorerie non auditable. On ajoute transactions_tresorerie
-- à log_activity, et on conserve la référence sur les DELETE (elle était perdue).
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action text;
  v_record_id text;
  v_details jsonb := '{}'::jsonb;
  v_user_id uuid;
  v_user_nom text := '';
  v_ref text := '';
  v_tables_avec_ref text[] := ARRAY[
    'devis', 'operations', 'factures', 'decaissements',
    'demandes_achat', 'transactions_tresorerie'
  ];
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  SELECT COALESCE(p.nom || ' ' || p.prenom, '') INTO v_user_nom
  FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_record_id := OLD.id::text;
    IF TG_TABLE_NAME = ANY (v_tables_avec_ref) THEN
      v_ref := OLD.reference;
    END IF;
    v_details := jsonb_build_object('table', TG_TABLE_NAME, 'reference', v_ref);

  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_record_id := NEW.id::text;
    IF TG_TABLE_NAME = ANY (v_tables_avec_ref) THEN
      v_ref := NEW.reference;
    END IF;
    v_details := jsonb_build_object('reference', v_ref);

  ELSE
    v_action := 'UPDATE';
    v_record_id := NEW.id::text;
    IF TG_TABLE_NAME = ANY (v_tables_avec_ref) THEN
      v_ref := NEW.reference;
    END IF;
    IF to_jsonb(NEW) ? 'statut' AND to_jsonb(OLD) ? 'statut' THEN
      v_details := jsonb_build_object(
        'reference', v_ref,
        'old_statut', to_jsonb(OLD)->>'statut',
        'new_statut', to_jsonb(NEW)->>'statut'
      );
    ELSE
      v_details := jsonb_build_object('reference', v_ref);
    END IF;
  END IF;

  -- Pour une correction de trésorerie, le montant est l'information qui compte.
  IF TG_TABLE_NAME = 'transactions_tresorerie' THEN
    IF TG_OP = 'DELETE' THEN
      v_details := v_details || jsonb_build_object('montant', OLD.montant, 'type', OLD.type);
    ELSIF TG_OP = 'UPDATE' THEN
      v_details := v_details || jsonb_build_object(
        'montant', NEW.montant, 'type', NEW.type,
        'ancien_montant', OLD.montant, 'ancien_type', OLD.type
      );
    ELSE
      v_details := v_details || jsonb_build_object('montant', NEW.montant, 'type', NEW.type);
    END IF;
  END IF;

  INSERT INTO public.activity_logs (user_id, user_nom, action, table_cible, enregistrement_id, details)
  VALUES (v_user_id, v_user_nom, v_action, TG_TABLE_NAME, v_record_id, v_details);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_transactions_tresorerie ON public.transactions_tresorerie;
CREATE TRIGGER trg_log_transactions_tresorerie
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions_tresorerie
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
