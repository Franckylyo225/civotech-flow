-- CORRECTIF DE SECURITE — a appliquer sans attendre.
--
-- La migration 20261016130000 cree huit fonctions mais ne revoque les droits que
-- sur trois d'entre elles. Supabase accorde EXECUTE a PUBLIC par defaut sur toute
-- nouvelle fonction, et PostgREST expose toute fonction du schema public. Deux
-- helpers internes sont donc restes appelables depuis l'API REST :
--
--   appliquer_effet_transaction  SECURITY DEFINER, ecrit dans comptes_tresorerie.solde.
--     Tout utilisateur connecte, quel que soit son role, pouvait modifier n'importe
--     quel solde de compte : la policy "View comptes_tresorerie" est
--     TO authenticated USING (true), donc les UUID des comptes sont lisibles par
--     tous. Appelable aussi par anon, a condition de connaitre un UUID.
--
--   mouvements_compte            SECURITY DEFINER, lit transactions_tresorerie en
--     contournant la RLS. Fuite d'information, exploitable avec un UUID de compte.
--
-- Les trois fonctions trigger (update_solde_comptes, init_solde_initial_compte,
-- log_activity) renvoient le type trigger : PostgREST refuse de les appeler, elles
-- ne sont pas concernees.
--
-- Ces deux helpers n'ont aucun appelant externe : seuls le trigger
-- trg_update_solde_comptes et recalculer_solde_comptes les utilisent.

-- ============================================================
-- 1) Fermeture des deux helpers
-- ============================================================
-- Le trigger update_solde_comptes est SECURITY DEFINER : il s'execute avec les
-- droits de son proprietaire, et continue donc d'appeler appliquer_effet_transaction
-- normalement apres cette revocation.
REVOKE ALL ON FUNCTION public.appliquer_effet_transaction(
  public.type_transaction_tresorerie, numeric, uuid, uuid, integer
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.appliquer_effet_transaction(
  public.type_transaction_tresorerie, numeric, uuid, uuid, integer
) FROM anon;
REVOKE ALL ON FUNCTION public.appliquer_effet_transaction(
  public.type_transaction_tresorerie, numeric, uuid, uuid, integer
) FROM authenticated;

REVOKE ALL ON FUNCTION public.mouvements_compte(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mouvements_compte(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.mouvements_compte(uuid) FROM authenticated;

-- ============================================================
-- 2) recalculer_solde_comptes doit continuer de fonctionner
-- ============================================================
-- Elle etait SECURITY INVOKER : elle s'appuyait sur la RLS de comptes_tresorerie
-- pour l'autorisation, et appelait mouvements_compte avec les droits de l'appelant,
-- ce que la revocation ci-dessus interdit desormais.
--
-- On la passe en SECURITY DEFINER, ce qui lui redonne acces au helper, et on
-- remplace l'autorisation implicite par la RLS par un controle de role explicite,
-- puisque SECURITY DEFINER contourne precisement cette RLS.
CREATE OR REPLACE FUNCTION public.recalculer_solde_comptes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'DG'::public.app_role)
    OR public.has_role(auth.uid(), 'FINANCE'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Acces refuse : recalcul des soldes reserve aux roles DG et FINANCE';
  END IF;

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
