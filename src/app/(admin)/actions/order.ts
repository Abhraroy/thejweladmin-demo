"use server";

import supabase from "@/lib/supabase-Utils/admin";
import { revalidatePath } from "next/cache";
import { createRapidShypOrderForOrder } from "@/app/utils/rapidShyp";
import { restoreStockForOrderItems } from "@/app/utils/stockAdjustment";



type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";
type PaymentStatus = "pending(cod)" | "pending" | "confirm";
  interface Order {
    order_id: string;
    user_id: string | null;
    order_date: string;
    shipped_date?: string | null;
    delivered_date?: string | null;
    total_amount: number;
    order_status: OrderStatus;
    shipping_address_id?: string | null;
    shipping?: {
      full_name?: string;
      street_address?: string;
      address_line1?: string;
      address_line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
      phone_number?: string;
    } | null;
    users?: {
      first_name?: string;
      last_name?: string;
      phone_number?: string;
      email?: string;
    } | null;
    order_items?: Array<{
      order_item_id: string;
      order_id?: string;
      ordered_at?: string;
      quantity: number;
      unit_price?: number;
      total_price?: number;
      price?: number;
      products?: {
        product_name?: string;
        final_price?: number;
        base_price?: number;
        discount_percentage?: number;
      } | null;
    }> | null;
  }


const statusDateField: Partial<Record<OrderStatus, keyof Order>> = {
    shipped: "shipped_date",
    delivered: "delivered_date",
  };






export async function updateOrdersStatus(orderId: string, status: string) {
    try {
        const { data: existingOrder, error: existingOrderError } = await supabase
            .from("orders")
            .select("order_id, order_status, order_number, payment_status")
            .eq("order_id", orderId)
            .single();

        if (existingOrderError || !existingOrder) {
            return { success: false, data: null, message: "Order not found" };
        }

        const dateField = statusDateField[status as OrderStatus];
        const isValidStatus = ["processing", "shipped", "delivered"].includes(status);
        if (!isValidStatus) {
            return { success: false, data: null, message: "Invalid status" };
        }
        const timestamp = dateField ? new Date().toISOString() : undefined;
        const updatePayload: Partial<Order> = {
            order_status: status as OrderStatus,
            ...(dateField && timestamp ? { [dateField]: timestamp } : {}),
        };
        const { data, error } = await supabase
            .from("orders")
            .update(updatePayload)
            .eq("order_id", orderId);
        if (error) {
            console.error("Error updating order status:", error);
            return { success: false, data: null, message: error.message };
        }

        // COD shipment is created only once: when status transitions into "processing".
        const isCodOrder = (existingOrder.order_number || "").startsWith("COD-");
        const movedToProcessing =
            existingOrder.order_status !== "processing" && status === "processing";
        if (isCodOrder && movedToProcessing) {
            await createRapidShypOrderForOrder(orderId, "COD");
        }

        revalidatePath("/orders");
        revalidatePath("/dashboard");
        return { success: true, data: data, message: "Order status updated successfully" };
    } catch (error) {
        console.error("Error updating order status:", error);
        return { success: false, data: null, message: error instanceof Error ? error.message : "Failed to update order status" };
    }
}

export async function approveCodOrder(orderId: string) {
    try {
        const { data: existingOrder, error: existingOrderError } = await supabase
            .from("orders")
            .select("order_id, order_status, order_number, payment_status")
            .eq("order_id", orderId)
            .single();

        if (existingOrderError || !existingOrder) {
            return { success: false, message: "Order not found" };
        }

        const isCodOrder = (existingOrder.order_number || "").startsWith("COD-");
        const isPending = existingOrder.order_status === "pending";

        if (!isCodOrder || !isPending) {
            return {
                success: false,
                message: "Only COD orders in pending state can be approved",
            };
        }

        const { error: updateError } = await supabase
            .from("orders")
            .update({
                order_status: "processing",
                payment_status: "confirm",
            })
            .eq("order_id", orderId);

        if (updateError) {
            console.error("Error approving COD order:", updateError);
            return { success: false, message: updateError.message };
        }

        await createRapidShypOrderForOrder(orderId, "COD");

        revalidatePath("/orders");
        revalidatePath("/dashboard");
        return { success: true, message: "COD order approved and RapidShyp updated" };
    } catch (error) {
        console.error("Error approving COD order:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to approve COD order",
        };
    }
}

export async function updatePaymentStatus(orderId: string, paymentStatus: string) {
    try {
        const validStatuses: PaymentStatus[] = ["pending(cod)", "pending", "confirm"];
        if (!validStatuses.includes(paymentStatus as PaymentStatus)) {
            return { success: false, data: null, message: "Invalid payment status" };
        }

        const { data, error } = await supabase
            .from("orders")
            .update({ payment_status: paymentStatus })
            .eq("order_id", orderId);

        if (error) {
            console.error("Error updating payment status:", error);
            return { success: false, data: null, message: error.message };
        }

        revalidatePath("/orders");
        revalidatePath("/dashboard");
        return { success: true, data, message: "Payment status updated successfully" };
    } catch (error) {
        console.error("Error updating payment status:", error);
        return {
            success: false,
            data: null,
            message: error instanceof Error ? error.message : "Failed to update payment status",
        };
    }
}

export async function deleteOrder(orderId: string) {
    try {
        const { data: orderItems, error: fetchItemsError } = await supabase
            .from("order_items")
            .select("product_id, quantity")
            .eq("order_id", orderId);

        if (fetchItemsError) {
            console.error("Error fetching order items for stock restore:", fetchItemsError);
            return { success: false, message: fetchItemsError.message };
        }

        await restoreStockForOrderItems(
            (orderItems ?? []).filter(
                (item): item is { product_id: string; quantity: number } =>
                    Boolean(item.product_id) && Number(item.quantity) > 0
            )
        );

        const { error: itemsError } = await supabase
            .from("order_items")
            .delete()
            .eq("order_id", orderId);

        if (itemsError) {
            console.error("Error deleting order items:", itemsError);
            return { success: false, message: itemsError.message };
        }

        const { error } = await supabase
            .from("orders")
            .delete()
            .eq("order_id", orderId);

        if (error) {
            console.error("Error deleting order:", error);
            return { success: false, message: error.message };
        }

        revalidatePath("/orders");
        revalidatePath("/dashboard");
        return { success: true, message: "Order deleted successfully" };
    } catch (error) {
        console.error("Error deleting order:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to delete order",
        };
    }
}

export async function toggleLockOrder(orderId: string, lockState: boolean) {
    try {
        const { error } = await supabase
            .from("orders")
            .update({ lock_order: lockState })
            .eq("order_id", orderId);

        if (error) {
            console.error("Error toggling order lock:", error);
            return { success: false, message: error.message };
        }

        revalidatePath("/orders");
        revalidatePath("/dashboard");
        return {
            success: true,
            message: lockState ? "Order locked" : "Order unlocked",
        };
    } catch (error) {
        console.error("Error toggling order lock:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to toggle order lock",
        };
    }
}