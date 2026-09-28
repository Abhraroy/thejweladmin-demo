import Orders from "@/components/AdminComponents/order/Orders";
import { getOrders } from "./action";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdersPage() {
  
  const { success, data: ordersData, message } = await getOrders();

  console.log("[OrdersPage] getOrders result:", {
    success,
    message,
    ordersCount: ordersData?.length ?? 0,
    hasData: !!ordersData,
  });

  if (!success) {
    console.error("Error fetching orders:", message);
    return (
      <div className="w-full p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error fetching orders: {message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen p-6 overflow-hidden">
      <Orders initialOrders={ordersData ?? []} />
    </div>
  );
}
