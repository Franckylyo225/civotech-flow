
-- =============================================
-- 1. EMPLOYES: restrict SELECT to DG, FINANCE
-- =============================================
DROP POLICY IF EXISTS "View employes" ON public.employes;
CREATE POLICY "View employes restricted"
ON public.employes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'FINANCE'::app_role)
);

-- =============================================
-- 2. SALAIRES_MENSUELS: restrict SELECT to DG, FINANCE
-- =============================================
DROP POLICY IF EXISTS "View salaires_mensuels" ON public.salaires_mensuels;
CREATE POLICY "View salaires_mensuels restricted"
ON public.salaires_mensuels FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'FINANCE'::app_role)
);

-- =============================================
-- 3. CHAUFFEURS: restrict SELECT to DG, LOGISTIQUE
-- =============================================
DROP POLICY IF EXISTS "View chauffeurs" ON public.chauffeurs;
CREATE POLICY "View chauffeurs restricted"
ON public.chauffeurs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'LOGISTIQUE'::app_role)
);

-- =============================================
-- 4. FOURNISSEURS: restrict SELECT to DG, ACHATS
-- =============================================
DROP POLICY IF EXISTS "View fournisseurs" ON public.fournisseurs;
CREATE POLICY "View fournisseurs restricted"
ON public.fournisseurs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'ACHATS'::app_role)
);

-- =============================================
-- 5. CLIENTS: restrict SELECT to DG, COMMERCIAL, LOGISTIQUE
-- =============================================
DROP POLICY IF EXISTS "View clients" ON public.clients;
CREATE POLICY "View clients restricted"
ON public.clients FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'COMMERCIAL'::app_role) OR
  public.has_role(auth.uid(), 'LOGISTIQUE'::app_role)
);

-- =============================================
-- 6. DECAISSEMENTS: restrict SELECT to DG, FINANCE, ACHATS
-- =============================================
DROP POLICY IF EXISTS "View decaissements" ON public.decaissements;
CREATE POLICY "View decaissements restricted"
ON public.decaissements FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'FINANCE'::app_role) OR
  public.has_role(auth.uid(), 'ACHATS'::app_role)
);

-- =============================================
-- 7. CHARGES_FIXES: restrict SELECT to DG, FINANCE
-- =============================================
DROP POLICY IF EXISTS "View charges_fixes" ON public.charges_fixes;
CREATE POLICY "View charges_fixes restricted"
ON public.charges_fixes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'FINANCE'::app_role)
);

-- =============================================
-- 8. CHARGES_MENSUELLES: restrict SELECT to DG, FINANCE
-- =============================================
DROP POLICY IF EXISTS "View charges_mensuelles" ON public.charges_mensuelles;
CREATE POLICY "View charges_mensuelles restricted"
ON public.charges_mensuelles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'FINANCE'::app_role)
);

-- =============================================
-- 9. FACTURES: restrict SELECT to DG, FINANCE, COMMERCIAL
-- =============================================
DROP POLICY IF EXISTS "View factures" ON public.factures;
CREATE POLICY "View factures restricted"
ON public.factures FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'FINANCE'::app_role) OR
  public.has_role(auth.uid(), 'COMMERCIAL'::app_role)
);

-- =============================================
-- 10. PROFILES: users see own + DG sees all
-- =============================================
DROP POLICY IF EXISTS "View all profiles" ON public.profiles;
CREATE POLICY "View own profile or DG"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'ADMIN'::app_role)
);

-- =============================================
-- 11. NOTIFICATIONS: restrict INSERT to system/service role
-- =============================================
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
CREATE POLICY "System insert notifications restricted"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'DG'::app_role) OR
  public.has_role(auth.uid(), 'ADMIN'::app_role)
);
