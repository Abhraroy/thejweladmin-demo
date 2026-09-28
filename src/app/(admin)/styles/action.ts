"use server";

import { getStyles } from "@/app/(admin)/actions/styles";

export async function getStylesPageData() {
  return getStyles();
}
