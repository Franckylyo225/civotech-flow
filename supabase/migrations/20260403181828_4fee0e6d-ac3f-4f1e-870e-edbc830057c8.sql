
-- Enum for maintenance type
CREATE TYPE public.type_maintenance AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'REMPLACEMENT');

-- Enum for maintenance status
CREATE TYPE public.statut_maintenance AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- Enum for chauffeur status
CREATE TYPE public.statut_chauffeur AS ENUM ('DISPONIBLE', 'EN_MISSION', 'EN_REPOS', 'INDISPONIBLE');

-- Create maintenances table
CREATE TABLE public.maintenances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camion_id UUID NOT NULL REFERENCES public.camions(id) ON DELETE CASCADE,
  type type_maintenance NOT NULL DEFAULT 'PREVENTIVE',
  description TEXT NOT NULL DEFAULT '',
  pieces_changees TEXT DEFAULT '',
  cout_estime NUMERIC NOT NULL DEFAULT 0,
  cout_reel NUMERIC DEFAULT 0,
  date_prevue DATE NOT NULL DEFAULT CURRENT_DATE,
  date_debut DATE,
  date_fin DATE,
  statut statut_maintenance NOT NULL DEFAULT 'PLANIFIEE',
  km_declenchement NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DG LOGISTIQUE manage maintenances" ON public.maintenances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'LOGISTIQUE'::app_role));

CREATE POLICY "View maintenances" ON public.maintenances FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_maintenances_updated_at BEFORE UPDATE ON public.maintenances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alter camions: add type_vehicule and km_actuel
ALTER TABLE public.camions ADD COLUMN type_vehicule TEXT NOT NULL DEFAULT 'Porteur';
ALTER TABLE public.camions ADD COLUMN km_actuel NUMERIC NOT NULL DEFAULT 0;

-- Alter chauffeurs: add new fields and statut enum
ALTER TABLE public.chauffeurs ADD COLUMN type_permis TEXT DEFAULT '';
ALTER TABLE public.chauffeurs ADD COLUMN date_expiration_permis DATE;
ALTER TABLE public.chauffeurs ADD COLUMN experience_annees INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.chauffeurs ADD COLUMN statut statut_chauffeur NOT NULL DEFAULT 'DISPONIBLE';
ALTER TABLE public.chauffeurs ADD COLUMN camion_assigne_id UUID REFERENCES public.camions(id) ON DELETE SET NULL;
