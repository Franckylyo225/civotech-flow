
-- Add compte_source_id to decaissements
ALTER TABLE public.decaissements
  ADD COLUMN compte_source_id uuid REFERENCES public.comptes_tresorerie(id);

-- Create or replace the trigger function to use the selected compte
CREATE OR REPLACE FUNCTION public.on_decaissement_paye_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_compte_id uuid;
BEGIN
  IF NEW.statut = 'PAYE' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    -- Use the selected compte_source_id, fallback to first active BANQUE then CAISSE
    v_compte_id := NEW.compte_source_id;
    
    IF v_compte_id IS NULL THEN
      SELECT id INTO v_compte_id FROM public.comptes_tresorerie
        WHERE type = 'BANQUE' AND actif = true ORDER BY created_at LIMIT 1;
    END IF;
    
    IF v_compte_id IS NULL THEN
      SELECT id INTO v_compte_id FROM public.comptes_tresorerie
        WHERE type = 'CAISSE' AND actif = true ORDER BY created_at LIMIT 1;
    END IF;

    IF v_compte_id IS NOT NULL THEN
      INSERT INTO public.transactions_tresorerie (
        type, montant, date_transaction, compte_source_id,
        decaissement_id, description, created_by
      ) VALUES (
        'DECAISSEMENT',
        NEW.montant,
        CURRENT_DATE,
        v_compte_id,
        NEW.id,
        'Décaissement ' || NEW.reference || COALESCE(' - ' || NEW.motif, ''),
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decaissement_paye_transaction
  AFTER UPDATE ON public.decaissements
  FOR EACH ROW EXECUTE FUNCTION public.on_decaissement_paye_transaction();
