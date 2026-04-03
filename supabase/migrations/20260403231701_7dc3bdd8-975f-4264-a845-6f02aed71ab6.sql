
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.evenements_calendrier ADD COLUMN IF NOT EXISTS rappel_envoye boolean NOT NULL DEFAULT false;
