-- Enum pour le statut des factures fournisseurs
CREATE TYPE public.statut_supplier_invoice AS ENUM (
  'received',
  'processing',
  'pending_DG',
  'approved_for_payment',
  'cheque_ready',
  'paid',
  'delivered',
  'archived'
);

CREATE TYPE public.payment_method_supplier AS ENUM ('cheque', 'virement');

-- Sequence pour la référence
CREATE SEQUENCE IF NOT EXISTS public.supplier_invoice_ref_seq START 1;

-- Table principale
CREATE TABLE public.supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.fournisseurs(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL DEFAULT 0,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  file_url TEXT,
  status public.statut_supplier_invoice NOT NULL DEFAULT 'received',
  payment_method public.payment_method_supplier,
  description TEXT DEFAULT '',
  -- Liens optionnels
  demande_achat_id UUID REFERENCES public.demandes_achat(id) ON DELETE SET NULL,
  maintenance_id UUID REFERENCES public.maintenances(id) ON DELETE SET NULL,
  decaissement_id UUID REFERENCES public.decaissements(id) ON DELETE SET NULL,
  payment_batch_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_invoices_status ON public.supplier_invoices(status);
CREATE INDEX idx_supplier_invoices_supplier ON public.supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_batch ON public.supplier_invoices(payment_batch_id);

-- Table d'historique
CREATE TABLE public.supplier_invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_invoice_id UUID NOT NULL REFERENCES public.supplier_invoices(id) ON DELETE CASCADE,
  ancien_statut public.statut_supplier_invoice,
  nouveau_statut public.statut_supplier_invoice NOT NULL,
  commentaire TEXT DEFAULT '',
  user_id UUID,
  user_nom TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_invoice_history_invoice ON public.supplier_invoice_history(supplier_invoice_id);

-- RLS
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoice_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View supplier_invoices"
ON public.supplier_invoices FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Manage supplier_invoices"
ON public.supplier_invoices FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'DG'::app_role)
  OR has_role(auth.uid(), 'ASSISTANTE'::app_role)
  OR has_role(auth.uid(), 'FINANCE'::app_role)
  OR has_role(auth.uid(), 'ACHATS'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'DG'::app_role)
  OR has_role(auth.uid(), 'ASSISTANTE'::app_role)
  OR has_role(auth.uid(), 'FINANCE'::app_role)
  OR has_role(auth.uid(), 'ACHATS'::app_role)
);

CREATE POLICY "View supplier_invoice_history"
ON public.supplier_invoice_history FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Insert supplier_invoice_history"
ON public.supplier_invoice_history FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'DG'::app_role)
  OR has_role(auth.uid(), 'ASSISTANTE'::app_role)
  OR has_role(auth.uid(), 'FINANCE'::app_role)
  OR has_role(auth.uid(), 'ACHATS'::app_role)
);

-- Trigger updated_at
CREATE TRIGGER update_supplier_invoices_updated_at
BEFORE UPDATE ON public.supplier_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-génération référence
CREATE OR REPLACE FUNCTION public.generate_supplier_invoice_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := 'FF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.supplier_invoice_ref_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_supplier_invoice_reference
BEFORE INSERT ON public.supplier_invoices
FOR EACH ROW EXECUTE FUNCTION public.generate_supplier_invoice_reference();

-- Trigger d'historique automatique sur changement de statut
CREATE OR REPLACE FUNCTION public.log_supplier_invoice_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_nom TEXT := '';
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT COALESCE(p.prenom || ' ' || p.nom, '') INTO v_user_nom
    FROM public.profiles p WHERE p.user_id = COALESCE(auth.uid(), NEW.created_by) LIMIT 1;

    INSERT INTO public.supplier_invoice_history (
      supplier_invoice_id, ancien_statut, nouveau_statut, user_id, user_nom
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      COALESCE(auth.uid(), NEW.created_by),
      v_user_nom
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_supplier_invoice_status
AFTER INSERT OR UPDATE ON public.supplier_invoices
FOR EACH ROW EXECUTE FUNCTION public.log_supplier_invoice_status_change();

-- Notifications : quand un lot passe en pending_DG, prévenir le DG
CREATE OR REPLACE FUNCTION public.notify_supplier_invoice_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_nom TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT nom INTO v_supplier_nom FROM public.fournisseurs WHERE id = NEW.supplier_id;

    IF NEW.status = 'pending_DG' THEN
      PERFORM public.notify_role(
        'DG',
        'Facture fournisseur à valider',
        'Facture ' || NEW.reference || ' (' || COALESCE(v_supplier_nom, 'Fournisseur') || ') de ' || NEW.amount || ' FCFA en attente d''approbation.',
        'VALIDATION',
        '/factures-fournisseurs?id=' || NEW.id::text
      );
    ELSIF NEW.status = 'approved_for_payment' THEN
      PERFORM public.notify_role(
        'FINANCE',
        'Facture approuvée pour paiement',
        'Facture ' || NEW.reference || ' approuvée. Procédez au paiement.',
        'INFO',
        '/factures-fournisseurs?id=' || NEW.id::text
      );
    ELSIF NEW.status = 'cheque_ready' THEN
      PERFORM public.notify_role(
        'ASSISTANTE',
        'Chèque prêt à remettre',
        'Chèque pour facture ' || NEW.reference || ' prêt. À remettre au fournisseur.',
        'INFO',
        '/factures-fournisseurs?id=' || NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_supplier_invoice_status
AFTER UPDATE ON public.supplier_invoices
FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_invoice_status();

-- Bucket de stockage pour les fichiers PDF
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-invoices', 'supplier-invoices', false);

CREATE POLICY "View supplier invoice files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'supplier-invoices' AND (
    has_role(auth.uid(), 'DG'::app_role)
    OR has_role(auth.uid(), 'ASSISTANTE'::app_role)
    OR has_role(auth.uid(), 'FINANCE'::app_role)
    OR has_role(auth.uid(), 'ACHATS'::app_role)
  )
);

CREATE POLICY "Upload supplier invoice files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'supplier-invoices' AND (
    has_role(auth.uid(), 'DG'::app_role)
    OR has_role(auth.uid(), 'ASSISTANTE'::app_role)
    OR has_role(auth.uid(), 'FINANCE'::app_role)
    OR has_role(auth.uid(), 'ACHATS'::app_role)
  )
);

CREATE POLICY "Update supplier invoice files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'supplier-invoices' AND (
    has_role(auth.uid(), 'DG'::app_role)
    OR has_role(auth.uid(), 'ASSISTANTE'::app_role)
    OR has_role(auth.uid(), 'FINANCE'::app_role)
  )
);

CREATE POLICY "Delete supplier invoice files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'supplier-invoices' AND has_role(auth.uid(), 'DG'::app_role)
);