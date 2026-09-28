ALTER TABLE products ADD COLUMN search_vector tsvector;

UPDATE products
SET search_vector = 
setweight(
        to_tsvector(
            'english',
            coalesce(product_name, '')
        ),
        'A'
    ) ||
setweight(
        to_tsvector(
            'english',
            coalesce(description, '')
        ),
        'B'
    ) ||
setweight(
        to_tsvector(
            'english',
            coalesce(array_to_string(tags, ' '), '')
        ),
        'C'
    );

CREATE INDEX product_search_vector_idx ON products USING GIN (search_vector);





CREATE OR REPLACE FUNCTION products_search_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

NEW.search_vector :=
    setweight(
        to_tsvector(
            'english',
            coalesce(NEW.product_name, '')
        ),
        'A'
    )
    ||
    setweight(
        to_tsvector(
            'english',
            coalesce(NEW.description, '')
        ),
        'B'
    )
    ||
    setweight(
        to_tsvector(
            'english',
            coalesce(NEW.tags, '')
        ),
        'C'
    );

RETURN NEW;

END;
$$;




CREATE TRIGGER products_search_update
BEFORE INSERT OR UPDATE
ON products
FOR EACH ROW
EXECUTE FUNCTION products_search_trigger();






CREATE OR REPLACE FUNCTION product_Search_vector_func(
    q text,
    result_limit integer default 10
)
RETURNS TABLE(
    product_id uuid,
    product_name text,
    thumbnail_image text,
)
LANGUAGE sql
AS $$
SELECT
    p.product_id,
    p.product_name,
    p.thumbnail_image
FROM products p
WHERE p.listed_status = true
AND p.search_vector @@ 
plainto_tsquery('english', q)
ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', q)) DESC
LIMIT result_limit;
$$;






