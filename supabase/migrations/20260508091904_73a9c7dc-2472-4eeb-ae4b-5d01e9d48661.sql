
ALTER TABLE public.camions
  ADD COLUMN IF NOT EXISTS km_max numeric NOT NULL DEFAULT 300000,
  ADD COLUMN IF NOT EXISTS date_assurance date,
  ADD COLUMN IF NOT EXISTS date_visite_tech date,
  ADD COLUMN IF NOT EXISTS date_vignette date,
  ADD COLUMN IF NOT EXISTS date_ajout date NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS km_parcourus numeric;

CREATE OR REPLACE FUNCTION public.update_camion_km_on_operation_terminee()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_delta numeric;
BEGIN
  IF NEW.statut = 'TERMINEE'
     AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM 'TERMINEE')
     AND NEW.camion_id IS NOT NULL
     AND NEW.km_parcourus IS NOT NULL
     AND NEW.km_parcourus > 0 THEN
    v_delta := NEW.km_parcourus;
    UPDATE public.camions
      SET km_actuel = COALESCE(km_actuel, 0) + v_delta
      WHERE id = NEW.camion_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_update_camion_km_on_op_terminee ON public.operations;
CREATE TRIGGER trg_update_camion_km_on_op_terminee
AFTER INSERT OR UPDATE ON public.operations
FOR EACH ROW EXECUTE FUNCTION public.update_camion_km_on_operation_terminee();
