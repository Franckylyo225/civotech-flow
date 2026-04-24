-- Enum statuts workflow
CREATE TYPE public.statut_stock_bureau AS ENUM (
  'BROUILLON', 'SOUMISE_DG', 'VALIDEE_DG', 'REFUSEE_DG', 'PAYEE'
);

-- Enum catégories
CREATE TYPE public.categorie_stock_bureau AS ENUM (
  'BUREAUTIQUE', 'CONSOMMABLES', 'MOBILIER', 'INFORMATIQUE', 'ENTRETIEN', 'AUTRE'
);

-- Table principale
CREATE TABLE public.stock_bureau_demandes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  categorie public.categorie_stock_bureau NOT NULL DEFAULT 'BUREAUTIQUE',
  urgence TEXT NOT NULL DEFAULT 'NORMALE',
  quantite INTEGER NOT NULL DEFAULT 1,
  montant NUMERIC NOT NULL DEFAULT 0,
  justificatif_url TEXT,
  statut public.statut_stock_bureau NOT NULL DEFAULT 'BROUILLON',
  commentaire_dg TEXT NOT NULL DEFAULT '',
  decaissement_id UUID REFERENCES public.decaissements(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_bureau_demandes ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE TRIGGER update_stock_bureau_demandes_updated_at
BEFORE UPDATE ON public.stock_bureau_demandes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Référence auto SB-AAAA-NNNN
CREATE OR REPLACE FUNCTION public.generate_stock_bureau_reference()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year TEXT := to_char(now(), 'YYYY');
  v_count INT;
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.stock_bureau_demandes
    WHERE reference LIKE 'SB-' || v_year || '-%';
    NEW.reference := 'SB-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_stock_bureau_reference
BEFORE INSERT ON public.stock_bureau_demandes
FOR EACH ROW EXECUTE FUNCTION public.generate_stock_bureau_reference();

-- À la validation DG, créer un décaissement EN_ATTENTE automatiquement
CREATE OR REPLACE FUNCTION public.create_decaissement_for_stock_bureau()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dec_id UUID;
BEGIN
  -- Création seulement lors du passage à VALIDEE_DG, sans décaissement existant
  IF NEW.statut = 'VALIDEE_DG' AND (OLD.statut IS DISTINCT FROM 'VALIDEE_DG') AND NEW.decaissement_id IS NULL THEN
    INSERT INTO public.decaissements (montant, motif, statut, reference, created_by)
    VALUES (
      NEW.montant,
      'Stock bureau ' || NEW.reference || ' - ' || NEW.designation,
      'EN_ATTENTE',
      '',
      NEW.created_by
    )
    RETURNING id INTO v_dec_id;
    NEW.decaissement_id := v_dec_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_decaissement_for_stock_bureau
BEFORE UPDATE ON public.stock_bureau_demandes
FOR EACH ROW EXECUTE FUNCTION public.create_decaissement_for_stock_bureau();

-- Synchronisation statut quand le décaissement passe à PAYE
CREATE OR REPLACE FUNCTION public.sync_stock_bureau_on_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.statut = 'PAYE' AND (OLD.statut IS DISTINCT FROM 'PAYE') THEN
    UPDATE public.stock_bureau_demandes
    SET statut = 'PAYEE'
    WHERE decaissement_id = NEW.id AND statut = 'VALIDEE_DG';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_stock_bureau_on_paid
AFTER UPDATE ON public.decaissements
FOR EACH ROW EXECUTE FUNCTION public.sync_stock_bureau_on_paid();

-- RLS: lecture
CREATE POLICY "View stock_bureau_demandes" ON public.stock_bureau_demandes
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'DG'::app_role) OR
  has_role(auth.uid(), 'ASSISTANTE'::app_role) OR
  has_role(auth.uid(), 'FINANCE'::app_role)
);

-- RLS: insertion par Assistante et DG
CREATE POLICY "Insert stock_bureau_demandes" ON public.stock_bureau_demandes
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ASSISTANTE'::app_role) OR
  has_role(auth.uid(), 'DG'::app_role)
);

-- RLS: Assistante modifie ses propres brouillons/soumises
CREATE POLICY "ASSISTANTE update own stock_bureau" ON public.stock_bureau_demandes
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'ASSISTANTE'::app_role) AND created_by = auth.uid()
);

-- RLS: DG full management
CREATE POLICY "DG manage stock_bureau" ON public.stock_bureau_demandes
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'DG'::app_role))
WITH CHECK (has_role(auth.uid(), 'DG'::app_role));

-- RLS: Assistante peut supprimer ses brouillons
CREATE POLICY "ASSISTANTE delete own brouillons" ON public.stock_bureau_demandes
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'ASSISTANTE'::app_role)
  AND created_by = auth.uid()
  AND statut = 'BROUILLON'
);

-- Bucket privé pour justificatifs
INSERT INTO storage.buckets (id, name, public)
VALUES ('stock-bureau-justificatifs', 'stock-bureau-justificatifs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (lecture/écriture par les rôles autorisés)
CREATE POLICY "View stock_bureau files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'stock-bureau-justificatifs' AND (
    has_role(auth.uid(), 'DG'::app_role) OR
    has_role(auth.uid(), 'ASSISTANTE'::app_role) OR
    has_role(auth.uid(), 'FINANCE'::app_role)
  )
);

CREATE POLICY "Upload stock_bureau files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'stock-bureau-justificatifs' AND (
    has_role(auth.uid(), 'DG'::app_role) OR
    has_role(auth.uid(), 'ASSISTANTE'::app_role)
  )
);

CREATE POLICY "Delete stock_bureau files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'stock-bureau-justificatifs' AND (
    has_role(auth.uid(), 'DG'::app_role) OR
    has_role(auth.uid(), 'ASSISTANTE'::app_role)
  )
);