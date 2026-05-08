ALTER TABLE public.demandes_achat
  ADD COLUMN IF NOT EXISTS fournisseur_id uuid REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS montant_reel numeric;

CREATE INDEX IF NOT EXISTS idx_demandes_achat_fournisseur_id ON public.demandes_achat(fournisseur_id);