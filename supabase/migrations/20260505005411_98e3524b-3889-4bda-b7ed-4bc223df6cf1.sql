INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read company-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "DG ADMIN insert company-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-assets' AND (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role)));

CREATE POLICY "DG ADMIN update company-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-assets' AND (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role)));

CREATE POLICY "DG ADMIN delete company-assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-assets' AND (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role)));