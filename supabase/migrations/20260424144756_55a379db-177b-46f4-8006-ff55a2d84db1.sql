-- Table de consolidation (1 par opération)
CREATE TABLE IF NOT EXISTS public.consolidations_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL UNIQUE REFERENCES public.operations(id) ON DELETE CASCADE,
  total_recettes numeric NOT NULL DEFAULT 0,
  total_depenses_terrain numeric NOT NULL DEFAULT 0,
  total_depenses_consolidation numeric NOT NULL DEFAULT 0,
  marge numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  terminee boolean NOT NULL DEFAULT false,
  date_cloture timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consolidations_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View consolidations_operations"
  ON public.consolidations_operations FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "DG ADMIN_VENTES manage consolidations_operations"
  ON public.consolidations_operations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN_VENTES'::app_role))
  WITH CHECK (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN_VENTES'::app_role));

CREATE TRIGGER update_consolidations_operations_updated_at
  BEFORE UPDATE ON public.consolidations_operations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table des dépenses de consolidation
CREATE TABLE IF NOT EXISTS public.depenses_consolidation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  consolidation_id uuid REFERENCES public.consolidations_operations(id) ON DELETE SET NULL,
  libelle text NOT NULL DEFAULT '',
  categorie public.categorie_depense NOT NULL DEFAULT 'AUTRE',
  montant numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  statut_validation text NOT NULL DEFAULT 'EN_ATTENTE',
  decaissement_id uuid,
  commentaire text DEFAULT '',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.depenses_consolidation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View depenses_consolidation"
  ON public.depenses_consolidation FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "DG ADMIN_VENTES manage depenses_consolidation"
  ON public.depenses_consolidation FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN_VENTES'::app_role))
  WITH CHECK (has_role(auth.uid(), 'DG'::app_role) OR has_role(auth.uid(), 'ADMIN_VENTES'::app_role));

CREATE POLICY "FINANCE update depenses_consolidation"
  ON public.depenses_consolidation FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'FINANCE'::app_role));

CREATE TRIGGER update_depenses_consolidation_updated_at
  BEFORE UPDATE ON public.depenses_consolidation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger : crée automatiquement un décaissement EN_ATTENTE pour validation DG
CREATE OR REPLACE FUNCTION public.on_depense_consolidation_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dec_id uuid;
  v_op_ref text;
BEGIN
  SELECT reference INTO v_op_ref FROM public.operations WHERE id = NEW.operation_id;

  INSERT INTO public.decaissements (montant, motif, statut, operation_id, created_by)
  VALUES (
    NEW.montant,
    'Dépense consolidation - ' || COALESCE(v_op_ref, '') || ' - ' || NEW.libelle,
    'EN_ATTENTE',
    NEW.operation_id,
    NEW.created_by
  )
  RETURNING id INTO v_dec_id;

  NEW.decaissement_id := v_dec_id;

  PERFORM public.notify_role(
    'DG',
    'Dépense de consolidation à valider',
    'Nouvelle dépense de ' || NEW.montant || ' FCFA sur opération ' || COALESCE(v_op_ref, '') || ' à valider.',
    'VALIDATION',
    '/finance'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_depense_consolidation_create_decaissement
  BEFORE INSERT ON public.depenses_consolidation
  FOR EACH ROW EXECUTE FUNCTION public.on_depense_consolidation_created();

-- Trigger : sync statut_validation quand le décaissement change
CREATE OR REPLACE FUNCTION public.sync_depense_consolidation_statut()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    UPDATE public.depenses_consolidation
    SET statut_validation = NEW.statut::text
    WHERE decaissement_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_depense_consolidation
  AFTER UPDATE ON public.decaissements
  FOR EACH ROW EXECUTE FUNCTION public.sync_depense_consolidation_statut();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.consolidations_operations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.depenses_consolidation;