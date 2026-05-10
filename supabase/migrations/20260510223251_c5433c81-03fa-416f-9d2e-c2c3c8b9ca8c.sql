
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'SUPER_ADMIN'
  )
$$;

DROP POLICY IF EXISTS "SUPER_ADMIN manage user_roles" ON public.user_roles;
CREATE POLICY "SUPER_ADMIN manage user_roles"
ON public.user_roles
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "SUPER_ADMIN view all profiles" ON public.profiles;
CREATE POLICY "SUPER_ADMIN view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_super_admin(auth.uid()));
