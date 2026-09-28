import { normalizeStyle } from './product-style';

type StyleOption = { style_id: string; slug: string | null };
type OccasionOption = { occasion_id: string; slug: string | null };

export function resolveStyleId(
  product: {
    style_id?: string | null;
    style?: string | null;
    collection?: string | null;
  },
  styles: StyleOption[],
): string {
  if (product.style_id) return product.style_id;
  const slug = normalizeStyle(product.style ?? product.collection);
  return styles.find((s) => s.slug === slug)?.style_id ?? '';
}

export function resolveOccasionId(
  product: {
    occasion_id?: string | null;
    occasion?: string | null;
  },
  occasions: OccasionOption[],
): string {
  if (product.occasion_id) return product.occasion_id;
  const slug = (product.occasion ?? '').trim().toLowerCase();
  return occasions.find((o) => o.slug === slug)?.occasion_id ?? '';
}
