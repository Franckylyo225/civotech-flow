
CREATE TABLE public.grille_tarifaire (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  designation TEXT NOT NULL,
  unite TEXT NOT NULL DEFAULT 'FORFAIT',
  prix_unitaire NUMERIC NOT NULL DEFAULT 0,
  categorie TEXT NOT NULL DEFAULT 'TRANSPORT',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grille_tarifaire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View grille_tarifaire"
ON public.grille_tarifaire
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "DG COMMERCIAL manage grille_tarifaire"
ON public.grille_tarifaire
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'COMMERCIAL'::app_role));

CREATE TRIGGER update_grille_tarifaire_updated_at
BEFORE UPDATE ON public.grille_tarifaire
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
