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
            coalesce(array_to_string(NEW.tags, ' '), '')
        ),
        'C'
    );

RETURN NEW;

END;
$$;