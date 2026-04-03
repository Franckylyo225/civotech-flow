
CREATE TYPE public.statut_facture AS ENUM ('BROUILLON', 'ENVOYEE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'ANNULEE');

CREATE TABLE public.factures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL,
  operation_id UUID REFERENCES public.operations(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  montant_ht NUMERIC NOT NULL DEFAULT 0,
  taux_tva NUMERIC NOT NULL DEFAULT 18,
  montant_tva NUMERIC NOT NULL DEFAULT 0,
  montant_ttc NUMERIC NOT NULL DEFAULT 0,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE,
  statut statut_facture NOT NULL DEFAULT 'BROUILLON',
  montant_paye NUMERIC NOT NULL DEFAULT 0,
  mode_paiement TEXT DEFAULT '',
  reference_paiement TEXT DEFAULT '',
  date_paiement DATE,
  notes TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE public.facture_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_facture_reference()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'FAC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.facture_ref_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_facture_ref
  BEFORE INSERT ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.generate_facture_reference();

ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View factures" ON public.factures
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "DG FINANCE manage factures" ON public.factures
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'FINANCE'::app_role));

CREATE TRIGGER update_factures_updated_at
  BEFORE UPDATE ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
