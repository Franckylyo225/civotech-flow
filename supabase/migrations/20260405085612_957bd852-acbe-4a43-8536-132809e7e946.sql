
-- Table for custom roles
CREATE TABLE public.custom_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  role_base text NOT NULL DEFAULT 'COMMERCIAL',
  actif boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DG ADMIN manage custom_roles" ON public.custom_roles
  FOR ALL USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "View custom_roles" ON public.custom_roles
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for role permissions (both built-in and custom)
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key text NOT NULL,
  module text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (role_key, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DG ADMIN manage role_permissions" ON public.role_permissions
  FOR ALL USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "View role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed built-in role permissions
INSERT INTO public.role_permissions (role_key, module, permissions) VALUES
  -- DG
  ('DG', 'Tableau de bord', '{"lecture"}'),
  ('DG', 'Devis', '{"lecture","creation","modification","validation","suppression"}'),
  ('DG', 'Opérations', '{"lecture","creation","modification","validation","suppression"}'),
  ('DG', 'Clients', '{"lecture","creation","modification","suppression"}'),
  ('DG', 'Finance', '{"lecture","creation","modification","validation","suppression"}'),
  ('DG', 'Achats', '{"lecture","creation","modification","validation","suppression"}'),
  ('DG', 'Parc auto', '{"lecture","creation","modification","suppression"}'),
  ('DG', 'Maintenance', '{"lecture","creation","modification","suppression"}'),
  ('DG', 'Rapports', '{"lecture"}'),
  ('DG', 'Paramètres', '{"lecture","modification"}'),
  -- COMMERCIAL
  ('COMMERCIAL', 'Tableau de bord', '{"lecture"}'),
  ('COMMERCIAL', 'Devis', '{"lecture","creation","modification"}'),
  ('COMMERCIAL', 'Opérations', '{"lecture","creation"}'),
  ('COMMERCIAL', 'Clients', '{"lecture","creation","modification"}'),
  -- LOGISTIQUE
  ('LOGISTIQUE', 'Tableau de bord', '{"lecture"}'),
  ('LOGISTIQUE', 'Opérations', '{"lecture","modification"}'),
  ('LOGISTIQUE', 'Parc auto', '{"lecture","creation","modification"}'),
  ('LOGISTIQUE', 'Maintenance', '{"lecture","creation","modification"}'),
  -- FINANCE
  ('FINANCE', 'Tableau de bord', '{"lecture"}'),
  ('FINANCE', 'Finance', '{"lecture","creation","modification","validation"}'),
  ('FINANCE', 'Rapports', '{"lecture"}'),
  -- ACHATS
  ('ACHATS', 'Tableau de bord', '{"lecture"}'),
  ('ACHATS', 'Achats', '{"lecture","creation","modification"}'),
  -- ASSISTANTE
  ('ASSISTANTE', 'Tableau de bord', '{"lecture"}'),
  -- MAINTENANCE
  ('MAINTENANCE', 'Tableau de bord', '{"lecture"}'),
  ('MAINTENANCE', 'Maintenance', '{"lecture","creation","modification"}'),
  ('MAINTENANCE', 'Parc auto', '{"lecture"}'),
  -- ADMIN
  ('ADMIN', 'Tableau de bord', '{"lecture"}'),
  ('ADMIN', 'Devis', '{"lecture","creation","modification","validation","suppression"}'),
  ('ADMIN', 'Opérations', '{"lecture","creation","modification","validation","suppression"}'),
  ('ADMIN', 'Clients', '{"lecture","creation","modification","suppression"}'),
  ('ADMIN', 'Finance', '{"lecture","creation","modification","validation","suppression"}'),
  ('ADMIN', 'Achats', '{"lecture","creation","modification","validation","suppression"}'),
  ('ADMIN', 'Parc auto', '{"lecture","creation","modification","suppression"}'),
  ('ADMIN', 'Maintenance', '{"lecture","creation","modification","suppression"}'),
  ('ADMIN', 'Rapports', '{"lecture"}'),
  ('ADMIN', 'Paramètres', '{"lecture","modification"}');
