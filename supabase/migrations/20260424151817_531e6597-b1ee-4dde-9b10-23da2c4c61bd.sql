-- Function: notify ADMIN_VENTES + DG when an operation becomes TERMINEE
CREATE OR REPLACE FUNCTION public.notify_consolidation_on_operation_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status transitions TO 'TERMINEE'
  IF NEW.statut = 'TERMINEE'::statut_operation
     AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM NEW.statut) THEN

    -- Notify ADMIN_VENTES users
    INSERT INTO public.notifications (user_id, titre, message, type, lien)
    SELECT ur.user_id,
           'Nouvelle opération à consolider',
           'Opération ' || NEW.reference || ' (' || NEW.client_nom || ') livrée — consolidation requise.',
           'CONSOLIDATION',
           '/administration-ventes'
    FROM public.user_roles ur
    WHERE ur.role = 'ADMIN_VENTES'::app_role;

    -- Notify DG users as well
    INSERT INTO public.notifications (user_id, titre, message, type, lien)
    SELECT ur.user_id,
           'Opération livrée',
           'Opération ' || NEW.reference || ' (' || NEW.client_nom || ') prête pour consolidation.',
           'CONSOLIDATION',
           '/administration-ventes'
    FROM public.user_roles ur
    WHERE ur.role = 'DG'::app_role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_consolidation_on_delivered ON public.operations;

CREATE TRIGGER trg_notify_consolidation_on_delivered
AFTER INSERT OR UPDATE OF statut ON public.operations
FOR EACH ROW
EXECUTE FUNCTION public.notify_consolidation_on_operation_delivered();