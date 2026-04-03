
CREATE OR REPLACE FUNCTION public.recalculate_chauffeur_statut(p_chauffeur_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_active_operation boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.operations
    WHERE chauffeur_id = p_chauffeur_id AND statut = 'EN_COURS'
  ) INTO has_active_operation;

  IF has_active_operation THEN
    UPDATE public.chauffeurs SET statut = 'EN_MISSION' WHERE id = p_chauffeur_id;
  ELSE
    UPDATE public.chauffeurs SET statut = 'DISPONIBLE' WHERE id = p_chauffeur_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalc_chauffeur_on_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.chauffeur_id IS NOT NULL THEN
      PERFORM public.recalculate_chauffeur_statut(OLD.chauffeur_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.chauffeur_id IS NOT NULL THEN
      PERFORM public.recalculate_chauffeur_statut(NEW.chauffeur_id);
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.chauffeur_id IS DISTINCT FROM NEW.chauffeur_id AND OLD.chauffeur_id IS NOT NULL THEN
      PERFORM public.recalculate_chauffeur_statut(OLD.chauffeur_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_recalc_chauffeur_on_operation
AFTER INSERT OR UPDATE OR DELETE ON public.operations
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_chauffeur_on_operation();
