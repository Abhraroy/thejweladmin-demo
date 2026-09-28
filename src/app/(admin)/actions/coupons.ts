"use server";

import { revalidatePath } from "next/cache";
import { isPastIstCalendarDay } from "@/lib/datetime";
import { createClient } from "@/lib/supabase-Utils/server";
import adminsupabase from "@/lib/supabase-Utils/admin";
import type { Coupon, CouponDiscountType, CouponType } from "@/types/TypeInterface";

export async function isCouponExpired(
  coupon: Pick<Coupon, "valid_until">,
): Promise<boolean> {
  return isPastIstCalendarDay(coupon.valid_until);
}

type CouponPayload = {
  coupon_code: string;
  coupon_type: CouponType;
  description?: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
};

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.user_metadata?.TYPE !== "ADMIN") {
    return { ok: false as const, message: "Unauthorized admin request" };
  }

  return { ok: true as const };
}

export async function getAllCoupons() {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message, data: [] as Coupon[] };
  }

  const { data, error } = await adminsupabase
    .from("coupons")
    .select(
      "coupon_id, coupon_code, coupon_type, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, usage_count, valid_from, valid_until, is_active"
    )
    .order("valid_until", { ascending: false });

  if (error) {
    return { success: false, error: error.message, data: [] as Coupon[] };
  }

  return { success: true, data: (data ?? []) as Coupon[] };
}

export async function createCoupon(payload: CouponPayload) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  const couponCode = payload.coupon_code.trim().toUpperCase();
  if (!couponCode) {
    return { success: false, error: "Coupon code is required" };
  }

  const validFrom = new Date(payload.valid_from);
  const validUntil = new Date(payload.valid_until);
  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
    return { success: false, error: "Please provide valid start and end date" };
  }
  if (validUntil <= validFrom) {
    return {
      success: false,
      error: "Valid until date must be later than valid from date",
    };
  }

  if (!Number.isFinite(Number(payload.discount_value)) || payload.discount_value <= 0) {
    return { success: false, error: "Discount value must be greater than 0" };
  }

  const { error } = await adminsupabase.from("coupons").insert({
    coupon_code: couponCode,
    coupon_type: payload.coupon_type,
    description: payload.description?.trim() || null,
    discount_type: payload.discount_type,
    discount_value: Number(payload.discount_value),
    min_purchase_amount: Number(payload.min_purchase_amount ?? 0),
    max_discount_amount:
      payload.max_discount_amount === undefined || payload.max_discount_amount === null
        ? null
        : Number(payload.max_discount_amount),
    usage_limit:
      payload.usage_limit === undefined || payload.usage_limit === null
        ? null
        : Number(payload.usage_limit),
    usage_count: 0,
    valid_from: validFrom.toISOString(),
    valid_until: validUntil.toISOString(),
    is_active: Boolean(payload.is_active),
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { success: false, error: "Coupon code already exists" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/resources");
  revalidatePath("/coupons");
  return { success: true };
}

export async function updateCoupon(couponId: string, payload: CouponPayload) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  if (!couponId) {
    return { success: false, error: "Coupon id is required" };
  }

  const couponCode = payload.coupon_code.trim().toUpperCase();
  if (!couponCode) {
    return { success: false, error: "Coupon code is required" };
  }

  const validFrom = new Date(payload.valid_from);
  const validUntil = new Date(payload.valid_until);
  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
    return { success: false, error: "Please provide valid start and end date" };
  }
  if (validUntil <= validFrom) {
    return {
      success: false,
      error: "Valid until date must be later than valid from date",
    };
  }

  if (!Number.isFinite(Number(payload.discount_value)) || payload.discount_value <= 0) {
    return { success: false, error: "Discount value must be greater than 0" };
  }

  const { error } = await adminsupabase
    .from("coupons")
    .update({
      coupon_code: couponCode,
      coupon_type: payload.coupon_type,
      description: payload.description?.trim() || null,
      discount_type: payload.discount_type,
      discount_value: Number(payload.discount_value),
      min_purchase_amount: Number(payload.min_purchase_amount ?? 0),
      max_discount_amount:
        payload.max_discount_amount === undefined || payload.max_discount_amount === null
          ? null
          : Number(payload.max_discount_amount),
      usage_limit:
        payload.usage_limit === undefined || payload.usage_limit === null
          ? null
          : Number(payload.usage_limit),
      valid_from: validFrom.toISOString(),
      valid_until: validUntil.toISOString(),
      is_active: Boolean(payload.is_active),
    })
    .eq("coupon_id", couponId);

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { success: false, error: "Coupon code already exists" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/resources");
  revalidatePath("/coupons");
  return { success: true };
}

export async function updateCouponState(couponId: string, isActive: boolean) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  if (!couponId) {
    return { success: false, error: "Coupon id is required" };
  }

  const { error } = await adminsupabase
    .from("coupons")
    .update({ is_active: isActive })
    .eq("coupon_id", couponId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/resources");
  revalidatePath("/coupons");
  return { success: true };
}

export async function deleteCoupon(couponId: string) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  if (!couponId) {
    return { success: false, error: "Coupon id is required" };
  }

  const { error } = await adminsupabase.from("coupons").delete().eq("coupon_id", couponId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/resources");
  revalidatePath("/coupons");
  return { success: true };
}
