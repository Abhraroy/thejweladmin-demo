import supabase from "@/lib/supabase-Utils/admin";

export async function getReviews() {
    const { data: reviewsData, error } = await supabase
    .from("reviews")
    .select(
      `
      *,
      products(*),
      users(*),
      review_images(*)
    `
    )
    .order("created_at", { ascending: false })
    .limit(500);
    if (error) {
        console.error("Error fetching reviews:", error);
        return { success: false, data: null, message: error.message };
    }
    return { success: true, data: reviewsData, message: "Reviews fetched successfully" };
}