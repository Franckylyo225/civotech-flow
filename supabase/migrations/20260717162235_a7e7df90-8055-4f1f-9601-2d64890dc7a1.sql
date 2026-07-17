
-- Add remorque_id to operations (second equipment)
ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS remorque_id uuid REFERENCES public.camions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_operations_remorque_id ON public.operations(remorque_id);

-- Recalculate camion status also when the remorque link changes
CREATE OR REPLACE FUNCTION public.trigger_recalc_camion_on_operation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.camion_id IS NOT NULL THEN PERFORM public.recalculate_camion_statut(OLD.camion_id); END IF;
    IF OLD.remorque_id IS NOT NULL THEN PERFORM public.recalculate_camion_statut(OLD.remorque_id); END IF;
    RETURN OLD;
  ELSE
    IF NEW.camion_id IS NOT NULL THEN PERFORM public.recalculate_camion_statut(NEW.camion_id); END IF;
    IF NEW.remorque_id IS NOT NULL THEN PERFORM public.recalculate_camion_statut(NEW.remorque_id); END IF;
    IF TG_OP = 'UPDATE' THEN
      IF OLD.camion_id IS DISTINCT FROM NEW.camion_id AND OLD.camion_id IS NOT NULL THEN
        PERFORM public.recalculate_camion_statut(OLD.camion_id);
      END IF;
      IF OLD.remorque_id IS DISTINCT FROM NEW.remorque_id AND OLD.remorque_id IS NOT NULL THEN
        PERFORM public.recalculate_camion_statut(OLD.remorque_id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;
END;
$function$;

-- Update recalc function so both tracteur and remorque get EN_MISSION
CREATE OR REPLACE FUNCTION public.recalculate_camion_statut(p_camion_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_active_maintenance boolean;
  has_active_operation boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.maintenances
    WHERE camion_id = p_camion_id AND statut IN ('PLANIFIEE', 'EN_COURS')
  ) INTO has_active_maintenance;

  SELECT EXISTS (
    SELECT 1 FROM public.operations
    WHERE (camion_id = p_camion_id OR remorque_id = p_camion_id) AND statut = 'EN_COURS'
  ) INTO has_active_operation;

  IF has_active_maintenance THEN
    UPDATE public.camions SET statut = 'EN_MAINTENANCE' WHERE id = p_camion_id;
  ELSIF has_active_operation THEN
    UPDATE public.camions SET statut = 'EN_MISSION' WHERE id = p_camion_id;
  ELSE
    UPDATE public.camions SET statut = 'DISPONIBLE' WHERE id = p_camion_id;
  END IF;
END;
$function$;
