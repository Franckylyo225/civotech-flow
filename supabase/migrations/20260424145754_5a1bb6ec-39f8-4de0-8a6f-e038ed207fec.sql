-- Allow ADMIN_VENTES to manage factures
CREATE POLICY "ADMIN_VENTES manage factures"
ON public.factures
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'ADMIN_VENTES'::app_role))
WITH CHECK (has_role(auth.uid(), 'ADMIN_VENTES'::app_role));

-- Extend SELECT to ADMIN_VENTES (recreate with broader rule)
DROP POLICY IF EXISTS "View factures restricted" ON public.factures;
CREATE POLICY "View factures restricted"
ON public.factures
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'DG'::app_role)
  OR has_role(auth.uid(), 'FINANCE'::app_role)
  OR has_role(auth.uid(), 'COMMERCIAL'::app_role)
  OR has_role(auth.uid(), 'ADMIN_VENTES'::app_role)
);