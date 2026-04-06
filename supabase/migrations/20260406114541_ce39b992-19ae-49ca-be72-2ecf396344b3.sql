
CREATE OR REPLACE FUNCTION public.on_decaissement_paye_update_maintenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_maintenance_id uuid;
BEGIN
  IF NEW.statut = 'PAYE' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    IF NEW.demande_achat_id IS NOT NULL THEN
      SELECT maintenance_id INTO v_maintenance_id
      FROM public.demandes_achat
      WHERE id = NEW.demande_achat_id;

      IF v_maintenance_id IS NOT NULL THEN
        UPDATE public.maintenances
        SET cout_reel = NEW.montant
        WHERE id = v_maintenance_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
