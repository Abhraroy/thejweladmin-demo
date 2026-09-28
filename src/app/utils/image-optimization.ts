/**
 * Image URL utilities – Cloudflare Image Resizing for R2 CDN, pass-through for others.
 */

/** Preset names for common use cases */
export type ImagePresetName = "thumbnail" | "card" | "full";

/** Default srcSet widths for responsive images */
export const SRC_SET_WIDTHS = [200, 400, 800] as const;

/** Fallback placeholder for missing/broken images */
export const PLACEHOLDER_IMAGE = "/placeholder.png";

/** Cloudflare R2 CDN host used for image resizing (must have Image Resizing enabled) */
const CLOUDFLARE_CDN_HOST = "images.thejwel.in";

/** Preset dimensions and quality for Cloudflare Image Resizing */
const PRESET_CONFIG: Record<ImagePresetName, { width: number; quality: number }> = {
  thumbnail: { width: 200, quality: 80 },
  card: { width: 400, quality: 85 },
  full: { width: 1200, quality: 90 },
};

function isCloudflareCdnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === CLOUDFLARE_CDN_HOST;
  } catch {
    return false;
  }
}

/**
 * Build Cloudflare Image Resizing URL.
 * Format: https://<zone>/cdn-cgi/image/<options>/<source-path>
 */
function buildCloudflareResizeUrl(
  baseUrl: string,
  width: number,
  quality: number,
  format = "auto"
): string {
  try {
    const parsed = new URL(baseUrl);
    const pathname = parsed.pathname || "/";
    const options = `width=${width},quality=${quality},format=${format},fit=scale-down`;
    return `${parsed.origin}/cdn-cgi/image/${options}${pathname}`;
  } catch {
    return baseUrl;
  }
}

/**
 * Return the optimized image URL.
 * Uses Cloudflare Image Resizing for R2 CDN images; returns others as-is.
 *
 * @param baseUrl - URL from DB
 * @param width - Optional width (default 800)
 * @param quality - Optional quality 1–100 (default 85)
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  width = 800,
  quality = 85
): string {
  if (!baseUrl || typeof baseUrl !== "string") return PLACEHOLDER_IMAGE;
  if (isCloudflareCdnUrl(baseUrl)) {
    return buildCloudflareResizeUrl(baseUrl, width, quality);
  }
  return baseUrl;
}

/**
 * Return the image URL using a preset name.
 *
 * @param baseUrl - URL from DB
 * @param presetName - "thumbnail" | "card" | "full"
 */
export function getImagePreset(baseUrl: string, presetName: ImagePresetName): string {
  if (!baseUrl || typeof baseUrl !== "string") return PLACEHOLDER_IMAGE;
  if (isCloudflareCdnUrl(baseUrl)) {
    const { width, quality } = PRESET_CONFIG[presetName];
    return buildCloudflareResizeUrl(baseUrl, width, quality);
  }
  return baseUrl;
}

/**
 * Generate srcSet for responsive images (Cloudflare CDN only).
 *
 * @param baseUrl - URL from DB
 * @param widths - Array of widths
 */
export function getImageSrcSet(
  baseUrl: string,
  widths: readonly number[] = SRC_SET_WIDTHS
): string | null {
  if (!baseUrl || typeof baseUrl !== "string" || !isCloudflareCdnUrl(baseUrl)) {
    return null;
  }
  const entries = widths.map((w) => {
    const url = buildCloudflareResizeUrl(baseUrl, w, 85);
    return `${url} ${w}w`;
  });
  return entries.join(", ");
}
