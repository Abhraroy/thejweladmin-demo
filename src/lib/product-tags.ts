/** Tags that power homepage product carousels */
export const HOMEPAGE_SECTION_TAGS = [
  "best-sellers",
  "new-arrivals",
  "featured",
  "trending",
] as const;

export type HomepageSectionTag = (typeof HOMEPAGE_SECTION_TAGS)[number];

/** Tags selectable in admin product create/edit form */
export const ADMIN_SELECTABLE_TAGS = [
  ...HOMEPAGE_SECTION_TAGS,
  "limited edition",
  "on sale",
  "exclusive",
  "best value",
  "new arrival",
  "top rated",
] as const;
