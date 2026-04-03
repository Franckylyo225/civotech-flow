
-- Enum pour catégorie fournisseur
CREATE TYPE public.categorie_fournisseur AS ENUM ('PIECES_AUTO', 'CARBURANT', 'PNEUMATIQUES', 'SERVICES', 'AUTRE');

CREATE TABLE public.fournisseurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  contact TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  adresse TEXT DEFAULT '',
  categorie categorie_fournisseur NOT NULL DEFAULT 'AUTRE',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View fournisseurs" ON public.fournisseurs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "DG ACHATS manage fournisseurs" ON public.fournisseurs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ACHATS'::app_role));

CREATE TRIGGER update_fournisseurs_updated_at
  BEFORE UPDATE ON public.fournisseurs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
