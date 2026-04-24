-- Permettre à l'assistante et à la finance de lire les fournisseurs (lecture seule)
-- Nécessaire pour le dropdown du module Factures Fournisseurs
DROP POLICY IF EXISTS "View fournisseurs restricted" ON public.fournisseurs;

CREATE POLICY "View fournisseurs restricted"
ON public.fournisseurs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'DG'::app_role)
  OR has_role(auth.uid(), 'ACHATS'::app_role)
  OR has_role(auth.uid(), 'ASSISTANTE'::app_role)
  OR has_role(auth.uid(), 'FINANCE'::app_role)
);