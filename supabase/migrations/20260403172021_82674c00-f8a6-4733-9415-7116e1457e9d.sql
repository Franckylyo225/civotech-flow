ALTER TABLE public.operations
ADD COLUMN nature_marchandise text DEFAULT '',
ADD COLUMN precautions text DEFAULT '',
ADD COLUMN commentaires text DEFAULT '';