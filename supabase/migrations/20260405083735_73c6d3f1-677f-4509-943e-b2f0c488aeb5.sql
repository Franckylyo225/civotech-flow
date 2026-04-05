
-- Trigger: when a new annonce is inserted, create a notification for every user (except the author)
CREATE OR REPLACE FUNCTION public.notify_new_annonce()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _auteur_nom text;
BEGIN
  -- Get author name
  SELECT COALESCE(prenom || ' ' || nom, 'Utilisateur') INTO _auteur_nom
  FROM public.profiles WHERE user_id = NEW.auteur_id LIMIT 1;

  -- Insert a notification for each user except the author
  FOR _user_id IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.user_id != NEW.auteur_id
  LOOP
    INSERT INTO public.notifications (user_id, titre, message, type, lien)
    VALUES (
      _user_id,
      'Nouvelle annonce',
      COALESCE(_auteur_nom, 'Quelqu''un') || ' a publié : ' || NEW.titre,
      'INFO',
      '/annonces'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_annonce
AFTER INSERT ON public.annonces
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_annonce();
