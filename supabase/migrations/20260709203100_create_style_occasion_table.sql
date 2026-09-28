-- ==========================================
-- Styles Table
-- ==========================================
CREATE TABLE public.styles (
    style_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    style_name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE,
    image_link TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_styles_active
ON public.styles(is_active);

CREATE INDEX idx_styles_slug
ON public.styles(slug);


-- ==========================================
-- Occasions Table
-- ==========================================
CREATE TABLE public.occasions (
    occasion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occasion_name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE,
    image_link TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_occasions_active
ON public.occasions(is_active);

CREATE INDEX idx_occasions_slug
ON public.occasions(slug);


-- ==========================================
-- Row Level Security
-- ==========================================
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occasions ENABLE ROW LEVEL SECURITY;

-- Public can view only active styles
CREATE POLICY "Enable read access for active styles"
ON public.styles
FOR SELECT
USING (is_active = TRUE);

-- Public can view only active occasions
CREATE POLICY "Enable read access for active occasions"
ON public.occasions
FOR SELECT
USING (is_active = TRUE);