"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-Utils/server";
import adminsupabase from "@/lib/supabase-Utils/admin";
import {
  uploadImageToCloudflare,
  deleteImageFromCloudflare,
} from "@/app/utils/cloudflare";
import { extractR2KeyFromUrl } from "./utils";

export interface Style {
  style_id: string;
  style_name: string;
  slug: string | null;
  image_link: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StyleSelectOption {
  style_id: string;
  style_name: string;
  slug: string | null;
}

export interface CreateStyleData {
  style_name: string;
  slug: string;
  image_link?: File | string | null;
  is_active?: boolean;
}

export interface UpdateStyleData extends Partial<CreateStyleData> {
  style_id: string;
}

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

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function getStyles(): Promise<{
  success: boolean;
  data?: Style[];
  error?: string;
}> {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  const { data, error } = await adminsupabase
    .from("styles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as Style[] };
}

export async function getActiveStylesForSelect(): Promise<{
  success: boolean;
  data?: StyleSelectOption[];
  error?: string;
}> {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message, data: [] };
  }

  const { data, error } = await adminsupabase
    .from("styles")
    .select("style_id, style_name, slug")
    .eq("is_active", true)
    .order("style_name", { ascending: true });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: (data ?? []) as StyleSelectOption[] };
}

export async function createStyle(
  formData: CreateStyleData,
): Promise<{ success: boolean; data?: Style; error?: string }> {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  try {
    let imageUrl: string | null = null;
    let uploadedImageKey: string | null = null;

    if (formData.image_link) {
      if (formData.image_link instanceof File) {
        const uploadResult = await uploadImageToCloudflare(formData.image_link, {
          folder: "styles",
        });

        if (!uploadResult.success) {
          return {
            success: false,
            error: uploadResult.error || "Failed to upload image",
          };
        }

        imageUrl = uploadResult.url || null;
        uploadedImageKey = uploadResult.key || null;
      } else {
        imageUrl = formData.image_link;
      }
    }

    const slug = formData.slug?.trim() || slugify(formData.style_name);
    const now = new Date().toISOString();

    const { data, error } = await adminsupabase
      .from("styles")
      .insert({
        style_name: formData.style_name.trim(),
        slug,
        image_link: imageUrl,
        is_active: formData.is_active ?? true,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      if (uploadedImageKey) {
        await deleteImageFromCloudflare(uploadedImageKey);
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/styles");
    revalidatePath("/products");
    return { success: true, data: data as Style };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create style",
    };
  }
}

export async function updateStyle(
  formData: UpdateStyleData,
): Promise<{ success: boolean; data?: Style; error?: string }> {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  try {
    const { data: current, error: fetchError } = await adminsupabase
      .from("styles")
      .select("image_link")
      .eq("style_id", formData.style_id)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    let imageUrl = current.image_link;

    if (formData.image_link !== undefined) {
      if (formData.image_link === null) {
        if (current.image_link) {
          const r2Key = extractR2KeyFromUrl(current.image_link);
          if (r2Key) {
            await deleteImageFromCloudflare(r2Key);
          }
        }
        imageUrl = null;
      } else if (formData.image_link instanceof File) {
        if (current.image_link) {
          const r2Key = extractR2KeyFromUrl(current.image_link);
          if (r2Key) {
            await deleteImageFromCloudflare(r2Key);
          }
        }

        const uploadResult = await uploadImageToCloudflare(formData.image_link, {
          folder: "styles",
        });

        if (!uploadResult.success) {
          return {
            success: false,
            error: uploadResult.error || "Failed to upload image",
          };
        }

        imageUrl = uploadResult.url || null;
      } else {
        imageUrl = formData.image_link;
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (formData.style_name !== undefined) {
      updateData.style_name = formData.style_name.trim();
    }
    if (formData.slug !== undefined) {
      updateData.slug = formData.slug.trim() || slugify(formData.style_name ?? "");
    }
    if (formData.image_link !== undefined) {
      updateData.image_link = imageUrl;
    }
    if (formData.is_active !== undefined) {
      updateData.is_active = formData.is_active;
    }

    const { data, error } = await adminsupabase
      .from("styles")
      .update(updateData)
      .eq("style_id", formData.style_id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/styles");
    revalidatePath("/products");
    return { success: true, data: data as Style };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update style",
    };
  }
}

export async function deleteStyle(
  styleId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.message };
  }

  try {
    const { data: style, error: fetchError } = await adminsupabase
      .from("styles")
      .select("image_link")
      .eq("style_id", styleId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const { error } = await adminsupabase
      .from("styles")
      .delete()
      .eq("style_id", styleId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (style?.image_link) {
      const r2Key = extractR2KeyFromUrl(style.image_link);
      if (r2Key) {
        await deleteImageFromCloudflare(r2Key);
      }
    }

    revalidatePath("/styles");
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete style",
    };
  }
}
