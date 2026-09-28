drop function if exists get_recommended_products;
create or replace function get_recommended_products(
    current_product_id uuid,
    result_limit int default 8
)
returns table(
    product_id uuid,
    product_name text,
    thumbnail_image text,
    base_price numeric,
    final_price numeric,
    discount_percentage numeric,
    recommendation_score int
)
language sql
as $$
with current_product as (
    select
        p.product_id,
        p.category_id,
        p.base_price,
        p.final_price
    from products p
    where p.product_id = current_product_id
),

same_collection as (
    select
        p.product_id,
        p.product_name,
        p.thumbnail_image,
        p.base_price,
        p.final_price,
        p.discount_percentage,
        100 as recommendation_score,
        abs(p.final_price - cp.final_price) as price_distance
    from product_collections pc1
    join product_collections pc2
        on pc1.collection_id = pc2.collection_id
    join products p
        on p.product_id = pc2.product_id
    cross join current_product cp
    where pc1.product_id = current_product_id
        and pc2.product_id <> current_product_id
        and p.listed_status = true
),

same_category as (
    select
        p.product_id,
        p.product_name,
        p.thumbnail_image,
        p.base_price,
        p.final_price,
        p.discount_percentage,
        50 as recommendation_score,
        abs(p.final_price - cp.final_price) as price_distance
    from products p
    cross join current_product cp
    where p.category_id = cp.category_id
        and p.product_id <> current_product_id
        and p.listed_status = true
),

similar_price as (
    select
        p.product_id,
        p.product_name,
        p.thumbnail_image,
        p.base_price,
        p.final_price,
        p.discount_percentage,
        25 as recommendation_score,
        abs(p.final_price - cp.final_price) as price_distance
    from products p
    cross join current_product cp
    where p.product_id <> current_product_id
        and p.listed_status = true
        and p.final_price between cp.final_price * 0.8
                              and cp.final_price * 1.2
),

all_recommendations as (
    select * from same_collection
    union all
    select * from same_category
    union all
    select * from similar_price
),

ranked as (
    select *,
           row_number() over (
               partition by product_id
               order by
                   recommendation_score desc,
                   price_distance asc
           ) as rn
    from all_recommendations
)

select
    product_id,
    product_name,
    thumbnail_image,
    base_price,
    final_price,
    discount_percentage,
    recommendation_score
from ranked
where rn = 1
order by
    recommendation_score desc,
    price_distance asc
limit result_limit;
$$;