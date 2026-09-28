"use server";
import { unstable_noStore } from "next/cache";
import supabase from "@/lib/supabase-Utils/admin";

export async function getOrders() {
  unstable_noStore();
  const { data: ordersData, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      users(*),
      shipping:addresses!orders_shipping_address_id_fkey(*),
      order_items(*, products(*))
    `
    )
    .order("order_date", { ascending: false })
    .order("order_id", { ascending: false })
    .limit(300);

  console.log("[getOrders] Supabase response:", {
    error: error?.message ?? null,
    dataLength: ordersData?.length ?? 0,
    firstOrder: ordersData?.[0]
      ? { id: ordersData[0].order_id, order_number: ordersData[0].order_number }
      : null,
  });

  if (error) {
    console.error("Error fetching orders:", error);
    return { success: false, data: null, message: error.message };
  }
  return { success: true, data: ordersData, message: "Orders fetched successfully" };
}


