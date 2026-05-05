CREATE POLICY "COMMERCIAL update operations"
ON public.operations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'COMMERCIAL'::app_role));