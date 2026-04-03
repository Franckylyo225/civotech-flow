-- Enum for charge categories
CREATE TYPE public.categorie_charge AS ENUM ('LOYER', 'SALAIRES', 'ASSURANCES_TAXES', 'CARBURANT_ENTRETIEN', 'AUTRE');

-- Template table for recurring fixed charges
CREATE TABLE public.charges_fixes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  designation TEXT NOT NULL,
  categorie public.categorie_charge NOT NULL DEFAULT 'AUTRE',
  montant NUMERIC NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.charges_fixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View charges_fixes" ON public.charges_fixes FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG FINANCE manage charges_fixes" ON public.charges_fixes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'FINANCE'::app_role));

CREATE TRIGGER update_charges_fixes_updated_at BEFORE UPDATE ON public.charges_fixes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly instances generated from templates
CREATE TABLE public.charges_mensuelles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  charge_fixe_id UUID NOT NULL REFERENCES public.charges_fixes(id) ON DELETE CASCADE,
  mois TEXT NOT NULL, -- format YYYY-MM
  montant NUMERIC NOT NULL DEFAULT 0,
  payee BOOLEAN NOT NULL DEFAULT false,
  date_paiement DATE,
  notes TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (charge_fixe_id, mois)
);

ALTER TABLE public.charges_mensuelles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View charges_mensuelles" ON public.charges_mensuelles FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG FINANCE manage charges_mensuelles" ON public.charges_mensuelles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'FINANCE'::app_role));

CREATE TRIGGER update_charges_mensuelles_updated_at BEFORE UPDATE ON public.charges_mensuelles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();