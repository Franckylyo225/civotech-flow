-- Make demande_achat_id nullable so FINANCE can create standalone decaissements
ALTER TABLE public.decaissements ALTER COLUMN demande_achat_id DROP NOT NULL;

-- Allow FINANCE to insert decaissements
DROP POLICY IF EXISTS "ACHATS insert decaissements" ON public.decaissements;
CREATE POLICY "ACHATS FINANCE insert decaissements"
ON public.decaissements
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ACHATS'::app_role) OR has_role(auth.uid(), 'FINANCE'::app_role)
);