"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCustomers } from "@/app/(admin)/customer-list/action";
import { formatIstDateTime } from "@/lib/datetime";
import type { Address, User } from "@/types/TypeInterface";

type CustomerUser = Omit<User, "password_hash"> & {
  addresses?: Address[] | null;
};

const CUSTOMERS_PAGE_SIZE = 10;

function formatName(customer: CustomerUser): string {
  const name = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "—";
}

function formatAddress(address: Address): string {
  const parts = [
    address.house_no,
    address.address_line1 || address.street_address,
    address.address_line2,
    address.landmark,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ].filter(Boolean);
  return parts.join(", ");
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);

    const result = await getCustomers(page, CUSTOMERS_PAGE_SIZE);

    if (!result.success) {
      setCustomers([]);
      setTotalCount(0);
      setError(result.message || "Unable to load customers");
      setIsLoading(false);
      return;
    }

    setCustomers(result.data ?? []);
    setTotalCount(result.totalCount);
    setCurrentPage(result.page);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCustomers(1);
  }, [loadCustomers]);

  const totalPages = Math.max(1, Math.ceil(totalCount / CUSTOMERS_PAGE_SIZE));
  const startIndex =
    totalCount === 0 ? 0 : (currentPage - 1) * CUSTOMERS_PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * CUSTOMERS_PAGE_SIZE, totalCount);

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    loadCustomers(page);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1 border-b border-black pb-4">
        <h1 className="text-2xl font-bold">Customer List</h1>
        <p className="text-sm text-gray-500">
          {totalCount} registered customer{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      {isLoading ? (
        <span className="text-sm text-slate-500">Loading customers...</span>
      ) : error ? (
        <span className="text-sm text-red-700 border border-red-200 rounded-lg p-4 bg-red-50">
          {error}
        </span>
      ) : customers.length === 0 ? (
        <span className="text-sm text-slate-500">No customers found.</span>
      ) : (
        <div className="flex flex-col gap-3">
          {customers.map((customer) => (
            <div
              key={customer.user_id}
              className="flex flex-col gap-2 border border-slate-300 rounded-lg p-4 bg-white"
            >
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold">{formatName(customer)}</span>
                <span>{customer.email || "—"}</span>
                <span>{customer.phone_number || "—"}</span>
                <span>
                  {customer.is_active === false ? "Inactive" : "Active"}
                </span>
                <span>
                  Joined: {formatIstDateTime(customer.created_at) || "—"}
                </span>
              </div>

              <div className="flex flex-col gap-1 border-t border-slate-200 pt-2">
                {(customer.addresses?.length ?? 0) > 0 ? (
                  customer.addresses!.map((address) => (
                    <div
                      key={address.address_id}
                      className="flex flex-wrap gap-x-2 text-sm text-slate-700"
                    >
                      {address.address_type && (
                        <span className="font-medium capitalize">
                          {address.address_type}:
                        </span>
                      )}
                      <span>{formatAddress(address)}</span>
                      {address.is_default && (
                        <span className="text-xs border border-slate-300 rounded px-1.5">
                          Default
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No address saved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-300 rounded-lg px-4 py-3 bg-slate-50">
          <span className="text-xs text-slate-500">
            Showing {startIndex}–{endIndex} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="p-2 rounded-lg border border-slate-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNumbers.map((page, index) =>
              page === "..." ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-500">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  disabled={isLoading}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    currentPage === page
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {page}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="p-2 rounded-lg border border-slate-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
