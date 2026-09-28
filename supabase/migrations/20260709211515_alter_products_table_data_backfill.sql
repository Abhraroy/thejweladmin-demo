-- ==========================================
-- Backfill Foreign Keys
-- ==========================================

UPDATE public.products p
SET style_id = s.style_id
FROM public.styles s
WHERE p.style = s.slug;

UPDATE public.products p
SET occasion_id = o.occasion_id
FROM public.occasions o
WHERE p.occasion = o.slug;

-- ==========================================
-- Verify Migration Success
-- ==========================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.products
        WHERE style_id IS NULL
           OR occasion_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration aborted: Some products could not be mapped to style_id or occasion_id.';
    END IF;
END $$;

-- ==========================================
-- Make Foreign Keys Required
-- ==========================================

ALTER TABLE public.products
ALTER COLUMN style_id SET NOT NULL;

ALTER TABLE public.products
ALTER COLUMN occasion_id SET NOT NULL;

-- ==========================================
-- Drop Old Text Columns
-- ==========================================

ALTER TABLE public.products
DROP COLUMN style,
DROP COLUMN occasion;