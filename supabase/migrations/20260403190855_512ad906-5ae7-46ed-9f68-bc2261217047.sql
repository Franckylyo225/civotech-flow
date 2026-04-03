
-- Enum statut demande achat
CREATE TYPE public.statut_demande_achat AS ENUM (
  'BROUILLON', 'SOUMISE', 'DEVIS_EN_COURS', 'SOUMISE_DG',
  'VALIDEE_DG', 'REFUSEE_DG', 'DECAISSEMENT', 'PAYEE', 'CLOTUREE'
);

-- Enum statut décaissement
CREATE TYPE public.statut_decaissement AS ENUM ('EN_ATTENTE', 'APPROUVE', 'PAYE', 'REJETE');

-- =====================
-- DEMANDES D'ACHAT
-- =====================
CREATE TABLE public.demandes_achat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL,
  maintenance_id UUID REFERENCES public.maintenances(id) ON DELETE SET NULL,
  designation TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  quantite INTEGER NOT NULL DEFAULT 1,
  montant_estime NUMERIC NOT NULL DEFAULT 0,
  urgence TEXT NOT NULL DEFAULT 'NORMALE',
  statut statut_demande_achat NOT NULL DEFAULT 'BROUILLON',
  commentaire_dg TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequence pour référence auto
CREATE SEQUENCE public.demande_achat_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_demande_achat_reference()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'DA-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.demande_achat_ref_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_demande_achat_ref
  BEFORE INSERT ON public.demandes_achat
  FOR EACH ROW EXECUTE FUNCTION public.generate_demande_achat_reference();

ALTER TABLE public.demandes_achat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View demandes_achat" ON public.demandes_achat
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "DG manage demandes_achat" ON public.demandes_achat
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role));

CREATE POLICY "ACHATS LOGISTIQUE insert demandes_achat" ON public.demandes_achat
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'ACHATS'::app_role) OR has_role(auth.uid(), 'LOGISTIQUE'::app_role));

CREATE POLICY "ACHATS update demandes_achat" ON public.demandes_achat
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'ACHATS'::app_role));

CREATE TRIGGER update_demandes_achat_updated_at
  BEFORE UPDATE ON public.demandes_achat
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- DEVIS FOURNISSEURS
-- =====================
CREATE TABLE public.devis_fournisseurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demande_achat_id UUID NOT NULL REFERENCES public.demandes_achat(id) ON DELETE CASCADE,
  fournisseur_id UUID NOT NULL REFERENCES public.fournisseurs(id) ON DELETE RESTRICT,
  montant NUMERIC NOT NULL DEFAULT 0,
  delai_livraison_jours INTEGER DEFAULT 0,
  conditions TEXT DEFAULT '',
  document_url TEXT DEFAULT '',
  retenu BOOLEAN NOT NULL DEFAULT false,
  commentaire TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.devis_fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View devis_fournisseurs" ON public.devis_fournisseurs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "DG manage devis_fournisseurs" ON public.devis_fournisseurs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role));

CREATE POLICY "ACHATS manage devis_fournisseurs" ON public.devis_fournisseurs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'ACHATS'::app_role));

CREATE TRIGGER update_devis_fournisseurs_updated_at
  BEFORE UPDATE ON public.devis_fournisseurs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- DÉCAISSEMENTS
-- =====================
CREATE TABLE public.decaissements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL DEFAULT '',
  demande_achat_id UUID NOT NULL REFERENCES public.demandes_achat(id) ON DELETE CASCADE,
  devis_fournisseur_id UUID REFERENCES public.devis_fournisseurs(id) ON DELETE SET NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  statut statut_decaissement NOT NULL DEFAULT 'EN_ATTENTE',
  motif TEXT DEFAULT '',
  reference_paiement TEXT DEFAULT '',
  date_paiement DATE,
  commentaire TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE public.decaissement_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_decaissement_reference()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'DEC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.decaissement_ref_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decaissement_ref
  BEFORE INSERT ON public.decaissements
  FOR EACH ROW EXECUTE FUNCTION public.generate_decaissement_reference();

ALTER TABLE public.decaissements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View decaissements" ON public.decaissements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "DG manage decaissements" ON public.decaissements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role));

CREATE POLICY "FINANCE manage decaissements" ON public.decaissements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'FINANCE'::app_role));

CREATE POLICY "ACHATS insert decaissements" ON public.decaissements
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'ACHATS'::app_role));

CREATE TRIGGER update_decaissements_updated_at
  BEFORE UPDATE ON public.decaissements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
