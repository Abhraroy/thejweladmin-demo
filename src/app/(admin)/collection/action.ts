"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-Utils/server";
import adminsupabase from "@/lib/supabase-Utils/admin";

export type CollectionProduct = {
  product_id: string;
  product_name: string | null;
  thumbnail_image: string | null;
  final_price: number | null;
  sku: string | null;
};

export type CollectionWithProducts = {
  collection_id: string;
  collection_name: string;
  slug: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_collections: {
    product_id: string;
    products: CollectionProduct | null;
  }[];
};

export type ProductOption = {
  product_id: string;
  product_name: string | null;
  thumbnail_image: string | null;
  final_price: number | null;
  sku: string | null;
};

export type CollectionSelectOption = {
  collection_id: string;
  collection_name: string;
};

type CollectionPayload = {
  collection_name: string;
  description?: string;
  is_active?: boolean;
  product_ids?: string[];
};

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.user_metadata?.TYPE !== "ADMIN") {
    return { ok: false as const, message: "Unauthorized admin request" };
  }

  return { ok: true as const };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

async function syncCollectionProducts(
  collectionId: string,
  productIds: string[],
) {
  const { error: deleteError } = await adminsupabase
    .from("product_collections")
    .delete()
    .eq("collection_id", collectionId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  if (productIds.length === 0) {
    return { success: true };
  }

  const rows = productIds.map((product_id) => ({
    collection_id: collectionId,
    product_id,
  }));

  const { error: insertError } = await adminsupabase
    .from("product_collections")
    .insert(rows);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

export async function getActiveCollectionsForSelect() {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return {
      success: false,
      error: auth.message,
      data: [] as CollectionSelectOption[],
    };
  }

  const { data, error } = await adminsupabase
    .from("collections")
    .select("collection_id, collection_name")
    .eq("is_active", true)
    .order("collection_name");

  if (error) {
    return {
      success: false,
      error: error.message,
      data: [] as CollectionSelectOption[],
    };
  }

  return { success: true, data: (data ?? []) as CollectionSelectOption[] };
}

export async function getCollections() {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message, data: [] as CollectionWithProducts[] };
  }

  const { data, error } = await adminsupabase
    .from("collections")
    .select(
      `
      collection_id,
      collection_name,
      slug,
      description,
      is_active,
      created_at,
      updated_at,
      product_collections (
        product_id,
        products (
          product_id,
          product_name,
          thumbnail_image,
          final_price,
          sku
        )
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message, data: [] as CollectionWithProducts[] };
  }

  const normalized = (data ?? []).map((row) => ({
    ...row,
    product_collections: (row.product_collections ?? []).map(
      (pc: { product_id: string; products: CollectionProduct | CollectionProduct[] | null }) => ({
        product_id: pc.product_id,
        products: Array.isArray(pc.products) ? pc.products[0] ?? null : pc.products,
      }),
    ),
  })) as CollectionWithProducts[];

  return { success: true, data: normalized };
}

export async function searchProducts(query: string) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message, data: [] as ProductOption[] };
  }

  const trimmed = query.trim();
  let request = adminsupabase
    .from("products")
    .select("product_id, product_name, thumbnail_image, final_price, sku")
    .order("sku", { ascending: true })
    .limit(20);

  if (trimmed) {
    request = request.or(
      `product_name.ilike.%${trimmed}%,sku.ilike.%${trimmed}%`,
    );
  }

  const { data, error } = await request;

  if (error) {
    return { success: false, error: error.message, data: [] as ProductOption[] };
  }

  return { success: true, data: (data ?? []) as ProductOption[] };
}

export async function createCollection(payload: CollectionPayload) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false as const, error: auth.message };
  }

  const collectionName = payload.collection_name.trim();
  if (!collectionName) {
    return { success: false as const, error: "Collection name is required" };
  }

  const slug = slugify(collectionName);
  const productIds = [...new Set(payload.product_ids ?? [])];

  const { data, error } = await adminsupabase
    .from("collections")
    .insert({
      collection_name: collectionName,
      slug: slug || null,
      description: payload.description?.trim() || null,
      is_active: payload.is_active ?? true,
    })
    .select("collection_id")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { success: false as const, error: "A collection with this slug already exists" };
    }
    return { success: false as const, error: error.message };
  }

  if (productIds.length > 0) {
    const syncResult = await syncCollectionProducts(data.collection_id, productIds);
    if (!syncResult.success) {
      return { success: false as const, error: syncResult.error ?? "Failed to link products" };
    }
  }

  revalidatePath("/collection");
  return { success: true as const, data: { collection_id: data.collection_id } };
}

export async function updateCollection(
  collectionId: string,
  payload: CollectionPayload,
) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false as const, error: auth.message };
  }

  if (!collectionId) {
    return { success: false as const, error: "Collection id is required" };
  }

  const collectionName = payload.collection_name.trim();
  if (!collectionName) {
    return { success: false as const, error: "Collection name is required" };
  }

  const slug = slugify(collectionName);
  const productIds = [...new Set(payload.product_ids ?? [])];

  const { error } = await adminsupabase
    .from("collections")
    .update({
      collection_name: collectionName,
      slug: slug || null,
      description: payload.description?.trim() || null,
      is_active: payload.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("collection_id", collectionId);

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { success: false as const, error: "A collection with this slug already exists" };
    }
    return { success: false as const, error: error.message };
  }

  const syncResult = await syncCollectionProducts(collectionId, productIds);
  if (!syncResult.success) {
    return { success: false as const, error: syncResult.error ?? "Failed to link products" };
  }

  revalidatePath("/collection");
  return { success: true as const };
}

export async function deleteCollection(collectionId: string) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false as const, error: auth.message };
  }

  if (!collectionId) {
    return { success: false as const, error: "Collection id is required" };
  }

  const { error } = await adminsupabase
    .from("collections")
    .delete()
    .eq("collection_id", collectionId);

  if (error) {
    return { success: false as const, error: error.message };
  }

  revalidatePath("/collection");
  return { success: true as const };
}
