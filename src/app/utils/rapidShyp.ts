import axios from "axios";
import adminsupabase from "@/lib/supabase-Utils/admin";

type RapidShypPaymentMethod = "PREPAID" | "COD";

const parseAddressText = (addressText: string) => {
  const addressParts = addressText.split(", ").map((part) => part.trim());
  const lastPart = addressParts[addressParts.length - 1] || "";
  const statePostalMatch = lastPart.match(/^(.+?)\s*-\s*(\d+)$/);

  const hasExtendedFormat = addressParts.length >= 6;

  return {
    streetAddress:
      addressParts[0] && addressParts[0] !== "null" ? addressParts[0] : "",
    houseNo:
      hasExtendedFormat && addressParts[1] && addressParts[1] !== "null"
        ? addressParts[1]
        : "",
    landmark:
      hasExtendedFormat && addressParts[2] && addressParts[2] !== "null"
        ? addressParts[2]
        : "",
    addressLine1:
      (hasExtendedFormat ? addressParts[3] : addressParts[1]) &&
      (hasExtendedFormat ? addressParts[3] : addressParts[1]) !== "null"
        ? hasExtendedFormat
          ? addressParts[3]
          : addressParts[1]
        : "",
    addressLine2:
      (hasExtendedFormat ? addressParts[4] : addressParts[2]) &&
      (hasExtendedFormat ? addressParts[4] : addressParts[2]) !== "null"
        ? hasExtendedFormat
          ? addressParts[4]
          : addressParts[2]
        : "",
    city:
      (hasExtendedFormat ? addressParts[5] : addressParts[3]) &&
      (hasExtendedFormat ? addressParts[5] : addressParts[3]) !== "null"
        ? hasExtendedFormat
          ? addressParts[5]
          : addressParts[3]
        : "",
    state: statePostalMatch ? statePostalMatch[1].trim() : "",
    postalCode: statePostalMatch ? statePostalMatch[2].trim() : "",
  };
};

export async function createRapidShypOrderForOrder(
  orderId: string,
  paymentMethod: RapidShypPaymentMethod
) {
  const orderRes = await adminsupabase
    .from("orders")
    .select(
      `
      *,
      users(*),
      order_items(*, products(*))
      `
    )
    .eq("order_id", orderId)
    .single();

  if (orderRes.error || !orderRes.data) {
    return { success: false, message: "Order not found for shipping" };
  }

  const order = orderRes.data as any;
  const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
  if (orderItems.length === 0) {
    return { success: false, message: "Order has no items for shipping" };
  }

  const parsedAddress = parseAddressText(order.address_text || "");
  const rawAddress = order.address_text || "";
  const addressLine1 =
    parsedAddress.addressLine1 ||
    parsedAddress.streetAddress ||
    rawAddress.trim() ||
    "Address not provided";

  const totalWeight = orderItems.reduce((sum: number, item: any) => {
    const w = Number(item.products?.weight_grams || 0) * (Number(item.quantity) || 1);
    return sum + w;
  }, 0);

  const orderItemsPayload = orderItems.map((item: any) => ({
    itemName: item.products?.product_name || "",
    sku: item.products?.sku || item.product_id,
    description: item.products?.description || item.products?.product_name || "",
    units: item.quantity || 1,
    unitPrice: item.unit_price || item.products?.final_price || 0,
    tax: 0,
    productWeight: item.products?.weight_grams || 0,
    imageURL: item.products?.thumbnail_image || "",
  }));

  const payload = {
    orderId: order.order_number || order.order_id,
    orderDate: order.order_date?.split("T")[0],
    pickupAddressName: process.env.RAPIDSHYP_PICKUP_ADDRESS_NAME || "",
    pickupLocation: {
      contactName: "",
      pickupName: "",
      pickupEmail: "",
      pickupPhone: "",
      pickupAddress1: "",
      pickupAddress2: "",
      pinCode: "",
    },
    storeName: process.env.RAPIDSHYP_STORE_NAME || process.env.NEXT_PUBLIC_SITE_URL || "DEFAULT",
    billingIsShipping: true,
    shippingAddress: {
      firstName: order.users?.first_name || "",
      lastName: order.users?.last_name || "",
      addressLine1,
      addressLine2: parsedAddress.addressLine2 || "",
      pinCode: parsedAddress.postalCode || "",
      email: order.users?.email || "",
      phone: order.users?.phone_number || "",
    },
    orderItems: orderItemsPayload,
    paymentMethod,
    totalOrderValue: order.total_amount,
    packageDetails: {
      packageLength: Number(process.env.RAPIDSHYP_PACKAGE_LENGTH) || 0,
      packageBreadth: Number(process.env.RAPIDSHYP_PACKAGE_BREADTH) || 0,
      packageHeight: Number(process.env.RAPIDSHYP_PACKAGE_HEIGHT) || 0,
      packageWeight: totalWeight > 0 ? totalWeight : Number(process.env.RAPIDSHYP_DEFAULT_PACKAGE_WEIGHT) || 0,
    },
  };

  try {
    const response = await axios.post(
      "https://api.rapidshyp.com/rapidshyp/apis/v1/create_order",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "rapidshyp-token": `${process.env.RAPIDSHYP_API_KEY}`,
        },
      }
    );
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("RapidShyp API Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: JSON.stringify(error.response?.data, null, 2),
      message: error.message,
    });
    return { success: false, message: "RapidShyp API call failed" };
  }
}
