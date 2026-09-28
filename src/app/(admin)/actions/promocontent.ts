"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-Utils/server";
import adminsupabase from "@/lib/supabase-Utils/admin";
import type { PromoContent, PromoLocation } from "@/types/TypeInterface";

type PromoContentPayload = {
  content: string;
  place_to_be_displayed: PromoLocation;
};

const PROMO_LOCATIONS: PromoLocation[] = ["promotion_banner", "share_link"];

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

function isValidPromoLocation(value: string): value is PromoLocation {
  return PROMO_LOCATIONS.includes(value as PromoLocation);
}

function validatePayload(payload: PromoContentPayload) {
  const content = payload.content?.trim() ?? "";
  if (!content) {
    return { ok: false as const, message: "Promotion content is required" };
  }
  if (!isValidPromoLocation(payload.place_to_be_displayed)) {
    return { ok: false as const, message: "Invalid display location" };
  }
  return {
    ok: true as const,
    data: {
      content,
      place_to_be_displayed: payload.place_to_be_displayed,
    },
  };
}

export async function getPromoContent(location?: PromoLocation) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message, data: [] as PromoContent[] };
  }

  let query = adminsupabase
    .from("promo_content")
    .select("id, content, place_to_be_displayed, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (location) {
    query = query.eq("place_to_be_displayed", location);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message, data: [] as PromoContent[] };
  }

  return { success: true, data: (data ?? []) as PromoContent[] };
}

export async function createPromoContent(payload: PromoContentPayload) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  const validated = validatePayload(payload);
  if (!validated.ok) {
    return { success: false, error: validated.message };
  }

  const now = new Date().toISOString();
  const { error } = await adminsupabase.from("promo_content").insert({
    content: validated.data.content,
    place_to_be_displayed: validated.data.place_to_be_displayed,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/website-assets");
  revalidatePath("/");
  return { success: true };
}

export async function updatePromoContent(id: number, payload: PromoContentPayload) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  if (!id) {
    return { success: false, error: "Promotion id is required" };
  }

  const validated = validatePayload(payload);
  if (!validated.ok) {
    return { success: false, error: validated.message };
  }

  const { error } = await adminsupabase
    .from("promo_content")
    .update({
      content: validated.data.content,
      place_to_be_displayed: validated.data.place_to_be_displayed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/website-assets");
  revalidatePath("/");
  return { success: true };
}

export async function deletePromoContent(id: number) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  if (!id) {
    return { success: false, error: "Promotion id is required" };
  }

  const { error } = await adminsupabase.from("promo_content").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/website-assets");
  revalidatePath("/");
  return { success: true };
}
