
-- 1) Add SUPER_ADMIN to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- 2) Platform settings (single-row config table)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_mode_enabled boolean NOT NULL DEFAULT false,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.platform_settings (demo_mode_enabled)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (login page needs to know if demo mode is enabled)
CREATE POLICY "View platform_settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only SUPER_ADMIN can manage (use ::text comparison to avoid same-tx enum restriction)
CREATE POLICY "SUPER_ADMIN manage platform_settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'));

-- Allow public (anon) read of platform_settings so login page can fetch demo mode without auth
CREATE POLICY "Public view platform_settings"
  ON public.platform_settings FOR SELECT
  TO anon
  USING (true);

-- 3) Grant SUPER_ADMIN broad management access to platform-management tables
-- profiles: SUPER_ADMIN can view all
CREATE POLICY "SUPER_ADMIN view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'));

-- user_roles: allow SUPER_ADMIN to view/manage roles
CREATE POLICY "SUPER_ADMIN manage user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'SUPER_ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'SUPER_ADMIN'));

-- activity_logs: SUPER_ADMIN can view all
CREATE POLICY "SUPER_ADMIN view activity_logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'));

-- custom_roles & role_permissions: full management
CREATE POLICY "SUPER_ADMIN manage custom_roles"
  ON public.custom_roles FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'));

CREATE POLICY "SUPER_ADMIN manage role_permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'));

-- company_settings: SUPER_ADMIN can manage
CREATE POLICY "SUPER_ADMIN manage company_settings"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'));

-- notifications insert: allow SUPER_ADMIN to insert
CREATE POLICY "SUPER_ADMIN insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SUPER_ADMIN'));

-- 4) Updated_at trigger for platform_settings
CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
