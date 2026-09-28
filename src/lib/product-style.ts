export const PRODUCT_STYLES = [
  { slug: "american-diamond", label: "American Diamond" },
  { slug: "temple-jewellery", label: "Temple Jewellery" },
  { slug: "anti-tarnish", label: "Anti Tarnish" },
] as const;

export type ProductStyleSlug = (typeof PRODUCT_STYLES)[number]["slug"];

const STYLE_SLUGS = new Set<string>(PRODUCT_STYLES.map((s) => s.slug));

export function normalizeStyle(value: unknown): ProductStyleSlug {
  const raw = (value ?? "").toString().trim().toLowerCase();

  if (raw === "american-diamond" || raw === "american diamond") {
    return "american-diamond";
  }
  if (
    raw === "temple-jewellery" ||
    raw === "temple jewellery" ||
    raw === "temple"
  ) {
    return "temple-jewellery";
  }
  if (raw === "anti-tarnish" || raw === "anti tarnish") {
    return "anti-tarnish";
  }

  return "american-diamond";
}

export function getStyleLabel(slug: string): string {
  const match = PRODUCT_STYLES.find((s) => s.slug === slug);
  return match?.label ?? slug;
}

export function isValidStyleSlug(slug: string): slug is ProductStyleSlug {
  return STYLE_SLUGS.has(slug);
}
