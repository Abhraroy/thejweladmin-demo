/**
 * Types generated from `src/schema/schema.md`.
 * These mirror database table column names (snake_case) for easier mapping.
 */

export type UUID = string;
export type ISODateString = string;

// ---------- ENUM-LIKE CONSTRAINTS ----------

export type AddressType = "billing" | "shipping";
export type CouponDiscountType = "percentage" | "fixed";
export type CouponType = "COD" | "PREPAID";
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

// ---------- TABLE TYPES ----------

export interface Address {
  address_id: UUID;
  user_id: UUID;
  address_type?: AddressType | null;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean | null;
  created_at?: ISODateString | null;
  address_line1?: string | null;
  address_line2?: string | null;
  house_no?: string | null;
  landmark?: string | null;
}

export interface AdminKey {
  id: UUID;
  key?: string | null;
  admin?: UUID | null;
  created_at?: ISODateString | null;
}

export interface Cart {
  cart_id: UUID;
  user_id?: UUID | null;
  created_at?: ISODateString | null;
  updated_at?: ISODateString | null;
}

export interface CartItem {
  cart_item_id: UUID;
  cart_id: UUID;
  product_id: UUID;
  quantity: number;
  added_at?: ISODateString | null;
  size?: string | null;
}

export interface Category {
  category_id: UUID;
  category_name: string;
  slug: string;
  description?: string | null;
  category_image_url?: string | null;
  is_active?: boolean | null;
  created_at?: ISODateString | null;
}

export interface Coupon {
  coupon_id: UUID;
  coupon_code: string;
  coupon_type?: CouponType | null;
  description?: string | null;
  discount_type?: CouponDiscountType | null;
  discount_value: number;
  min_purchase_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  usage_count?: number | null;
  valid_from: ISODateString;
  valid_until: ISODateString;
  is_active?: boolean | null;
}

export interface ImageResource {
  id: number;
  created_at: ISODateString;
  image_link?: string | null;
  section_name?: string | null;
  redirect_route?: string | null;
}

export interface Order {
  order_id: UUID;
  user_id?: UUID | null;
  order_number?: string | null;
  order_status?: string | null;
  payment_status: string | null;
  tax_amount?: number | null;
  total_amount: number;
  shipping_address_id?: UUID | null;
  order_date?: ISODateString | null;
  shipped_date?: ISODateString | null;
  delivered_date?: ISODateString | null;
  transaction_id?: string | null;
  address_text?: string | null;
  coupon_code?: string | null;
}

export interface OrderItem {
  order_item_id: UUID;
  order_id: UUID;
  product_id?: UUID | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  ordered_at?: ISODateString | null;
}

export interface Payment {
  payment_id: UUID;
  order_id: UUID;
  payment_method: string;
  transaction_id?: string | null;
  amount: number;
  payment_status?: string | null;
  payment_date?: ISODateString | null;
}

export interface ProductImage {
  image_id: UUID;
  product_id: UUID;
  image_url: string;
}

export interface Product {
  product_id: UUID;
  category_id?: UUID | null;
  product_name?: string | null;
  description?: string | null;
  base_price?: number | null;
  discount_percentage?: number | null;
  final_price?: number | null;
  stock_quantity?: number | null;
  weight_grams?: number | null;
  created_at?: ISODateString | null;
  updated_at?: ISODateString | null;
  subcategory_id?: UUID | null;
  thumbnail_image?: string | null;
  size?: string[] | null;
  tags?: string[] | null;
  occasion?: string | null;
  occasion_id?: UUID | null;
  style?: string | null;
  style_id?: UUID | null;
  collection?: string | null;
  listed_status?: boolean | null;
  home_visibility?: boolean | null;
  sku?: string | null;
}

export interface ReviewImage {
  review_image_id: UUID;
  created_at: ISODateString;
  review_id: UUID;
  review_image_url?: string | null;
}

export interface Review {
  review_id: UUID;
  product_id: UUID;
  user_id: UUID;
  rating: ReviewRating;
  title?: string | null;
  review_text?: string | null;
  created_at?: ISODateString | null;
}

export interface SubCategory {
  subcategory_id: UUID;
  category_id?: UUID | null;
  subcategory_name?: string | null;
  subcategory_image_url?: string | null;
  is_active?: boolean | null;
}

export interface User {
  user_id: UUID;
  email?: string | null;
  password_hash?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  is_active?: boolean | null;
  created_at?: ISODateString | null;
  updated_at?: ISODateString | null;
}

export interface Wishlist {
  wishlist_id: UUID;
  user_id: UUID;
}

export interface WishlistItem {
  wishlist_item_id: UUID;
  created_at: ISODateString;
  wishlist_id?: UUID | null;
  product_id?: UUID | null;
}

export type PromoLocation = "promotion_banner" | "share_link";

export interface PromoContent {
  id: number;
  content: string;
  place_to_be_displayed: PromoLocation;
  created_at?: ISODateString | null;
  updated_at?: ISODateString | null;
}

