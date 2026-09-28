
import Dashboard from "@/components/AdminComponents/Dashboard";
import { getDashboardData } from "./action";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const isDarkTheme = false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const { productsRes, ordersRes, reviewsRes, recentOrdersRes, orderItemsRes } = await getDashboardData();

  // Calculate statistics
  const totalProducts = productsRes.count || 0;
  const totalOrders = ordersRes.count || 0;
  const totalReviews = reviewsRes.count || 0;

  // Calculate total revenue from all orders
  const totalRevenue =
    ordersRes.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

  // Format revenue as currency (INR)
  const formattedRevenue = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(totalRevenue);

  // Calculate daily revenue for last 7 days
  const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Find orders for this date
    const dayOrders =
      recentOrdersRes.data?.filter((order) => {
        if (!order.order_date) return false;
        const orderDate = new Date(order.order_date).toISOString().split("T")[0];
        return orderDate === dateStr;
      }) || [];

    const dayTotal = dayOrders.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0
    );

    return {
      date: dateStr,
      dateLabel: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      total: dayTotal,
      orderCount: dayOrders.length,
    };
  });

  // Calculate order items count by category
  const categoryCounts: Record<string, { name: string; count: number }> = {};

  orderItemsRes.data?.forEach((item: any) => {
    if (!item.products || !item.products.category_id) return;
    
    const categoryId = item.products.category_id;
    const categoryName = item.products.categories?.category_name || "Unknown";
    const quantity = item.quantity || 0;

    if (!categoryCounts[categoryId]) {
      categoryCounts[categoryId] = {
        name: categoryName,
        count: 0,
      };
    }
    categoryCounts[categoryId].count += quantity;
  });

  // Get top 3 categories by order item count
  const topCategories = Object.entries(categoryCounts)
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      itemCount: data.count,
    }))
    .sort((a, b) => b.itemCount - a.itemCount)
    .slice(0, 3);

  return (
    <Dashboard
      isDarkTheme={isDarkTheme}
      stats={{
        totalProducts,
        totalOrders,
        totalReviews,
        totalRevenue,
        formattedRevenue,
        dailyRevenue,
        topCategories,
      }}
    />
  );
}
