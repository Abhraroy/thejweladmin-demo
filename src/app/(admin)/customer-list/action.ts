"use server";

import { unstable_noStore } from "next/cache";
import supabase from "@/lib/supabase-Utils/admin";
import type { Address, User } from "@/types/TypeInterface";

/** `public.users` + `addresses` via addresses.user_id → users.user_id (schema.md) */
type CustomerUser = Omit<User, "password_hash"> & {
  addresses?: Address[] | null;
};

const CUSTOMERS_PAGE_SIZE = 10;

type CustomersPageResult = {
  success: boolean;
  data: CustomerUser[] | null;
  totalCount: number;
  page: number;
  pageSize: number;
  message: string;
};

export async function getCustomers(
  page = 1,
  pageSize = CUSTOMERS_PAGE_SIZE,
): Promise<CustomersPageResult> {
  unstable_noStore();

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 50));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { data, error, count } = await supabase
    .from("users")
    .select(
      `
      user_id,
      email,
      first_name,
      last_name,
      phone_number,
      is_active,
      created_at,
      updated_at,
      addresses (
        address_id,
        user_id,
        address_type,
        street_address,
        city,
        state,
        postal_code,
        country,
        is_default,
        address_line1,
        address_line2,
        house_no,
        landmark
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("user_id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching customers:", error);
    return {
      success: false,
      data: null,
      totalCount: 0,
      page: safePage,
      pageSize: safePageSize,
      message: error.message,
    };
  }

  return {
    success: true,
    data: (data ?? []) as unknown as CustomerUser[],
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safePageSize,
    message: "Customers fetched successfully",
  };
}
