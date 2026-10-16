-- Sécurise les buckets de documents d'opération : bons de commande clients et
-- bons de livraison.
--
-- Avant : les deux buckets étaient créés avec public = true. Toute personne
-- connaissant l'URL lisait les documents clients sans authentification, et les
-- policies SELECT écrites à côté n'avaient aucun effet (bucket public = lecture
-- directe, et ces policies n'étaient même pas restreintes à `authenticated`).
--
-- Après : buckets privés, lecture réservée aux équipes opérations et
-- comptabilité, l'application passant par des URLs signées à durée limitée.
--
-- Les policies INSERT / UPDATE / DELETE existantes ne sont pas touchées : les
-- droits de dépôt restent inchangés (DG + LOGISTIQUE pour le BL, DG +
-- COMMERCIAL + LOGISTIQUE pour le BC).

-- 1) Les buckets ne sont plus publics
UPDATE storage.buckets
SET public = false
WHERE id IN ('bon-commande', 'bon-livraison');

-- 2) Qui peut consulter un document d'opération
--    Opérations  : DG, LOGISTIQUE, COMMERCIAL
--    Comptabilité et facturation : FINANCE, ADMIN_VENTES, ADMIN
--    Comparaison sur role::text pour rester insensible aux ajouts futurs
--    dans l'enum app_role (même approche que public.is_super_admin).
CREATE OR REPLACE FUNCTION public.can_read_operation_docs(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN (
        'DG', 'LOGISTIQUE', 'COMMERCIAL',
        'FINANCE', 'ADMIN_VENTES', 'ADMIN'
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_read_operation_docs(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_operation_docs(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_read_operation_docs(uuid) TO authenticated;

-- 3) Remplace les policies SELECT permissives
--    Les anciennes ne précisaient pas `TO authenticated` : elles s'appliquaient
--    donc aussi au rôle anon.
DROP POLICY IF EXISTS "Authenticated users can view BL" ON storage.objects;
DROP POLICY IF EXISTS "Public read bon-commande" ON storage.objects;

DROP POLICY IF EXISTS "Ops and finance read bon-livraison" ON storage.objects;
CREATE POLICY "Ops and finance read bon-livraison"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bon-livraison'
  AND public.can_read_operation_docs(auth.uid())
);

DROP POLICY IF EXISTS "Ops and finance read bon-commande" ON storage.objects;
CREATE POLICY "Ops and finance read bon-commande"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bon-commande'
  AND public.can_read_operation_docs(auth.uid())
);

-- Note : les colonnes operations.bon_commande_url / bon_livraison_url contiennent
-- encore, pour les lignes antérieures, des URLs publiques complètes devenues
-- non résolvables. Elles ne sont volontairement pas réécrites ici : un UPDATE de
-- masse déclencherait trg_log_operations (une entrée de journal par opération) et
-- ferait sauter updated_at sur tout l'historique. La conversion est faite à la
-- lecture par src/lib/operation-docs.ts, qui accepte les deux formats.
