-- Company settings table (single-row, mono-tenant)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL DEFAULT '',
  logo_url text DEFAULT '',
  adresse text DEFAULT '',
  telephone text DEFAULT '',
  email text DEFAULT '',
  site_web text DEFAULT '',
  devise text NOT NULL DEFAULT 'FCFA',
  format_date text NOT NULL DEFAULT 'DD/MM/YYYY',
  fuseau_horaire text NOT NULL DEFAULT 'Africa/Abidjan',
  langue text NOT NULL DEFAULT 'fr',
  taux_tva numeric NOT NULL DEFAULT 18,
  conditions_paiement text DEFAULT 'Net 30 jours',
  prefixe_facture text NOT NULL DEFAULT 'FAC',
  prefixe_devis text NOT NULL DEFAULT 'DEV',
  prefixe_operation text NOT NULL DEFAULT 'OP',
  prefixe_decaissement text NOT NULL DEFAULT 'DEC',
  prefixe_demande_achat text NOT NULL DEFAULT 'DA',
  types_vehicules jsonb NOT NULL DEFAULT '["Porteur","Semi-remorque","Citerne","Benne","Plateau","Frigorifique"]'::jsonb,
  types_prestations jsonb NOT NULL DEFAULT '["Transport routier","Manutention","Entreposage","Transit","Dédouanement"]'::jsonb,
  categories_depenses jsonb NOT NULL DEFAULT '["Carburant","Péage","Taxe","Autre"]'::jsonb,
  modes_paiement jsonb NOT NULL DEFAULT '["Espèces","Virement","Chèque","Mobile Money"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View company_settings"
  ON public.company_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "DG ADMIN manage company_settings"
  ON public.company_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role))
  WITH CHECK (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role));

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.company_settings (nom) VALUES ('Civotech Flow');

-- Activity logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text DEFAULT '',
  user_nom text DEFAULT '',
  action text NOT NULL,
  table_cible text DEFAULT '',
  enregistrement_id text DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DG ADMIN view activity_logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Users view own activity_logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Insert activity_logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);