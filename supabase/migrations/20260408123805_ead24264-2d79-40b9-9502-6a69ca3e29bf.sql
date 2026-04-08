
-- Add bon_commande_url column to operations
ALTER TABLE public.operations ADD COLUMN bon_commande_url text DEFAULT NULL;

-- Create storage bucket for purchase orders
INSERT INTO storage.buckets (id, name, public) VALUES ('bon-commande', 'bon-commande', true);

-- Allow authenticated users to view files
CREATE POLICY "Public read bon-commande"
ON storage.objects FOR SELECT
USING (bucket_id = 'bon-commande');

-- Allow DG, COMMERCIAL, LOGISTIQUE to upload
CREATE POLICY "Upload bon-commande"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bon-commande'
  AND (
    public.has_role(auth.uid(), 'DG') 
    OR public.has_role(auth.uid(), 'COMMERCIAL')
    OR public.has_role(auth.uid(), 'LOGISTIQUE')
  )
);

-- Allow DG to delete
CREATE POLICY "DG delete bon-commande"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bon-commande'
  AND public.has_role(auth.uid(), 'DG')
);
