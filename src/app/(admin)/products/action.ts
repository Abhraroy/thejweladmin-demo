"use server";
import supabase from "@/lib/supabase-Utils/admin";

const PRODUCT_SELECT = `
  *,
  categories(*),
  sub_categories(*),
  product_images(*),
  product_collections (
    collection_id,
    collections (collection_id, collection_name, slug, is_active)
  )
`;

function normalizeProductCollections(product: Record<string, unknown>) {
  const productCollections = product.product_collections;
  if (!Array.isArray(productCollections)) {
    return product;
  }

  return {
    ...product,
    product_collections: productCollections.map(
      (pc: {
        collection_id: string;
        collections:
          | { collection_id: string; collection_name: string; slug: string | null; is_active: boolean }
          | { collection_id: string; collection_name: string; slug: string | null; is_active: boolean }[]
          | null;
      }) => ({
        collection_id: pc.collection_id,
        collections: Array.isArray(pc.collections) ? pc.collections[0] ?? null : pc.collections,
      }),
    ),
  };
}

export async function getProducts() {
    const { data: productsData, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        // Use a stable deterministic order so items don't "jump pages" when many rows share the same created_at
        // .order('created_at', { ascending: false })
        .order('sku', { ascending: true });

    if (error) {
        console.error('Error fetching products:', error);
        return { success: false, data: null, message: error.message };
    }

    const normalized = (productsData ?? []).map((product) =>
      normalizeProductCollections(product as Record<string, unknown>),
    );

    return { success: true, data: normalized, message: "Products fetched successfully" };
}
