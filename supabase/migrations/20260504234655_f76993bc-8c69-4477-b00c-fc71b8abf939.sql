
-- Table zones configurables
CREATE TABLE public.zones_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  couleur text NOT NULL DEFAULT '#10B981',
  ordre integer NOT NULL DEFAULT 0,
  actif boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zones_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View zones_config" ON public.zones_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL manage zones_config" ON public.zones_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'COMMERCIAL'::app_role))
  WITH CHECK (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'COMMERCIAL'::app_role));

CREATE TRIGGER trg_zones_config_updated BEFORE UPDATE ON public.zones_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table tonnages configurables
CREATE TABLE public.tonnages_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  borne_haute numeric NOT NULL DEFAULT 0,
  ordre integer NOT NULL DEFAULT 0,
  actif boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tonnages_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View tonnages_config" ON public.tonnages_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL manage tonnages_config" ON public.tonnages_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'COMMERCIAL'::app_role))
  WITH CHECK (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'COMMERCIAL'::app_role));

CREATE TRIGGER trg_tonnages_config_updated BEFORE UPDATE ON public.tonnages_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed zones
INSERT INTO public.zones_config (code, label, couleur, ordre) VALUES
  ('A', 'Zone A — Grand Abidjan et périphérie', '#10B981', 1),
  ('B', 'Zone B — Côte sud', '#3B82F6', 2),
  ('C', 'Zone C — Centre et Nord', '#F59E0B', 3),
  ('D', 'Zone D — Ouest', '#EF4444', 4);

-- Seed tonnages
INSERT INTO public.tonnages_config (label, borne_haute, ordre) VALUES
  ('≤ 10T', 10, 1),
  ('10–20T', 20, 2),
  ('20–40T', 40, 3),
  ('> 40T', 50, 4);
