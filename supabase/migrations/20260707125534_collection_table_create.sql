-- ==========================================
-- Collections Table
-- ==========================================

CREATE TABLE public.collections (
    collection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- Product Collections Junction Table
-- ==========================================

CREATE TABLE public.product_collections (
    product_id UUID NOT NULL
        REFERENCES public.products(product_id)
        ON DELETE CASCADE,

    collection_id UUID NOT NULL
        REFERENCES public.collections(collection_id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (product_id, collection_id)
);

-- ==========================================
-- Indexes
-- ==========================================

CREATE INDEX idx_product_collections_product_id
ON public.product_collections(product_id);

CREATE INDEX idx_product_collections_collection_id
ON public.product_collections(collection_id);

CREATE INDEX idx_collections_slug
ON public.collections(slug);

-- ==========================================
-- Enable RLS
-- ==========================================

ALTER TABLE public.collections
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_collections
ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Public Read Access
-- ==========================================

CREATE POLICY "Anyone can read collections"
ON public.collections
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can read product collections"
ON public.product_collections
FOR SELECT
TO public
USING (true);

-- ==========================================
-- No INSERT / UPDATE / DELETE Policies
-- ==========================================
-- Since no write policies are created,
-- anon/authenticated users cannot modify data.
-- Only service_role bypasses RLS.