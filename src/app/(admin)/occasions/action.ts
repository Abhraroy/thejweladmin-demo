"use server";

import { getOccasions } from "@/app/(admin)/actions/occasions";

export async function getOccasionsPageData() {
  return getOccasions();
}
