
CREATE OR REPLACE FUNCTION public.on_decaissement_paye_update_maintenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_maintenance_id uuid;
BEGIN
  -- Only trigger when status changes to PAYE
  IF NEW.statut = 'PAYE' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    -- Check if this décaissement is linked to a demande_achat
    IF NEW.demande_achat_id IS NOT NULL THEN
      -- Find the maintenance linked to this demande_achat
      SELECT maintenance_id INTO v_maintenance_id
      FROM public.demandes_achat
      WHERE id = NEW.demande_achat_id;

      -- If a maintenance is linked, update its cout_reel
      IF v_maintenance_id IS NOT NULL THEN
        UPDATE public.maintenances
        SET cout_reel = NEW.montant,
            statut = 'TERMINEE',
            date_fin = CURRENT_DATE
        WHERE id = v_maintenance_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decaissement_paye_update_maintenance
AFTER UPDATE ON public.decaissements
FOR EACH ROW
EXECUTE FUNCTION public.on_decaissement_paye_update_maintenance();
