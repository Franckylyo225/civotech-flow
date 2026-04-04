
CREATE OR REPLACE FUNCTION public.on_facture_payee_encaissement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_compte_id uuid;
BEGIN
  -- Only trigger when status changes to PAYEE
  IF NEW.statut = 'PAYEE' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    -- Find first active bank account
    SELECT id INTO v_compte_id FROM public.comptes_tresorerie
      WHERE type = 'BANQUE' AND actif = true ORDER BY created_at LIMIT 1;

    IF v_compte_id IS NOT NULL THEN
      INSERT INTO public.transactions_tresorerie (
        type, montant, date_transaction, compte_destination_id,
        facture_id, description, created_by
      ) VALUES (
        'ENCAISSEMENT',
        NEW.montant_ttc,
        CURRENT_DATE,
        v_compte_id,
        NEW.id,
        'Paiement facture ' || NEW.reference,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_facture_payee_encaissement
  AFTER UPDATE ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.on_facture_payee_encaissement();
