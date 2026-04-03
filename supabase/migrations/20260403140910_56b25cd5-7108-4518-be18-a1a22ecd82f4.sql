
CREATE TYPE public.type_incident AS ENUM ('PANNE', 'ACCIDENT', 'RETARD', 'VOL', 'AUTRE');
CREATE TYPE public.gravite_incident AS ENUM ('FAIBLE', 'MOYENNE', 'CRITIQUE');

CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  type type_incident NOT NULL DEFAULT 'AUTRE',
  description TEXT NOT NULL DEFAULT '',
  gravite gravite_incident NOT NULL DEFAULT 'MOYENNE',
  date_incident TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolu BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View incidents" ON public.incidents FOR SELECT TO authenticated USING (true);

CREATE POLICY "DG LOGISTIQUE manage incidents" ON public.incidents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'DG'::app_role) OR public.has_role(auth.uid(), 'LOGISTIQUE'::app_role));

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
