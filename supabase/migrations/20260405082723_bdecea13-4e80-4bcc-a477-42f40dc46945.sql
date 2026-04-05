
-- Table annonces
CREATE TABLE public.annonces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre text NOT NULL,
  contenu text NOT NULL DEFAULT '',
  image_url text,
  auteur_id uuid NOT NULL,
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'archivé')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.annonces ENABLE ROW LEVEL SECURITY;

-- Everyone can read active announcements
CREATE POLICY "View annonces" ON public.annonces
  FOR SELECT TO authenticated
  USING (true);

-- DG, COMMERCIAL, ASSISTANTE can insert
CREATE POLICY "Insert annonces" ON public.annonces
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'DG'::app_role) OR
    has_role(auth.uid(), 'COMMERCIAL'::app_role) OR
    has_role(auth.uid(), 'ASSISTANTE'::app_role)
  );

-- Author or DG can update
CREATE POLICY "Update annonces" ON public.annonces
  FOR UPDATE TO authenticated
  USING (
    auteur_id = auth.uid() OR has_role(auth.uid(), 'DG'::app_role)
  );

-- Author or DG can delete
CREATE POLICY "Delete annonces" ON public.annonces
  FOR DELETE TO authenticated
  USING (
    auteur_id = auth.uid() OR has_role(auth.uid(), 'DG'::app_role)
  );

-- Updated_at trigger
CREATE TRIGGER update_annonces_updated_at
  BEFORE UPDATE ON public.annonces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public) VALUES ('annonces-images', 'annonces-images', true);

CREATE POLICY "Anyone can view annonces images" ON storage.objects
  FOR SELECT USING (bucket_id = 'annonces-images');

CREATE POLICY "Authorized users can upload annonces images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'annonces-images' AND (
      has_role(auth.uid(), 'DG'::app_role) OR
      has_role(auth.uid(), 'COMMERCIAL'::app_role) OR
      has_role(auth.uid(), 'ASSISTANTE'::app_role)
    )
  );

CREATE POLICY "Authors can delete annonces images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'annonces-images');
