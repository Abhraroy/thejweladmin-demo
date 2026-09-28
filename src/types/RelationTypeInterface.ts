import { Address, Category, Order, OrderItem, Product, User, ProductImage, SubCategory, Wishlist, WishlistItem } from "./TypeInterface";

export interface orderItemsWithProducts extends OrderItem {
  products: Product | null;
}

export interface orderWithItemsAndProducts extends Order {
  order_items: orderItemsWithProducts | null;
  shipping_address: Address | null | undefined;
}

export interface userWithOrdersAndItemsAndProducts extends User {
  orders: orderWithItemsAndProducts[];
}

export interface productWithImages extends Product {
  product_images: ProductImage[];
  categories?: Category | null;
}

export interface productWithCategoriesAndSubCategories extends productWithImages {
  categories?: Category | null;
  sub_categories?: SubCategory | null;
}

export interface categoryWithSubCategories extends Category {
  sub_categories?: SubCategory[] | null;
}


export interface wishlistItemWithProduct extends WishlistItem {
  products: Product | null;
}

export interface wishlistWithItemsAndProducts extends Wishlist {
  wishlist_items: wishlistItemWithProduct[];
}