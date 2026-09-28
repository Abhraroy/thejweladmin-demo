"use server";
import supabase from "@/lib/supabase-Utils/admin";

export async function getCategories() {
    const { data: categoriesData, error } = await supabase.from('categories').select('*, sub_categories(*)').order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching categories:', error);
        return { success: false, data: null, message: error.message };
    }
    return { success: true, data: categoriesData, message: "Categories fetched successfully" };
}