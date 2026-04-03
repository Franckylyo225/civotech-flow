
CREATE TYPE public.type_evenement AS ENUM ('REUNION', 'RDV', 'DEPLACEMENT', 'RAPPEL', 'AUTRE');

CREATE TABLE public.evenements_calendrier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  description text DEFAULT '',
  date_debut timestamp with time zone NOT NULL,
  date_fin timestamp with time zone NOT NULL,
  lieu text DEFAULT '',
  type_evenement type_evenement NOT NULL DEFAULT 'RDV',
  couleur text DEFAULT '#10B981',
  toute_journee boolean NOT NULL DEFAULT false,
  rappel_minutes integer DEFAULT 30,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.evenements_calendrier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DG ASSISTANTE manage evenements"
  ON public.evenements_calendrier FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ASSISTANTE'::app_role));

CREATE POLICY "View evenements"
  ON public.evenements_calendrier FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_evenements_calendrier_updated_at
  BEFORE UPDATE ON public.evenements_calendrier
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
