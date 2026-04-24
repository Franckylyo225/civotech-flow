CREATE OR REPLACE FUNCTION public.notify_consolidation_on_operation_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'TERMINEE'::statut_operation
     AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM NEW.statut) THEN

    INSERT INTO public.notifications (user_id, titre, message, type, lien)
    SELECT ur.user_id,
           'Nouvelle opération à consolider',
           'Opération ' || NEW.reference || ' (' || NEW.client_nom || ') livrée — consolidation requise.',
           'CONSOLIDATION',
           '/administration-ventes?tab=consolidation&op=' || NEW.id::text
    FROM public.user_roles ur
    WHERE ur.role = 'ADMIN_VENTES'::app_role;

    INSERT INTO public.notifications (user_id, titre, message, type, lien)
    SELECT ur.user_id,
           'Opération livrée',
           'Opération ' || NEW.reference || ' (' || NEW.client_nom || ') prête pour consolidation.',
           'CONSOLIDATION',
           '/administration-ventes?tab=consolidation&op=' || NEW.id::text
    FROM public.user_roles ur
    WHERE ur.role = 'DG'::app_role;
  END IF;

  RETURN NEW;
END;
$$;