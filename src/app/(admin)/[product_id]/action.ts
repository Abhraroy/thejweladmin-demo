"use server";
import supabase from "@/lib/supabase-Utils/admin";


export async function getProductDetails(productId: string) {
    const { data: productData, error } = await supabase
        .from("products")
        .select(`
        *,
        product_images!product_images_product_id_fkey(*),
        reviews(*),
        categories(*)
      `)
        .eq("product_id", productId)
        .single();
    if (error) {
        console.error("Error fetching product:", error);
        return { success: false, data: null, message: error.message };
    }
    return { success: true, data: productData, message: "Product fetched successfully" };
}

export async function getReviewsForProduct(productId: string): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select(`
        *,
        review_images(*),
        users(*)
        `)
        .eq("product_id", productId);
    if (error) {
        console.error("Error fetching reviews:", error);
        return { success: false, data: [], message: error.message };
    }
    return { success: true, data: reviewsData, message: "Reviews fetched successfully" };
}