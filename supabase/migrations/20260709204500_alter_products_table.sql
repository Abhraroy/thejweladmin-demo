-- ==========================================
-- Add Foreign Key Columns
-- ==========================================

ALTER TABLE public.products
ADD COLUMN style_id UUID,
ADD COLUMN occasion_id UUID;

-- ==========================================
-- Backfill Existing Product Data
-- ==========================================

UPDATE public.products p
SET style_id = s.style_id
FROM public.styles s
WHERE p.style = s.style_name;

UPDATE public.products p
SET occasion_id = o.occasion_id
FROM public.occasions o
WHERE p.occasion = o.occasion_name;

-- ==========================================
-- Add Foreign Key Constraints
-- ==========================================

ALTER TABLE public.products
ADD CONSTRAINT products_style_id_fkey
FOREIGN KEY (style_id)
REFERENCES public.styles(style_id);

ALTER TABLE public.products
ADD CONSTRAINT products_occasion_id_fkey
FOREIGN KEY (occasion_id)
REFERENCES public.occasions(occasion_id);

-- ==========================================
-- Index Foreign Keys
-- ==========================================

CREATE INDEX idx_products_style_id
ON public.products(style_id);

CREATE INDEX idx_products_occasion_id
ON public.products(occasion_id);
