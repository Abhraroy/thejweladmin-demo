"use server";
import supabase from "@/lib/supabase-Utils/admin";


export async function getDashboardData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const [productsRes, ordersRes, reviewsRes, recentOrdersRes, orderItemsRes] = await Promise.all([
        supabase
            .from("products")
            .select("product_id", { count: "exact", head: true }),
        supabase
            .from("orders")
            .select("order_id, total_amount", { count: "exact" }),
        supabase
            .from("reviews")
            .select("review_id", { count: "exact", head: true }),
        supabase
            .from("orders")
            .select("order_date, total_amount")
            .gte("order_date", sevenDaysAgo.toISOString())
            .order("order_date", { ascending: true }),
        supabase
            .from("order_items")
            .select("quantity, products(category_id, categories(category_name))"),
    ]);

    return {
        productsRes,
        ordersRes,
        reviewsRes,
        recentOrdersRes,
        orderItemsRes,
    };
}