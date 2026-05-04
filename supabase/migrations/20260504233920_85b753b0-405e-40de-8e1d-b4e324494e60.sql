-- Enums
CREATE TYPE public.tarif_zone_code AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE public.tarif_type_transport AS ENUM ('standard', 'express', 'special');

-- ─── tarifs_zone ────────────────────────────────────────────────
CREATE TABLE public.tarifs_zone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination TEXT NOT NULL,
  km INTEGER NOT NULL DEFAULT 0,
  zone public.tarif_zone_code NOT NULL,
  tonnage TEXT NOT NULL,
  type public.tarif_type_transport NOT NULL DEFAULT 'standard',
  tarif NUMERIC NOT NULL DEFAULT 0,
  validite DATE NOT NULL DEFAULT '2026-12-31',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tarifs_zone ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View tarifs_zone" ON public.tarifs_zone FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL manage tarifs_zone" ON public.tarifs_zone FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'DG') OR public.has_role(auth.uid(), 'COMMERCIAL'))
  WITH CHECK (public.has_role(auth.uid(), 'DG') OR public.has_role(auth.uid(), 'COMMERCIAL'));
CREATE TRIGGER trg_tarifs_zone_updated BEFORE UPDATE ON public.tarifs_zone
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── tarifs_km ──────────────────────────────────────────────────
CREATE TABLE public.tarifs_km (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule TEXT NOT NULL,
  tonnage_max NUMERIC NOT NULL DEFAULT 0,
  prix_km NUMERIC NOT NULL DEFAULT 0,
  forfait_depart NUMERIC NOT NULL DEFAULT 0,
  validite DATE NOT NULL DEFAULT '2026-12-31',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tarifs_km ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View tarifs_km" ON public.tarifs_km FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL manage tarifs_km" ON public.tarifs_km FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'DG') OR public.has_role(auth.uid(), 'COMMERCIAL'))
  WITH CHECK (public.has_role(auth.uid(), 'DG') OR public.has_role(auth.uid(), 'COMMERCIAL'));
CREATE TRIGGER trg_tarifs_km_updated BEFORE UPDATE ON public.tarifs_km
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── majorations ────────────────────────────────────────────────
CREATE TABLE public.majorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motif TEXT NOT NULL,
  pct NUMERIC NOT NULL DEFAULT 0,
  applicable TEXT NOT NULL DEFAULT 'Tous tarifs',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.majorations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View majorations" ON public.majorations FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL manage majorations" ON public.majorations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'DG') OR public.has_role(auth.uid(), 'COMMERCIAL'))
  WITH CHECK (public.has_role(auth.uid(), 'DG') OR public.has_role(auth.uid(), 'COMMERCIAL'));
CREATE TRIGGER trg_majorations_updated BEFORE UPDATE ON public.majorations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── frais_fixes ────────────────────────────────────────────────
CREATE TABLE public.frais_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designation TEXT NOT NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  applicable TEXT NOT NULL DEFAULT 'Par trajet',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.frais_fixes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View frais_fixes" ON public.frais_fixes FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL manage frais_fixes" ON public.frais_fixes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'DG') OR public.has_role(auth.uid(), 'COMMERCIAL'))
  WITH CHECK (public.has_role(auth.uid(), 'DG') OR public.has_role(auth.uid(), 'COMMERCIAL'));
CREATE TRIGGER trg_frais_fixes_updated BEFORE UPDATE ON public.frais_fixes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Seed ───────────────────────────────────────────────────────
INSERT INTO public.tarifs_zone (destination, km, zone, tonnage, type, tarif, validite) VALUES
  ('Abidjan → Anyama', 25, 'A', '≤ 10T', 'standard', 180000, '2026-12-31'),
  ('Abidjan → Anyama', 25, 'A', '10–40T', 'standard', 320000, '2026-12-31'),
  ('Abidjan → Grand-Bassam', 40, 'A', '≤ 40T', 'express', 520000, '2026-12-31'),
  ('Abidjan → Dabou', 55, 'A', '≤ 40T', 'standard', 410000, '2026-12-31'),
  ('Abidjan → San-Pédro', 360, 'B', '10–20T', 'standard', 850000, '2026-12-31'),
  ('Abidjan → San-Pédro', 360, 'B', '20–40T', 'standard', 1250000, '2026-12-31'),
  ('Abidjan → San-Pédro', 360, 'B', '20–40T', 'express', 1800000, '2026-12-31'),
  ('Abidjan → Sassandra', 290, 'B', '20–40T', 'standard', 1100000, '2026-12-31'),
  ('Abidjan → Bouaké', 340, 'C', '20–40T', 'standard', 1400000, '2026-12-31'),
  ('Abidjan → Yamoussoukro', 240, 'C', '20–40T', 'standard', 980000, '2026-12-31'),
  ('Abidjan → Korhogo', 630, 'C', '20–40T', 'standard', 2200000, '2026-12-31'),
  ('Abidjan → Man', 460, 'D', '20–40T', 'standard', 1900000, '2026-12-31'),
  ('Abidjan → Daloa', 390, 'D', '20–40T', 'standard', 1600000, '2026-12-31'),
  ('Abidjan → Man', 460, 'D', '20–40T', 'special', 4800000, '2026-12-31');

INSERT INTO public.tarifs_km (vehicule, tonnage_max, prix_km, forfait_depart, validite) VALUES
  ('Camion 20T Standard', 20, 2800, 45000, '2026-12-31'),
  ('Camion 40T Standard', 40, 3500, 60000, '2026-12-31'),
  ('Camion 40T Express', 40, 4900, 85000, '2026-12-31'),
  ('Camion Frigorifique', 25, 5200, 95000, '2026-12-31');

INSERT INTO public.majorations (motif, pct, applicable, actif) VALUES
  ('Surcharge carburant', 5, 'Tous tarifs', true),
  ('Transport de nuit', 20, 'Tous tarifs', true),
  ('Marchandises fragiles', 15, 'Tarif de base', true),
  ('Urgence < 24h', 35, 'Tarif de base', true),
  ('Week-end / férié', 25, 'Tous tarifs', false);

INSERT INTO public.frais_fixes (designation, montant, applicable, actif) VALUES
  ('Péage autoroute', 15000, 'Par trajet', true),
  ('Frais douane', 45000, 'Par trajet', true),
  ('Manutention port', 180000, 'Par chargement', true),
  ('Escorte sécurité', 250000, 'Sur demande', false);
