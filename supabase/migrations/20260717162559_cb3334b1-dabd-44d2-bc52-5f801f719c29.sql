ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS contact_nom TEXT,
  ADD COLUMN IF NOT EXISTS contact_telephone TEXT;