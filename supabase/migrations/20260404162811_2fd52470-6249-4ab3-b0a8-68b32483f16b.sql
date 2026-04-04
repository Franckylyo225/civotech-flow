
-- Add depense_id FK to decaissements to link a decaissement to its source depense
ALTER TABLE public.decaissements
ADD COLUMN depense_id uuid REFERENCES public.depenses(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_decaissements_depense_id ON public.decaissements(depense_id);
