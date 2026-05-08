
-- Trigger: recalc chauffeur statut on operations changes
DROP TRIGGER IF EXISTS trg_recalc_chauffeur_on_operation ON public.operations;
CREATE TRIGGER trg_recalc_chauffeur_on_operation
AFTER INSERT OR UPDATE OR DELETE ON public.operations
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_chauffeur_on_operation();

-- Trigger: recalc camion statut on operations changes
DROP TRIGGER IF EXISTS trg_recalc_camion_on_operation ON public.operations;
CREATE TRIGGER trg_recalc_camion_on_operation
AFTER INSERT OR UPDATE OR DELETE ON public.operations
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_camion_on_operation();

-- Trigger: recalc camion statut on maintenance changes
DROP TRIGGER IF EXISTS trg_recalc_camion_on_maintenance ON public.maintenances;
CREATE TRIGGER trg_recalc_camion_on_maintenance
AFTER INSERT OR UPDATE OR DELETE ON public.maintenances
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_camion_on_maintenance();

-- Resync all chauffeurs and camions
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.chauffeurs LOOP
    PERFORM public.recalculate_chauffeur_statut(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.camions LOOP
    PERFORM public.recalculate_camion_statut(r.id);
  END LOOP;
END $$;

-- Keep `disponible` column in sync with statut for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_chauffeur_disponible()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.disponible := (NEW.statut = 'DISPONIBLE');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_chauffeur_disponible ON public.chauffeurs;
CREATE TRIGGER trg_sync_chauffeur_disponible
BEFORE INSERT OR UPDATE OF statut ON public.chauffeurs
FOR EACH ROW EXECUTE FUNCTION public.sync_chauffeur_disponible();

UPDATE public.chauffeurs SET disponible = (statut = 'DISPONIBLE');
