-- Employees table
CREATE TABLE public.employes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  poste TEXT NOT NULL DEFAULT '',
  telephone TEXT DEFAULT '',
  salaire_base NUMERIC NOT NULL DEFAULT 0,
  taux_cotisations NUMERIC NOT NULL DEFAULT 16,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View employes" ON public.employes FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG FINANCE manage employes" ON public.employes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'FINANCE'::app_role));
CREATE TRIGGER update_employes_updated_at BEFORE UPDATE ON public.employes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly payroll table
CREATE TABLE public.salaires_mensuels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employe_id UUID NOT NULL REFERENCES public.employes(id) ON DELETE CASCADE,
  mois TEXT NOT NULL, -- YYYY-MM
  salaire_base NUMERIC NOT NULL DEFAULT 0,
  primes NUMERIC NOT NULL DEFAULT 0,
  cotisations NUMERIC NOT NULL DEFAULT 0,
  avances NUMERIC NOT NULL DEFAULT 0,
  net_a_payer NUMERIC NOT NULL DEFAULT 0,
  paye BOOLEAN NOT NULL DEFAULT false,
  date_paiement DATE,
  notes TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employe_id, mois)
);

ALTER TABLE public.salaires_mensuels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View salaires_mensuels" ON public.salaires_mensuels FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG FINANCE manage salaires_mensuels" ON public.salaires_mensuels FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'FINANCE'::app_role));
CREATE TRIGGER update_salaires_mensuels_updated_at BEFORE UPDATE ON public.salaires_mensuels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();