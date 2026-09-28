DROP FUNCTION IF EXISTS product_Search_vector_func(text, integer);

CREATE OR REPLACE FUNCTION product_Search_vector_func(
    q text,
    result_limit integer default 10
)
RETURNS TABLE(
    product_id uuid,
    product_name text,
    thumbnail_image text,
    base_price numeric,
    discount_percentage numeric,
    final_price numeric
)
LANGUAGE sql
AS $$
SELECT
    p.product_id,
    p.product_name,
    p.thumbnail_image,
    p.base_price,
    p.discount_percentage,
    p.final_price
FROM products p
WHERE p.listed_status = true
AND p.search_vector @@ 
plainto_tsquery('english', q)
ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', q)) DESC
LIMIT result_limit;
$$;
