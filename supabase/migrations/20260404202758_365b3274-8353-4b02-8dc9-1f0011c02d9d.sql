
-- Enum for account type
CREATE TYPE public.type_compte AS ENUM ('BANQUE', 'CAISSE');

-- Enum for transaction type
CREATE TYPE public.type_transaction_tresorerie AS ENUM ('ENCAISSEMENT', 'DECAISSEMENT', 'TRANSFERT');

-- Accounts table
CREATE TABLE public.comptes_tresorerie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  type type_compte NOT NULL,
  solde NUMERIC NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comptes_tresorerie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DG FINANCE manage comptes_tresorerie"
  ON public.comptes_tresorerie FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'FINANCE'::app_role));

CREATE POLICY "View comptes_tresorerie"
  ON public.comptes_tresorerie FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_comptes_tresorerie_updated_at
  BEFORE UPDATE ON public.comptes_tresorerie
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transactions table
CREATE SEQUENCE public.transaction_tresorerie_ref_seq START 1;

CREATE TABLE public.transactions_tresorerie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL DEFAULT '',
  type type_transaction_tresorerie NOT NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  date_transaction DATE NOT NULL DEFAULT CURRENT_DATE,
  compte_source_id UUID REFERENCES public.comptes_tresorerie(id),
  compte_destination_id UUID REFERENCES public.comptes_tresorerie(id),
  facture_id UUID REFERENCES public.factures(id),
  decaissement_id UUID REFERENCES public.decaissements(id),
  description TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions_tresorerie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DG FINANCE manage transactions_tresorerie"
  ON public.transactions_tresorerie FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'FINANCE'::app_role));

CREATE POLICY "View transactions_tresorerie"
  ON public.transactions_tresorerie FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_transactions_tresorerie_updated_at
  BEFORE UPDATE ON public.transactions_tresorerie
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate reference
CREATE OR REPLACE FUNCTION public.generate_transaction_tresorerie_reference()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'TRS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.transaction_tresorerie_ref_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_transaction_tresorerie_ref
  BEFORE INSERT ON public.transactions_tresorerie
  FOR EACH ROW EXECUTE FUNCTION public.generate_transaction_tresorerie_reference();

-- Auto-update account balances on transaction insert
CREATE OR REPLACE FUNCTION public.update_solde_comptes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.type = 'ENCAISSEMENT' THEN
    -- Credit destination account
    IF NEW.compte_destination_id IS NOT NULL THEN
      UPDATE public.comptes_tresorerie SET solde = solde + NEW.montant WHERE id = NEW.compte_destination_id;
    END IF;
  ELSIF NEW.type = 'DECAISSEMENT' THEN
    -- Debit source account
    IF NEW.compte_source_id IS NOT NULL THEN
      UPDATE public.comptes_tresorerie SET solde = solde - NEW.montant WHERE id = NEW.compte_source_id;
    END IF;
  ELSIF NEW.type = 'TRANSFERT' THEN
    -- Debit source, credit destination
    IF NEW.compte_source_id IS NOT NULL THEN
      UPDATE public.comptes_tresorerie SET solde = solde - NEW.montant WHERE id = NEW.compte_source_id;
    END IF;
    IF NEW.compte_destination_id IS NOT NULL THEN
      UPDATE public.comptes_tresorerie SET solde = solde + NEW.montant WHERE id = NEW.compte_destination_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_solde_comptes
  AFTER INSERT ON public.transactions_tresorerie
  FOR EACH ROW EXECUTE FUNCTION public.update_solde_comptes();
