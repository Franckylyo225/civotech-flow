-- Trigger: when demande_achat passes to PAYEE and is linked to a maintenance,
-- close the maintenance and set its real cost
CREATE OR REPLACE FUNCTION public.on_demande_achat_payee_close_maintenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_camion_immat text;
  v_maintenance_desc text;
BEGIN
  IF NEW.statut = 'PAYEE' AND OLD.statut IS DISTINCT FROM NEW.statut AND NEW.maintenance_id IS NOT NULL THEN
    UPDATE public.maintenances
       SET statut = 'TERMINEE',
           cout_reel = NEW.montant_estime,
           date_fin = COALESCE(date_fin, CURRENT_DATE)
     WHERE id = NEW.maintenance_id;

    SELECT c.immatriculation, m.description
      INTO v_camion_immat, v_maintenance_desc
      FROM public.maintenances m
      JOIN public.camions c ON c.id = m.camion_id
     WHERE m.id = NEW.maintenance_id;

    PERFORM public.notify_role(
      'LOGISTIQUE',
      'Maintenance clôturée',
      'Maintenance ' || COALESCE(v_maintenance_desc, '') || ' sur ' || COALESCE(v_camion_immat, 'véhicule') || ' clôturée — véhicule disponible.',
      'INFO',
      '/parc-auto'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_da_payee_close_maintenance ON public.demandes_achat;
CREATE TRIGGER trg_da_payee_close_maintenance
AFTER UPDATE ON public.demandes_achat
FOR EACH ROW EXECUTE FUNCTION public.on_demande_achat_payee_close_maintenance();

-- Notify on critical urgency demande d'achat creation
CREATE OR REPLACE FUNCTION public.on_demande_achat_critique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.urgence = 'CRITIQUE' THEN
    PERFORM public.notify_role(
      'DG',
      'Demande d''achat CRITIQUE',
      'Demande ' || NEW.reference || ' (' || NEW.designation || ') marquée critique — action immédiate.',
      'ALERTE',
      '/achats'
    );
    PERFORM public.notify_role(
      'ACHATS',
      'Demande d''achat CRITIQUE',
      'Demande ' || NEW.reference || ' (' || NEW.designation || ') marquée critique — action immédiate.',
      'ALERTE',
      '/achats'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_da_critique_notify ON public.demandes_achat;
CREATE TRIGGER trg_da_critique_notify
AFTER INSERT ON public.demandes_achat
FOR EACH ROW EXECUTE FUNCTION public.on_demande_achat_critique();