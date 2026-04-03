
INSERT INTO storage.buckets (id, name, public) VALUES ('bon-livraison', 'bon-livraison', true);

CREATE POLICY "Authenticated users can view BL" ON storage.objects FOR SELECT USING (bucket_id = 'bon-livraison');

CREATE POLICY "DG LOGISTIQUE can upload BL" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'bon-livraison' AND (
    public.has_role(auth.uid(), 'DG'::public.app_role) OR
    public.has_role(auth.uid(), 'LOGISTIQUE'::public.app_role)
  )
);

CREATE POLICY "DG LOGISTIQUE can update BL" ON storage.objects FOR UPDATE USING (
  bucket_id = 'bon-livraison' AND (
    public.has_role(auth.uid(), 'DG'::public.app_role) OR
    public.has_role(auth.uid(), 'LOGISTIQUE'::public.app_role)
  )
);

CREATE POLICY "DG LOGISTIQUE can delete BL" ON storage.objects FOR DELETE USING (
  bucket_id = 'bon-livraison' AND (
    public.has_role(auth.uid(), 'DG'::public.app_role) OR
    public.has_role(auth.uid(), 'LOGISTIQUE'::public.app_role)
  )
);
