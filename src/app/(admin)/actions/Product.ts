"use server";

import supabase from "@/lib/supabase-Utils/admin";
import { revalidatePath } from "next/cache";
import {
  deleteImageFromCloudflare,
  uploadImageToCloudflare,
} from "@/app/utils/cloudflare";
import { extractR2KeyFromUrl } from ".";

const PRODUCT_SELECT = `
  *,
  categories(*),
  product_images(*),
  sub_categories(*),
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

async function syncProductCollections(productId: string, collectionIds: string[]) {
  const { error: deleteError } = await supabase
    .from("product_collections")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const uniqueIds = [...new Set(collectionIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { success: true };
  }

  const rows = uniqueIds.map((collection_id) => ({
    product_id: productId,
    collection_id,
  }));

  const { error: insertError } = await supabase
    .from("product_collections")
    .insert(rows);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

export async function uploadProductImages(productId: string, files: File[]) {
  try {
    if (files.length === 0) {
      return { success: false, error: "No files provided" };
    }
    const uploadResult = await uploadImageToCloudflare(files[0]);
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }
    const imageUrl = uploadResult.url;
    const imageKey = uploadResult.key;
    const { data, error } = await supabase
      .from("product_images")
      .insert({ product_id: productId, image_url: imageUrl });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data };
  } catch (error) {
    console.error("Error uploading product images:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload images",
    };
  }
}

export async function saveProductImageUrls(productId: string, imageUrls: string[]) {
  try {
    if (!imageUrls || imageUrls.length === 0) {
      return { success: false, error: "No image URLs provided" };
    }

    const imageRecords = imageUrls.map((url) => ({
      product_id: productId,
      image_url: url,
    }));

    const { data, error } = await supabase
      .from("product_images")
      .insert(imageRecords)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/products");
    revalidatePath(`/${productId}`);
    return { success: true, data: data };
  } catch (error) {
    console.error("Error saving product image URLs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save image URLs",
    };
  }
}

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    // Stable deterministic ordering prevents rows with identical created_at from shifting between pages after updates
    .order("created_at", { ascending: false })
    .order("product_id", { ascending: false });
  if (error) {
    console.log("error", error);
    return { success: false, data: null, message: error.message };
  }

  const normalized = (data ?? []).map((product) =>
    normalizeProductCollections(product as Record<string, unknown>),
  );

  return {
    success: true,
    data: normalized,
    message: "Products fetched successfully",
  };
}

// export async function createProduct(productData: any) {
//   try {
//     console.log("productData", productData);

//     const supabase = await createClient();

//     let imageUrl: string | null = null;
//     let uploadedImageKey: string | null = null;

//     if (productData.thumbnail_image) {
//       const uploadResult = await uploadImageToCloudflare(
//         productData.thumbnail_image,
//         {
//           folder: "products",
//         }
//       );

//       if (!uploadResult.success) {
//         return {
//           success: false,
//           error: uploadResult.error || "Failed to upload image",
//         };
//       }

//       imageUrl = uploadResult.url || null;
//       uploadedImageKey = uploadResult.key || null;
//     }

//     const payload = {
//       product_name: productData.product_name,
//       category_id: productData.category_id,
//       subcategory_id: productData.subcategory_id,
//       description: productData.description,
//       base_price: productData.base_price,
//       discount_percentage: productData.discount_percentage,
//       final_price: productData.final_price,
//       stock_quantity: productData.stock_quantity,
//       weight_grams: productData.weight_grams,
//       metal_type: productData.metal_type,
//       thumbnail_image: imageUrl,
//       size: productData.size || [],
//       tags: productData.tags || [],
//       occasion: productData.occasion || "",
//       collection: productData.collection || "",
//       listed_status:
//         typeof productData.listed_status === "boolean"
//           ? productData.listed_status
//           : true,
//     };
//     const { data, error } = await supabase
//       .from("products")
//       .insert(payload)
//       .select()
//       .single();
//     if (error) {
//       console.error("Error creating product:", error);
//       return {
//         success: false,
//         error: error.message,
//         message: "Failed to create product",
//       };
//     }
//     return { success: true, data: data };
//   } catch (error) {
//     console.error("Error creating product:", error);
//     return {
//       success: false,
//       error:
//         error instanceof Error ? error.message : "Failed to create product",
//     };
//   }
// }



export async function createProduct(productData: any) {
  try {
    const payload = {
      sku: productData.sku,
      product_name: productData.product_name,
      category_id: productData.category_id,
      subcategory_id: productData.subcategory_id,
      description: productData.description,
      base_price: productData.base_price,
      discount_percentage: productData.discount_percentage,
      final_price: productData.final_price,
      stock_quantity: productData.stock_quantity,
      weight_grams: productData.weight_grams,
      thumbnail_image: productData.thumbnail_image, // ✅ URL only
      size: productData.size || [],
      tags: productData.tags || [],
      style_id: productData.style_id || null,
      occasion_id: productData.occasion_id || null,
      listed_status:
        typeof productData.listed_status === "boolean"
          ? productData.listed_status
          : true,
      home_visibility:
        typeof productData.home_visibility === "boolean"
          ? productData.home_visibility
          : true,
    };

    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select(`
        *,
        categories(category_name),
        sub_categories(subcategory_name),
        product_images(image_url)
      `)
      .single();

    if (error) throw error;

    const syncResult = await syncProductCollections(
      data.product_id,
      productData.collection_ids ?? [],
    );
    if (!syncResult.success) {
      return { success: false, error: syncResult.error ?? "Failed to link collections" };
    }

    // Ensure admin products list reflects the new row in production (RSC cache)
    revalidatePath("/products");
    revalidatePath("/collection");
    revalidatePath("/");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return {
      success: false,
      error: error.message || "Failed to create product",
    };
  }
}







export async function updateProduct(productId: string, productData: any) {
  try {
    console.log("productData", productData);
    const { data, error } = await supabase
      .from("products")
      .select("*,categories(*),sub_categories(*)")
      .eq("product_id", productId)
      .single();
    if (error) {
      console.error("Error fetching product:", error);
    }
    if (data) {
      console.log("product data fetched to see difference", data);
    }
    if (productData.thumbnail_image instanceof File) {
      console.log("thumbnail image is a file");
      const existingThumnailimage = data?.thumbnail_image;
      if (existingThumnailimage) {
        const r2Key = extractR2KeyFromUrl(existingThumnailimage);
        if (r2Key) {
          await deleteImageFromCloudflare(r2Key);
        }
      }
      const uploadResult = await uploadImageToCloudflare(
        productData.thumbnail_image
      );
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }
      productData.thumbnail_image = uploadResult.url;
    }
    const payload = {
      sku: productData.sku,
      product_name: productData.product_name,
      category_id: productData.category_id,
      subcategory_id: productData.subcategory_id,
      description: productData.description,
      base_price: productData.base_price,
      discount_percentage: productData.discount_percentage,
      final_price: productData.final_price,
      stock_quantity: productData.stock_quantity,
      weight_grams: productData.weight_grams,
      metal_type: productData.metal_type,
      thumbnail_image: productData.thumbnail_image,
      size: productData.size || [],
      tags: productData.tags || [],
      style_id: productData.style_id || null,
      occasion_id: productData.occasion_id || null,
      listed_status:
        typeof productData.listed_status === "boolean"
          ? productData.listed_status
          : true,
      home_visibility:
        typeof productData.home_visibility === "boolean"
          ? productData.home_visibility
          : true,
    };
    const { data: updatedData, error: updateError } = await supabase
      .from("products")
      .update(payload)
      .eq("product_id", productId)
      .select()
      .single();
    if (updateError) {
      console.error("Error updating product:", updateError);
      return { success: false, error: updateError.message };
    }

    const syncResult = await syncProductCollections(
      productId,
      productData.collection_ids ?? [],
    );
    if (!syncResult.success) {
      return { success: false, error: syncResult.error ?? "Failed to link collections" };
    }

    // Invalidate cached admin pages so router.refresh() picks up latest data in production.
    revalidatePath("/products");
    revalidatePath("/collection");
    revalidatePath(`/${productId}`);
    revalidatePath("/");
    return { success: true, data: updatedData };
  } catch (error) {
    console.error("Error updating product:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update product",
    };
  }
}

export async function deleteProductImage(imageId: string) {
  try {
    // First, get the image record to retrieve the URL
    const { data: imageData, error: fetchError } = await supabase
      .from("product_images")
      .select("*")
      .eq("image_id", imageId)
      .single();
    
    if (fetchError) {
      console.error("Error fetching image:", fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (imageData && imageData.image_url) {
      // Extract R2 key and delete from Cloudflare
      const r2Key = extractR2KeyFromUrl(imageData.image_url);
      if (r2Key) {
        await deleteImageFromCloudflare(r2Key);
      }
    }
    
    // Delete the image record from database
    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("image_id", imageId);
    
    if (deleteError) {
      console.error("Error deleting image from database:", deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/products");
    return { success: true, message: "Image deleted successfully" };
  } catch (error) {
    console.error("Error deleting product image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete image",
    };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const {data:productData,error:productError} = await supabase
      .from("products")
      .select("*")
      .eq("product_id", productId)
      .single();
    if (productError) {
      console.error("Error fetching product:", productError);
    }
    if (productData) {
      const existingThumnailimage = productData.thumbnail_image;
      if (existingThumnailimage) {
        const r2Key = extractR2KeyFromUrl(existingThumnailimage);
        if (r2Key) {
          await deleteImageFromCloudflare(r2Key);
        }
      }
    }
    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("product_id", productId);
    if (error) {
      console.error("Error deleting product:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/products");
    return { success: true, data: data };
  } catch (error) {
    console.error("Error deleting product:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete product",
    };
  }
}
