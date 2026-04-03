
-- Function to recalculate a camion's statut based on maintenances and operations
CREATE OR REPLACE FUNCTION public.recalculate_camion_statut(p_camion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_active_maintenance boolean;
  has_active_operation boolean;
BEGIN
  -- Check for active maintenances (PLANIFIEE or EN_COURS)
  SELECT EXISTS (
    SELECT 1 FROM public.maintenances
    WHERE camion_id = p_camion_id AND statut IN ('PLANIFIEE', 'EN_COURS')
  ) INTO has_active_maintenance;

  -- Check for active operations (EN_COURS)
  SELECT EXISTS (
    SELECT 1 FROM public.operations
    WHERE camion_id = p_camion_id AND statut = 'EN_COURS'
  ) INTO has_active_operation;

  -- Priority: maintenance > mission > disponible
  IF has_active_maintenance THEN
    UPDATE public.camions SET statut = 'EN_MAINTENANCE' WHERE id = p_camion_id;
  ELSIF has_active_operation THEN
    UPDATE public.camions SET statut = 'EN_MISSION' WHERE id = p_camion_id;
  ELSE
    UPDATE public.camions SET statut = 'DISPONIBLE' WHERE id = p_camion_id;
  END IF;
END;
$$;

-- Trigger function for maintenances changes
CREATE OR REPLACE FUNCTION public.trigger_recalc_camion_on_maintenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_camion_statut(OLD.camion_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_camion_statut(NEW.camion_id);
    IF TG_OP = 'UPDATE' AND OLD.camion_id IS DISTINCT FROM NEW.camion_id THEN
      PERFORM public.recalculate_camion_statut(OLD.camion_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger function for operations changes
CREATE OR REPLACE FUNCTION public.trigger_recalc_camion_on_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.camion_id IS NOT NULL THEN
      PERFORM public.recalculate_camion_statut(OLD.camion_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.camion_id IS NOT NULL THEN
      PERFORM public.recalculate_camion_statut(NEW.camion_id);
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.camion_id IS DISTINCT FROM NEW.camion_id AND OLD.camion_id IS NOT NULL THEN
      PERFORM public.recalculate_camion_statut(OLD.camion_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_recalc_camion_on_maintenance
AFTER INSERT OR UPDATE OR DELETE ON public.maintenances
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_camion_on_maintenance();

CREATE TRIGGER trg_recalc_camion_on_operation
AFTER INSERT OR UPDATE OR DELETE ON public.operations
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_camion_on_operation();
