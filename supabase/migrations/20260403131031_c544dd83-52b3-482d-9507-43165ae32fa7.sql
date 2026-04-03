
-- 1. Update statut_devis enum: rename old values, add new ones
ALTER TYPE public.statut_devis RENAME VALUE 'EN_ATTENTE' TO 'SOUMIS_DG';
ALTER TYPE public.statut_devis RENAME VALUE 'VALIDE' TO 'APPROUVE_DG';
ALTER TYPE public.statut_devis RENAME VALUE 'REJETE' TO 'REFUSE_DG';
ALTER TYPE public.statut_devis RENAME VALUE 'FACTURE' TO 'ENVOYE_CLIENT';
ALTER TYPE public.statut_devis ADD VALUE IF NOT EXISTS 'VALIDE_CLIENT';
ALTER TYPE public.statut_devis ADD VALUE IF NOT EXISTS 'REFUSE_CLIENT';

-- 2. Add commentaire_refus to devis
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS commentaire_refus text DEFAULT '';

-- 3. Create sequence for devis references
CREATE SEQUENCE IF NOT EXISTS public.devis_ref_seq START WITH 1;

-- 4. Create lignes_devis table
CREATE TABLE public.lignes_devis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id uuid NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantite integer NOT NULL DEFAULT 1,
  prix_unitaire numeric NOT NULL DEFAULT 0,
  montant numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lignes_devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View lignes_devis" ON public.lignes_devis FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL manage lignes_devis" ON public.lignes_devis FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'COMMERCIAL'::app_role));

-- 5. Auto-generate devis reference
CREATE OR REPLACE FUNCTION public.generate_devis_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'DEV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.devis_ref_seq')::text,3,'0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_devis_reference
  BEFORE INSERT ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.generate_devis_reference();

-- 6. Enable realtime for devis
ALTER PUBLICATION supabase_realtime ADD TABLE public.devis;
