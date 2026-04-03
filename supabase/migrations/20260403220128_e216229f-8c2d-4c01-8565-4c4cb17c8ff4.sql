DROP POLICY IF EXISTS "ACHATS FINANCE insert decaissements" ON public.decaissements;
CREATE POLICY "ACHATS FINANCE LOGISTIQUE insert decaissements"
ON public.decaissements
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ACHATS'::app_role)
  OR has_role(auth.uid(), 'FINANCE'::app_role)
  OR has_role(auth.uid(), 'LOGISTIQUE'::app_role)
);