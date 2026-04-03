
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action text;
  v_record_id text;
  v_details jsonb := '{}'::jsonb;
  v_user_id uuid;
  v_user_nom text := '';
  v_ref text := '';
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  SELECT COALESCE(p.nom || ' ' || p.prenom, '') INTO v_user_nom
  FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_record_id := OLD.id::text;
    v_details := jsonb_build_object('table', TG_TABLE_NAME);
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_record_id := NEW.id::text;
    IF TG_TABLE_NAME IN ('devis','operations','factures','decaissements','demandes_achat') THEN
      v_ref := NEW.reference;
    END IF;
    v_details := jsonb_build_object('reference', v_ref);
  ELSE
    v_action := 'UPDATE';
    v_record_id := NEW.id::text;
    IF TG_TABLE_NAME IN ('devis','operations','factures','decaissements','demandes_achat') THEN
      v_ref := NEW.reference;
    END IF;
    IF to_jsonb(NEW) ? 'statut' AND to_jsonb(OLD) ? 'statut' THEN
      v_details := jsonb_build_object('reference', v_ref, 'old_statut', to_jsonb(OLD)->>'statut', 'new_statut', to_jsonb(NEW)->>'statut');
    ELSE
      v_details := jsonb_build_object('reference', v_ref);
    END IF;
  END IF;

  INSERT INTO public.activity_logs (user_id, user_nom, action, table_cible, enregistrement_id, details)
  VALUES (v_user_id, v_user_nom, v_action, TG_TABLE_NAME, v_record_id, v_details);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_devis ON public.devis;
CREATE TRIGGER trg_log_devis
AFTER INSERT OR UPDATE OR DELETE ON public.devis
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_operations ON public.operations;
CREATE TRIGGER trg_log_operations
AFTER INSERT OR UPDATE OR DELETE ON public.operations
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_factures ON public.factures;
CREATE TRIGGER trg_log_factures
AFTER INSERT OR UPDATE OR DELETE ON public.factures
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_decaissements ON public.decaissements;
CREATE TRIGGER trg_log_decaissements
AFTER INSERT OR UPDATE OR DELETE ON public.decaissements
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_demandes_achat ON public.demandes_achat;
CREATE TRIGGER trg_log_demandes_achat
AFTER INSERT OR UPDATE OR DELETE ON public.demandes_achat
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_maintenances ON public.maintenances;
CREATE TRIGGER trg_log_maintenances
AFTER INSERT OR UPDATE OR DELETE ON public.maintenances
FOR EACH ROW EXECUTE FUNCTION public.log_activity();
