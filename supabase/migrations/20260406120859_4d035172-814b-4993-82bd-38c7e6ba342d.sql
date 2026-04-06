
CREATE OR REPLACE FUNCTION public.on_maintenance_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  camion_immat text;
BEGIN
  SELECT immatriculation INTO camion_immat FROM public.camions WHERE id = NEW.camion_id;
  
  PERFORM public.notify_role('DG', 'Maintenance planifiée',
    'Maintenance ' || NEW.type || ' planifiée pour ' || COALESCE(camion_immat, 'un véhicule') || '.',
    'ALERTE', '/parc-auto');
  
  PERFORM public.notify_role('LOGISTIQUE', 'Maintenance planifiée',
    'Maintenance ' || NEW.type || ' planifiée pour ' || COALESCE(camion_immat, 'un véhicule') || '.',
    'ALERTE', '/parc-auto');
  
  PERFORM public.notify_role('ACHATS', 'Nouvelle maintenance — devis requis',
    'Maintenance ' || NEW.type || ' pour ' || COALESCE(camion_immat, 'un véhicule') || '. Veuillez collecter les devis fournisseurs et soumettre au DG.',
    'VALIDATION', '/achats');
  
  RETURN NEW;
END;
$function$;
