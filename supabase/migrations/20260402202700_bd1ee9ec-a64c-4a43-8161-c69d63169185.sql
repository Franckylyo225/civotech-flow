
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('DG', 'COMMERCIAL', 'LOGISTIQUE', 'FINANCE', 'ACHATS', 'ASSISTANTE');
CREATE TYPE public.statut_operation AS ENUM ('DEMANDE', 'PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ARCHIVEE');
CREATE TYPE public.statut_devis AS ENUM ('BROUILLON', 'EN_ATTENTE', 'VALIDE', 'REJETE', 'FACTURE');
CREATE TYPE public.statut_camion AS ENUM ('DISPONIBLE', 'EN_MISSION', 'EN_MAINTENANCE');
CREATE TYPE public.categorie_depense AS ENUM ('CARBURANT', 'PEAGE', 'TAXE', 'AUTRE');

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- USER_ROLES (created BEFORE has_role function)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS (now user_roles exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- RLS on user_roles
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "DG can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'DG'));

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nom text NOT NULL DEFAULT '', prenom text NOT NULL DEFAULT '',
  telephone text DEFAULT '', avatar_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nom, prenom)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nom',''), COALESCE(NEW.raw_user_meta_data->>'prenom',''));
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL, contact text DEFAULT '', email text DEFAULT '',
  telephone text DEFAULT '', adresse text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'DG') OR public.has_role(auth.uid(),'COMMERCIAL'));
CREATE POLICY "DG manage clients" ON public.clients FOR ALL TO authenticated USING (public.has_role(auth.uid(),'DG'));
CREATE POLICY "COMMERCIAL update own clients" ON public.clients FOR UPDATE TO authenticated USING (created_by=auth.uid() AND public.has_role(auth.uid(),'COMMERCIAL'));
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CAMIONS
CREATE TABLE public.camions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation text NOT NULL UNIQUE, marque text NOT NULL, modele text NOT NULL,
  capacite_tonnes numeric NOT NULL DEFAULT 0, annee integer NOT NULL DEFAULT 2024,
  statut public.statut_camion NOT NULL DEFAULT 'DISPONIBLE',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.camions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View camions" ON public.camions FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG LOGISTIQUE manage camions" ON public.camions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'DG') OR public.has_role(auth.uid(),'LOGISTIQUE'));
CREATE TRIGGER update_camions_updated_at BEFORE UPDATE ON public.camions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHAUFFEURS
CREATE TABLE public.chauffeurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL, prenom text NOT NULL, telephone text DEFAULT '',
  numero_permis text DEFAULT '', disponible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chauffeurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View chauffeurs" ON public.chauffeurs FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG LOGISTIQUE manage chauffeurs" ON public.chauffeurs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'DG') OR public.has_role(auth.uid(),'LOGISTIQUE'));
CREATE TRIGGER update_chauffeurs_updated_at BEFORE UPDATE ON public.chauffeurs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DEVIS
CREATE TABLE public.devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  commercial_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  montant numeric NOT NULL DEFAULT 0, description text DEFAULT '',
  statut public.statut_devis NOT NULL DEFAULT 'BROUILLON',
  date_validite date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View devis" ON public.devis FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL insert devis" ON public.devis FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'DG') OR public.has_role(auth.uid(),'COMMERCIAL'));
CREATE POLICY "DG manage devis" ON public.devis FOR ALL TO authenticated USING (public.has_role(auth.uid(),'DG'));
CREATE POLICY "COMMERCIAL update own devis" ON public.devis FOR UPDATE TO authenticated USING (commercial_id=auth.uid() AND public.has_role(auth.uid(),'COMMERCIAL'));
CREATE TRIGGER update_devis_updated_at BEFORE UPDATE ON public.devis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OPERATIONS
CREATE TABLE public.operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  devis_id uuid REFERENCES public.devis(id) ON DELETE SET NULL,
  devis_reference text DEFAULT '',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom text NOT NULL DEFAULT '',
  camion_id uuid REFERENCES public.camions(id) ON DELETE SET NULL,
  chauffeur_id uuid REFERENCES public.chauffeurs(id) ON DELETE SET NULL,
  lieu_embarquement text NOT NULL DEFAULT '', lieu_livraison text NOT NULL DEFAULT '',
  date_depart timestamptz, date_livraison_estimee timestamptz, date_livraison_reelle timestamptz,
  duree_estimee_heures integer,
  statut public.statut_operation NOT NULL DEFAULT 'DEMANDE',
  montant_devis numeric NOT NULL DEFAULT 0,
  poids_kg numeric, nombre_colis integer, bon_livraison_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View operations" ON public.operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG COMMERCIAL LOGISTIQUE insert" ON public.operations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'DG') OR public.has_role(auth.uid(),'COMMERCIAL') OR public.has_role(auth.uid(),'LOGISTIQUE'));
CREATE POLICY "DG manage operations" ON public.operations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'DG'));
CREATE POLICY "LOGISTIQUE update operations" ON public.operations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'LOGISTIQUE'));
CREATE POLICY "COMMERCIAL update own ops" ON public.operations FOR UPDATE TO authenticated USING (created_by=auth.uid() AND public.has_role(auth.uid(),'COMMERCIAL'));
CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON public.operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DEPENSES
CREATE TABLE public.depenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES public.operations(id) ON DELETE CASCADE NOT NULL,
  categorie public.categorie_depense NOT NULL DEFAULT 'AUTRE',
  description text NOT NULL DEFAULT '', montant numeric NOT NULL DEFAULT 0,
  date timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View depenses" ON public.depenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG LOGISTIQUE manage depenses" ON public.depenses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'DG') OR public.has_role(auth.uid(),'LOGISTIQUE'));

-- TIMELINE_EVENTS
CREATE TABLE public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES public.operations(id) ON DELETE CASCADE NOT NULL,
  date text NOT NULL DEFAULT '', heure text NOT NULL DEFAULT '',
  titre text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  statut text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View timeline" ON public.timeline_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "DG LOGISTIQUE manage timeline" ON public.timeline_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'DG') OR public.has_role(auth.uid(),'LOGISTIQUE'));

-- SEQUENCES
CREATE SEQUENCE public.operation_ref_seq START 8;
CREATE SEQUENCE public.devis_ref_seq START 10;

CREATE OR REPLACE FUNCTION public.generate_operation_reference()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'OP-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.operation_ref_seq')::text,3,'0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_operation_reference BEFORE INSERT ON public.operations FOR EACH ROW EXECUTE FUNCTION public.generate_operation_reference();

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.operations;
