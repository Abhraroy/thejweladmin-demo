"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-Utils/server";
import supabase from "@/lib/supabase-Utils/admin";
import { deleteImageFromCloudflare } from "@/app/utils/cloudflare";
import { extractR2KeyFromUrl } from "./utils";

export type ImageResourceRecord = {
  id: number;
  created_at: string;
  image_link: string | null;
  section_name: string | null;
  redirect_route: string | null;
};

async function ensureAdmin() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user || user.user_metadata?.TYPE !== "ADMIN") {
    return { ok: false as const, message: "Unauthorized admin request" };
  }

  return { ok: true as const };
}

export async function getAllImageResources(): Promise<{
  success: boolean;
  data?: ImageResourceRecord[];
  error?: string;
}> {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return { success: false, error: auth.message };
    }

    const { data, error } = await supabase
      .from("image_resources")
      .select("id, created_at, image_link, section_name, redirect_route")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: (data ?? []) as ImageResourceRecord[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch image resources",
    };
  }
}

export async function saveImageResource(params: {
  image_link: string;
  section_name: string;
  redirect_route?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return { success: false, error: auth.message };
    }

    const insertPayload: Record<string, unknown> = {
      section_name: params.section_name.trim(),
      image_link: params.image_link,
    };
    if (params.redirect_route?.trim()) {
      insertPayload.redirect_route = params.redirect_route.trim();
    }

    let { error } = await supabase.from("image_resources").insert(insertPayload);

    if (
      error &&
      typeof error.message === "string" &&
      (error.message.toLowerCase().includes('column "image_link"') ||
        error.message.toLowerCase().includes('column "section_name"'))
    ) {
      const retryPayload: Record<string, unknown> = {
        sectionname: params.section_name.trim(),
        imagelink: params.image_link,
      };
      if (params.redirect_route?.trim()) {
        retryPayload.redirect_route = params.redirect_route.trim();
      }
      const retry = await supabase.from("image_resources").insert(retryPayload);
      error = retry.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/resources");
    revalidatePath("/website-assets");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save image resource",
    };
  }
}

export async function getImageResourcesBySection(sectionName: string): Promise<{
  success: boolean;
  data?: ImageResourceRecord[];
  error?: string;
}> {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return { success: false, error: auth.message };
    }

    const trimmedSection = sectionName.trim();
    if (!trimmedSection) {
      return { success: false, error: "Section name is required" };
    }

    const { data, error } = await supabase
      .from("image_resources")
      .select("id, created_at, image_link, section_name, redirect_route")
      .eq("section_name", trimmedSection)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data ?? []) as ImageResourceRecord[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch image resources",
    };
  }
}

export async function updateImageResource(params: {
  id: number;
  section_name: string;
  redirect_route?: string;
  image_link?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return { success: false, error: auth.message };
    }

    if (!params.id) {
      return { success: false, error: "Image resource id is required" };
    }

    const trimmedSection = params.section_name.trim();
    if (!trimmedSection) {
      return { success: false, error: "Section name is required" };
    }

    const nextImageLink = params.image_link?.trim();
    const { data: existing, error: fetchError } = await supabase
      .from("image_resources")
      .select("image_link")
      .eq("id", params.id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: fetchError?.message ?? "Resource not found" };
    }

    const updatePayload: Record<string, unknown> = {
      section_name: trimmedSection,
      redirect_route: params.redirect_route?.trim() ? params.redirect_route.trim() : null,
    };

    if (nextImageLink) {
      updatePayload.image_link = nextImageLink;
    }

    let { error } = await supabase.from("image_resources").update(updatePayload).eq("id", params.id);

    if (
      error &&
      typeof error.message === "string" &&
      (error.message.toLowerCase().includes('column "image_link"') ||
        error.message.toLowerCase().includes('column "section_name"'))
    ) {
      const retryPayload: Record<string, unknown> = {
        sectionname: trimmedSection,
        redirect_route: params.redirect_route?.trim() ? params.redirect_route.trim() : null,
      };
      if (nextImageLink) {
        retryPayload.imagelink = nextImageLink;
      }
      const retry = await supabase.from("image_resources").update(retryPayload).eq("id", params.id);
      error = retry.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }

    if (nextImageLink && existing.image_link && nextImageLink !== existing.image_link) {
      const oldKey = extractR2KeyFromUrl(existing.image_link);
      if (oldKey) {
        await deleteImageFromCloudflare(oldKey);
      }
    }

    revalidatePath("/resources");
    revalidatePath("/website-assets");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update image resource",
    };
  }
}

export async function deleteImageResource(id: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await ensureAdmin();
    if (!auth.ok) {
      return { success: false, error: auth.message };
    }

    const { data: record, error: fetchError } = await supabase
      .from("image_resources")
      .select("image_link")
      .eq("id", id)
      .single();

    if (fetchError || !record) {
      return { success: false, error: fetchError?.message ?? "Resource not found" };
    }

    // Delete from Cloudflare R2 if we have an image URL
    if (record.image_link) {
      const r2Key = extractR2KeyFromUrl(record.image_link);
      if (r2Key) {
        await deleteImageFromCloudflare(r2Key);
      }
    }

    const { error: deleteError } = await supabase
      .from("image_resources")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/resources");
    revalidatePath("/website-assets");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete image resource",
    };
  }
}
