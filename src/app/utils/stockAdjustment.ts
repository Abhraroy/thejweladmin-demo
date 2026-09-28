import "server-only";
import adminsupabase from "@/lib/supabase-Utils/admin";

export interface OrderStockItem {
  product_id: string;
  quantity: number;
}

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[stockAdjustment]", ...args);
  }
};

export function aggregateQuantitiesByProductId(
  items: OrderStockItem[]
): Map<string, number> {
  const qtyByProductId = new Map<string, number>();
  for (const item of items) {
    const pid = item.product_id;
    const qty = Number(item.quantity) || 0;
    if (!pid || qty <= 0) continue;
    qtyByProductId.set(pid, (qtyByProductId.get(pid) || 0) + qty);
  }
  return qtyByProductId;
}

async function adjustStockForOrderItems(
  items: OrderStockItem[],
  direction: "decrement" | "restore"
): Promise<void> {
  const qtyByProductId = aggregateQuantitiesByProductId(items);
  if (qtyByProductId.size === 0) return;

  for (const [productId, orderedQty] of qtyByProductId.entries()) {
    const productRes = await adminsupabase
      .from("products")
      .select("stock_quantity")
      .eq("product_id", productId)
      .single();

    if (productRes.error) {
      console.error(
        `Failed to fetch product for stock ${direction}:`,
        productRes.error
      );
      continue;
    }

    const currentStock = Number(productRes.data?.stock_quantity) || 0;
    const nextStock =
      direction === "decrement"
        ? Math.max(0, currentStock - orderedQty)
        : currentStock + orderedQty;

    const updateRes = await adminsupabase
      .from("products")
      .update({ stock_quantity: nextStock })
      .eq("product_id", productId);

    if (updateRes.error) {
      console.error(
        `Failed to ${direction} stock for product ${productId}:`,
        updateRes.error
      );
    }
  }
}

export async function decrementStockForOrderItems(
  items: OrderStockItem[]
): Promise<void> {
  try {
    await adjustStockForOrderItems(items, "decrement");
  } catch (error) {
    devLog("decrement-error", { error });
    console.error("Stock decrement error:", error);
  }
}

export async function restoreStockForOrderItems(
  items: OrderStockItem[]
): Promise<void> {
  try {
    await adjustStockForOrderItems(items, "restore");
  } catch (error) {
    devLog("restore-error", { error });
    console.error("Stock restore error:", error);
  }
}
