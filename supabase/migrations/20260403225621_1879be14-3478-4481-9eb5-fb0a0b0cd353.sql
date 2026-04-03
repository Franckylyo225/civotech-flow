
-- Drop et recréer les triggers notification pour éviter les conflits
DROP TRIGGER IF EXISTS trg_notify_devis_created ON public.devis;
CREATE TRIGGER trg_notify_devis_created
AFTER INSERT ON public.devis
FOR EACH ROW EXECUTE FUNCTION public.on_devis_created();

DROP TRIGGER IF EXISTS trg_notify_devis_soumis_dg ON public.devis;
CREATE TRIGGER trg_notify_devis_soumis_dg
AFTER UPDATE ON public.devis
FOR EACH ROW EXECUTE FUNCTION public.on_devis_soumis_dg();

DROP TRIGGER IF EXISTS trg_notify_maintenance_created ON public.maintenances;
CREATE TRIGGER trg_notify_maintenance_created
AFTER INSERT ON public.maintenances
FOR EACH ROW EXECUTE FUNCTION public.on_maintenance_created();

DROP TRIGGER IF EXISTS trg_notify_demande_achat_soumise_dg ON public.demandes_achat;
CREATE TRIGGER trg_notify_demande_achat_soumise_dg
AFTER UPDATE ON public.demandes_achat
FOR EACH ROW EXECUTE FUNCTION public.on_demande_achat_soumise_dg();

DROP TRIGGER IF EXISTS trg_notify_decaissement_created ON public.decaissements;
CREATE TRIGGER trg_notify_decaissement_created
AFTER INSERT ON public.decaissements
FOR EACH ROW EXECUTE FUNCTION public.on_decaissement_created();
