-- Ferme l'acces API aux helpers SECURITY DEFINER preexistants.
--
-- Meme classe de probleme que 20261016150000, mais sur des fonctions anterieures :
-- Postgres accorde EXECUTE a PUBLIC par defaut sur toute nouvelle fonction, et
-- PostgREST expose toute fonction du schema public. Quatre helpers SECURITY DEFINER
-- sont donc restes appelables depuis l'API REST par n'importe quel utilisateur
-- connecte, et pour certains par anon :
--
--   notify_role                   ecrit dans notifications. Permettait a tout compte
--                                 d'envoyer une notification arbitraire a tous les
--                                 porteurs d'un role, en se faisant passer pour le
--                                 systeme. La policy d'insertion sur notifications
--                                 est limitee a DG, ADMIN et SUPER_ADMIN, mais
--                                 SECURITY DEFINER la contourne.
--   recalculate_camion_statut     ecrit camions.statut, alors que la policy reserve
--                                 l'ecriture a DG et LOGISTIQUE. Portee reelle plus
--                                 limitee que notify_role : la fonction recalcule le
--                                 statut depuis les maintenances et operations
--                                 existantes, elle ne peut donc pas inventer un
--                                 statut, seulement ecraser un statut pose a la main.
--                                 Probleme d'integrite, pas de falsification.
--   recalculate_chauffeur_statut  ecrit chauffeurs.statut. Meme analyse.
--   get_user_role                 lit user_roles sans passer par la RLS, qui limite
--                                 pourtant la lecture a son propre role. Revelait le
--                                 role de tout utilisateur dont on connait l'UUID,
--                                 et les UUID sont lisibles via profiles.
--
-- Verification faite avant revocation : les treize fonctions qui appellent ces
-- helpers sont toutes SECURITY DEFINER (on_devis_created, on_devis_soumis_dg,
-- on_maintenance_created, on_demande_achat_soumise_dg, on_decaissement_created,
-- on_depense_consolidation_created, notify_supplier_invoice_status,
-- on_demande_achat_payee_close_maintenance, on_demande_achat_critique,
-- trigger_recalc_camion_on_maintenance, trigger_recalc_camion_on_operation,
-- trigger_recalc_chauffeur_on_operation). Elles s'executent avec les droits de leur
-- proprietaire et conservent donc EXECUTE apres cette migration. Aucun appel depuis
-- le code applicatif (rpc) ni depuis les edge functions. get_user_role n'a aucun
-- appelant : c'est du code mort, conserve ici plutot que supprime par prudence.
--
-- service_role garde EXECUTE : sa cle est strictement serveur, et cela evite de
-- casser un futur appel server-side.

DO $$
DECLARE
  v_fn text;
  v_fns text[] := ARRAY[
    'public.notify_role(public.app_role, text, text, text, text)',
    'public.recalculate_camion_statut(uuid)',
    'public.recalculate_chauffeur_statut(uuid)',
    'public.get_user_role(uuid)'
  ];
BEGIN
  FOREACH v_fn IN ARRAY v_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_fn);

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_fn);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_fn);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_fn);
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- has_role : a NE PAS revoquer
-- ============================================================
-- has_role apparait dans des dizaines de policies RLS. Les expressions de policy
-- sont evaluees avec les droits du role qui interroge, donc authenticated a besoin
-- de EXECUTE dessus. La revoquer retirerait l'acces a la quasi-totalite des tables
-- et casserait l'application entiere. Le commentaire est pose en base pour que la
-- prochaine personne qui fait le menage dans les droits le voie.
COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'Utilisee dans les policies RLS : authenticated DOIT conserver EXECUTE. Ne pas revoquer, sous peine de rendre toutes les tables inaccessibles.';