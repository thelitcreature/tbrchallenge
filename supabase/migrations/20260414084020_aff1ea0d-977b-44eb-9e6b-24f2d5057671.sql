ALTER TABLE public.tbr_books ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'tbr';

-- Migrate existing data: is_read=true -> 'read', is_read=false -> 'tbr'
UPDATE public.tbr_books SET status = 'read' WHERE is_read = true;
UPDATE public.tbr_books SET status = 'tbr' WHERE is_read = false;