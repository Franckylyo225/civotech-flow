ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS afficher_maj_devis boolean NOT NULL DEFAULT true;