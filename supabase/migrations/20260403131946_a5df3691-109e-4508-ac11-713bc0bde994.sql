
CREATE POLICY "DG delete clients" ON public.clients FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role));
