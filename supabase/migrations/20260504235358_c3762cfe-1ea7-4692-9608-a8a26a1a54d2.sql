-- Unicité (insensible à la casse) sur zones et tonnages
CREATE UNIQUE INDEX IF NOT EXISTS zones_config_code_unique_ci ON public.zones_config (lower(code));
CREATE UNIQUE INDEX IF NOT EXISTS tonnages_config_label_unique_ci ON public.tonnages_config (lower(label));

-- Empêche la suppression d'une zone référencée par un tarif
CREATE OR REPLACE FUNCTION public.prevent_delete_zone_in_use()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.tarifs_zone WHERE zone = OLD.code;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Impossible de supprimer la zone % : % tarif(s) y font référence.', OLD.code, v_count
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_zone_in_use ON public.zones_config;
CREATE TRIGGER trg_prevent_delete_zone_in_use
BEFORE DELETE ON public.zones_config
FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_zone_in_use();

-- Empêche la suppression d'un tonnage référencé par un tarif
CREATE OR REPLACE FUNCTION public.prevent_delete_tonnage_in_use()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.tarifs_zone WHERE tonnage = OLD.label;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Impossible de supprimer le tonnage "%" : % tarif(s) y font référence.', OLD.label, v_count
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_tonnage_in_use ON public.tonnages_config;
CREATE TRIGGER trg_prevent_delete_tonnage_in_use
BEFORE DELETE ON public.tonnages_config
FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_tonnage_in_use();

-- Si une zone/tonnage est renommée, on cascade le rename sur tarifs_zone
CREATE OR REPLACE FUNCTION public.cascade_rename_zone_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    UPDATE public.tarifs_zone SET zone = NEW.code WHERE zone = OLD.code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_rename_zone_code ON public.zones_config;
CREATE TRIGGER trg_cascade_rename_zone_code
AFTER UPDATE ON public.zones_config
FOR EACH ROW EXECUTE FUNCTION public.cascade_rename_zone_code();

CREATE OR REPLACE FUNCTION public.cascade_rename_tonnage_label()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.label IS DISTINCT FROM OLD.label THEN
    UPDATE public.tarifs_zone SET tonnage = NEW.label WHERE tonnage = OLD.label;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_rename_tonnage_label ON public.tonnages_config;
CREATE TRIGGER trg_cascade_rename_tonnage_label
AFTER UPDATE ON public.tonnages_config
FOR EACH ROW EXECUTE FUNCTION public.cascade_rename_tonnage_label();