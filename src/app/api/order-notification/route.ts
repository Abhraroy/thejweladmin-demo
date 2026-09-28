import { NextRequest, NextResponse } from "next/server";
import adminsupabase from "@/lib/supabase-Utils/admin";
import { sendSMS } from "@/app/twilio-sms";
import { formatIstDateTime } from "@/lib/datetime";

function formatShippingAddress(order: {
  address_text?: string | null;
  shipping?: {
    street_address?: string;
    house_no?: string | null;
    landmark?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
}): string {
  if (order.address_text?.trim()) return order.address_text.trim();

  const s = order.shipping;
  if (!s) return "N/A";

  return [
    s.street_address,
    s.house_no,
    s.landmark,
    s.address_line1,
    s.address_line2,
    s.city,
    s.state ? `${s.state} - ${s.postal_code ?? ""}` : s.postal_code,
    s.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log("Body", body);
  const order_id = body.record.order_id;

  const order = await adminsupabase
    .from("orders")
    .select(
      "*,users(*),shipping:addresses!orders_shipping_address_id_fkey(*),order_items(*, products(*))",
    )
    .eq("order_id", order_id)
    .single();
  console.log("OrderDetails", order);

  if (!order.data) {
    return NextResponse.json(
      { message: "Order not found" },
      { status: 404 },
    );
  }

  const items = (order.data.order_items ?? [])
    .map(
      (item: {
        quantity: number;
        products?: { product_name?: string; name?: string } | null;
      }) =>
        `${item.products?.product_name || item.products?.name || "Product"} x${item.quantity}`,
    )
    .join(", ");

  const customerPhone =
    order.data.users?.phone_number ||
    order.data.shipping?.phone_number ||
    "N/A";
  const orderDateIst =
    formatIstDateTime(order.data.order_date) ?? "N/A";
  const amount = Number(order.data.total_amount).toLocaleString("en-IN");

  const message = [
    `New order Received: ${order.data.order_number ?? order.data.order_id}`,
    `Amount: Rs.${amount}`,
    `Items: ${items || "N/A"}`,
    `Customer: ${customerPhone}`,
    `Address: ${formatShippingAddress(order.data)}`,
    `Date (IST): ${orderDateIst}`,
  ].join("\n");

  console.log("Items", items);
  console.log("SMS message", message);

  const sms = await sendSMS(process.env.PHONE_NUMBER_TO_NOTIFY || "+91XXXXXXXXXX", message);
  console.log("SMS sent", sms);
  return NextResponse.json({ message: "Order notification received" });
}
