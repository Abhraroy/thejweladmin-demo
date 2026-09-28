CREATE TYPE promo_location AS ENUM (
    'promotion_banner',
    'share_link'
);


CREATE TABLE promo_content (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    place_to_be_displayed promo_location NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE promo_content ENABLE ROW LEVEL SECURITY;