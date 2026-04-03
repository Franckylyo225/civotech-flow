
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titre text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'INFO',
  lue boolean NOT NULL DEFAULT false,
  lien text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_lue ON public.notifications(user_id, lue);

-- Helper function to notify all DG users
CREATE OR REPLACE FUNCTION public.notify_role(
  _role app_role,
  _titre text,
  _message text,
  _type text DEFAULT 'INFO',
  _lien text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, titre, message, type, lien)
  SELECT ur.user_id, _titre, _message, _type, _lien
  FROM public.user_roles ur WHERE ur.role = _role;
END;
$$;

-- Trigger: new devis created -> notify DG
CREATE OR REPLACE FUNCTION public.on_devis_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_role('DG', 'Nouveau devis créé',
    'Le devis ' || NEW.reference || ' a été créé.',
    'INFO', '/devis/' || NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_devis_created
  AFTER INSERT ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.on_devis_created();

-- Trigger: devis submitted to DG -> notify DG
CREATE OR REPLACE FUNCTION public.on_devis_soumis_dg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.statut = 'SOUMIS_DG' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    PERFORM public.notify_role('DG', 'Devis en attente de validation',
      'Le devis ' || NEW.reference || ' attend votre validation.',
      'VALIDATION', '/devis/' || NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_devis_soumis_dg
  AFTER UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.on_devis_soumis_dg();

-- Trigger: maintenance created -> notify DG + LOGISTIQUE
CREATE OR REPLACE FUNCTION public.on_maintenance_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  camion_immat text;
BEGIN
  SELECT immatriculation INTO camion_immat FROM public.camions WHERE id = NEW.camion_id;
  PERFORM public.notify_role('DG', 'Maintenance planifiée',
    'Maintenance ' || NEW.type || ' planifiée pour ' || COALESCE(camion_immat, 'un véhicule') || '.',
    'ALERTE', '/parc-auto');
  PERFORM public.notify_role('LOGISTIQUE', 'Maintenance planifiée',
    'Maintenance ' || NEW.type || ' planifiée pour ' || COALESCE(camion_immat, 'un véhicule') || '.',
    'ALERTE', '/parc-auto');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_maintenance_created
  AFTER INSERT ON public.maintenances
  FOR EACH ROW EXECUTE FUNCTION public.on_maintenance_created();

-- Trigger: demande achat soumise DG -> notify DG
CREATE OR REPLACE FUNCTION public.on_demande_achat_soumise_dg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.statut = 'SOUMISE_DG' AND OLD.statut IS DISTINCT FROM NEW.statut THEN
    PERFORM public.notify_role('DG', 'Demande d''achat en attente',
      'La demande ' || NEW.reference || ' (' || NEW.designation || ') attend votre validation.',
      'VALIDATION', '/achats');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_demande_achat_soumise_dg
  AFTER UPDATE ON public.demandes_achat
  FOR EACH ROW EXECUTE FUNCTION public.on_demande_achat_soumise_dg();

-- Trigger: decaissement en attente -> notify DG
CREATE OR REPLACE FUNCTION public.on_decaissement_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.statut = 'EN_ATTENTE' THEN
    PERFORM public.notify_role('DG', 'Décaissement en attente',
      'Décaissement ' || NEW.reference || ' de ' || NEW.montant || ' FCFA en attente d''approbation.',
      'VALIDATION', '/finance');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_decaissement_created
  AFTER INSERT ON public.decaissements
  FOR EACH ROW EXECUTE FUNCTION public.on_decaissement_created();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
