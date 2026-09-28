"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { getOrders } from "@/app/(admin)/orders/action";
import { Download, Lock, LockOpen, Trash2 } from "lucide-react";

import {
  updateOrdersStatus,
  updatePaymentStatus,
  approveCodOrder,
  deleteOrder,
  toggleLockOrder,
} from "@/app/(admin)/actions/order";
import { toast } from "react-toastify";
import {
  formatIstDate,
  formatIstDateTime,
  formatIstTime,
  istDayIndex,
  istDayIndexFromDateInput,
  todayIstDayIndex,
} from "@/lib/datetime";

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

interface Order {
  order_id: string;
  order_number?: string | null;
  user_id: string | null;
  order_date: string;
  shipped_date?: string | null;
  delivered_date?: string | null;
  total_amount: number;
  order_status: OrderStatus;
  payment_status?: string | null;
  shipping_address_id?: string | null;
  lock_order?: boolean | null;
  shipping?: {
    full_name?: string;
    street_address?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    phone_number?: string;
  } | null;
  users?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    email?: string;
  } | null;
  order_items?: Array<{
    order_item_id: string;
    order_id?: string;
    ordered_at?: string;
    quantity: number;
    unit_price?: number;
    total_price?: number;
    price?: number;
    products?: {
      product_name?: string;
      final_price?: number;
      base_price?: number;
      discount_percentage?: number;
      sku?: string;
    } | null;
  }> | null;
}

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-purple-100 text-purple-700",
};

const paymentStatusColors: Record<string, string> = {
  "pending(cod)": "bg-orange-100 text-orange-700",
  pending: "bg-amber-100 text-amber-700",
  confirm: "bg-green-100 text-green-700",
};

const allowedStatuses: OrderStatus[] = [
  "processing",
  "shipped",
  "delivered",
];
const allowedPaymentStatuses = ["pending(cod)", "pending", "confirm"] as const;
type PaymentStatus = (typeof allowedPaymentStatuses)[number];

type DateFilter = "all" | "today" | "yesterday" | "custom";

const ITEMS_PER_PAGE = 10;

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value || 0
  );

const formatDate = (value?: string | null) => formatIstDate(value);

const formatDateTime = (value?: string | null) => formatIstDateTime(value);

async function copyTextToClipboard(text: string, label: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  }
}

function CopyableText({
  value,
  label,
  className,
  fallback = "—",
}: {
  value?: string | null;
  label: string;
  className?: string;
  fallback?: string;
}) {
  const text = value?.trim() || "";
  const display = text || fallback;

  return (
    <button
      type="button"
      onClick={() => copyTextToClipboard(text, label)}
      disabled={!text}
      title={text ? `Click to copy ${label.toLowerCase()}` : undefined}
      className={`text-left transition-colors disabled:cursor-default ${
        text ? "cursor-pointer hover:text-gray-900" : ""
      } ${className ?? ""}`}
    >
      {display}
    </button>
  );
}

interface OrdersProps {
  initialOrders: Order[];
}

export default function Orders({ initialOrders }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setOrders(initialOrders ?? []);
  }, [initialOrders]);

  useEffect(() => {
    const POLL_INTERVAL_MS = 30000;
    const id = setInterval(async () => {
      const { success, data } = await getOrders();
      if (success && data) {
        setOrders(data);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const filteredOrders = useMemo(() => {
    const todayIndex = todayIstDayIndex();
    const yesterdayIndex = todayIndex - 1;

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ? true : order.order_status === statusFilter;

      const matchesPayment =
        paymentFilter === "all"
          ? true
          : (order.payment_status || "pending") === paymentFilter;

      const matchesSearch =
        search.trim().length === 0
          ? true
          : (order.order_number || "")
              .toLowerCase()
              .includes(search.toLowerCase());

      let matchesDate = true;
      if (dateFilter !== "all") {
        const orderIndex = istDayIndex(order.order_date);
        if (orderIndex == null) {
          matchesDate = false;
        } else if (dateFilter === "today") {
          matchesDate = orderIndex === todayIndex;
        } else if (dateFilter === "yesterday") {
          matchesDate = orderIndex === yesterdayIndex;
        } else if (dateFilter === "custom") {
          if (customDateFrom) {
            const fromIndex = istDayIndexFromDateInput(customDateFrom);
            if (fromIndex != null) matchesDate = orderIndex >= fromIndex;
          }
          if (matchesDate && customDateTo) {
            const toIndex = istDayIndexFromDateInput(customDateTo);
            if (toIndex != null) matchesDate = orderIndex <= toIndex;
          }
        }
      }

      return matchesStatus && matchesPayment && matchesSearch && matchesDate;
    });
  }, [orders, search, statusFilter, paymentFilter, dateFilter, customDateFrom, customDateTo]);

  console.log("[Orders] filtering:", {
    total: orders.length,
    filtered: filteredOrders.length,
    search,
    statusFilter,
    paymentFilter,
    dateFilter,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, paymentFilter, dateFilter, customDateFrom, customDateTo]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const totalRevenue = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [filteredOrders]
  );

  const averageOrderValue = useMemo(() => {
    if (!filteredOrders.length) return 0;
    return totalRevenue / filteredOrders.length;
  }, [filteredOrders.length, totalRevenue]);

  const totalItems = useMemo(
    () =>
      filteredOrders.reduce((sum, o) => {
        const itemsCount =
          o.order_items?.reduce((acc, item) => acc + (item.quantity || 0), 0) ??
          0;
        return sum + itemsCount;
      }, 0),
    [filteredOrders]
  );

  const toggleExpanded = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find((o) => o.order_id === orderId);
    if (order?.lock_order) {
      toast.error("Order is locked. Unlock it first to make changes.");
      return;
    }
    setUpdatingId(`${orderId}:order`);
    const { success, message } = await updateOrdersStatus(orderId, newStatus);
    if (!success) {
      toast.error(message);
      setUpdatingId(null);
      return;
    }
    toast.success(message);
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === orderId ? { ...o, order_status: newStatus } : o
      )
    );
    setUpdatingId(null);
  };

  const handlePaymentStatusChange = async (
    orderId: string,
    newStatus: PaymentStatus
  ) => {
    const order = orders.find((o) => o.order_id === orderId);
    if (order?.lock_order) {
      toast.error("Order is locked. Unlock it first to make changes.");
      return;
    }
    setUpdatingId(`${orderId}:payment`);
    const { success, message } = await updatePaymentStatus(orderId, newStatus);
    if (!success) {
      toast.error(message);
      setUpdatingId(null);
      return;
    }
    toast.success(message);
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === orderId ? { ...o, payment_status: newStatus } : o
      )
    );
    setUpdatingId(null);
  };

  const handleCodApprove = async (orderId: string) => {
    const order = orders.find((o) => o.order_id === orderId);
    if (order?.lock_order) {
      toast.error("Order is locked. Unlock it first to make changes.");
      return;
    }
    setUpdatingId(`${orderId}:approve`);
    const { success, message } = await approveCodOrder(orderId);
    if (!success) {
      toast.error(message);
      setUpdatingId(null);
      return;
    }
    toast.success(message);
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === orderId
          ? { ...o, order_status: "processing", payment_status: "confirm" }
          : o
      )
    );
    setUpdatingId(null);
  };

  const handleDelete = async (orderId: string) => {
    setDeletingId(orderId);
    const { success, message } = await deleteOrder(orderId);
    if (!success) {
      toast.error(message);
    } else {
      toast.success(message);
      setOrders((prev) => prev.filter((o) => o.order_id !== orderId));
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const handleToggleLock = async (orderId: string, currentLock: boolean) => {
    const newLock = !currentLock;
    setUpdatingId(`${orderId}:lock`);
    const { success, message } = await toggleLockOrder(orderId, newLock);
    if (!success) {
      toast.error(message);
    } else {
      toast.success(message);
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId ? { ...o, lock_order: newLock } : o
        )
      );
    }
    setUpdatingId(null);
  };

  const handleDownload = (order: Order) => {
    toast.info(
      `Download for ${order.order_number ?? order.order_id.slice(0, 8)} coming soon`
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Fixed top section */}
      <div className="shrink-0 space-y-4 pb-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Orders Management
            </h1>
            <p className="text-sm text-gray-600">
              Track, filter, and review customer orders.
            </p>
          </div>
        </header>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 justify-around items-end">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number"
              className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All order statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All payment statuses</option>
            <option value="pending(cod)">Pending (COD)</option>
            <option value="pending">Pending</option>
            <option value="confirm">Confirmed</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => {
              const val = e.target.value as DateFilter;
              setDateFilter(val);
              if (val !== "custom") {
                setCustomDateFrom("");
                setCustomDateTo("");
              }
            }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="custom">Custom date</option>
          </select>

          {dateFilter === "custom" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard label="Total Orders" value={filteredOrders.length} />
          <SummaryCard label="Total Revenue" value={currency(totalRevenue)} />
          <SummaryCard
            label="Avg Order Value"
            value={currency(averageOrderValue)}
            sub={`${totalItems} items`}
          />
        </div>
      </div>

      {/* Scrollable table area */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow border border-gray-100 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left min-w-[1080px]">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr className="text-xs uppercase tracking-wide text-gray-500">
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Order Status</Th>
                <Th>Payment Status</Th>
                <Th>Total</Th>
                <Th>Items</Th>
                <Th>Shipping</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!error && paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              )}
              {!error &&
                paginatedOrders.map((order) => {
                  const isExpanded = expandedOrders.has(order.order_id);
                  const isLocked = !!order.lock_order;
                  const itemCount =
                    order.order_items?.reduce(
                      (sum, item) => sum + (item.quantity || 0),
                      0
                    ) ?? 0;
                  const address = order.shipping;
                  const customerName =
                    (order.users?.first_name || "") +
                    (order.users?.last_name ? ` ${order.users.last_name}` : "");
                  const statusOptions = allowedStatuses.includes(order.order_status)
                    ? allowedStatuses
                    : [...allowedStatuses, order.order_status];
                  const paymentStatus = (order.payment_status || "pending") as PaymentStatus;
                  const paymentStatusOptions = allowedPaymentStatuses.includes(paymentStatus)
                    ? allowedPaymentStatuses
                    : [...allowedPaymentStatuses, paymentStatus] as const;
                  return (
                    <Fragment key={order.order_id}>
                      <tr
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm cursor-pointer ${
                          isLocked ? "bg-amber-50/40" : ""
                        }`}
                        onClick={() => toggleExpanded(order.order_id)}
                      >
                        {/* Order column */}
                        <Td className="font-semibold text-gray-900">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {isLocked && (
                                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              )}
                              <span className="text-xs text-gray-500 font-mono">
                                {order.order_id.slice(0, 8)}...
                              </span>
                            </div>
                            {order.order_number && (
                              <span className="text-xs font-semibold text-emerald-700">
                                {order.order_number}
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border w-fit ${
                                isExpanded
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : "bg-gray-50 border-gray-200 text-gray-600"
                              }`}
                            >
                              {isExpanded ? "Hide items" : "View items"}
                            </span>
                          </div>
                        </Td>

                        {/* Customer */}
                        <Td>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {customerName || "Guest"}
                            </span>
                            {order.users?.email && (
                              <span className="text-xs text-gray-500">
                                {order.users.email}
                              </span>
                            )}
                            {order.users?.phone_number && (
                              <span className="text-xs text-gray-500">
                                {order.users.phone_number}
                              </span>
                            )}
                          </div>
                        </Td>

                        {/* Date */}
                        <Td>
                          <div className="flex flex-col">
                            <span className="text-gray-900">
                              {formatDate(order.order_date)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatIstTime(order.order_date)}
                            </span>
                            {order.shipped_date && (
                              <span className="text-xs text-emerald-700">
                                Shipped: {formatDateTime(order.shipped_date)}
                              </span>
                            )}
                            {order.delivered_date && (
                              <span className="text-xs text-emerald-800">
                                Delivered: {formatDateTime(order.delivered_date)}
                              </span>
                            )}
                          </div>
                        </Td>

                        {/* Order Status column */}
                        <Td>
                          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                            {(order.order_number || "").startsWith("COD-") &&
                              order.order_status === "pending" && (
                                <button
                                  type="button"
                                  onClick={() => handleCodApprove(order.order_id)}
                                  disabled={updatingId === `${order.order_id}:approve` || isLocked}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed w-fit"
                                >
                                  {updatingId === `${order.order_id}:approve` ? "Approving..." : "Approve COD"}
                                </button>
                              )}
                            <div className="flex items-center gap-2">
                              <select
                                value={order.order_status}
                                onChange={(e) =>
                                  handleStatusChange(order.order_id, e.target.value as OrderStatus)
                                }
                                disabled={updatingId === `${order.order_id}:order` || isLocked}
                                className="text-xs font-semibold rounded-lg border border-gray-200 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {statusOptions.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                                  statusColors[order.order_status] ||
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {order.order_status}
                              </span>
                            </div>
                            {updatingId === `${order.order_id}:order` && (
                              <span className="text-[11px] text-gray-500">Updating...</span>
                            )}
                          </div>
                        </Td>

                        {/* Payment Status column */}
                        <Td>
                          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <select
                                value={paymentStatus}
                                onChange={(e) =>
                                  handlePaymentStatusChange(
                                    order.order_id,
                                    e.target.value as PaymentStatus
                                  )
                                }
                                disabled={updatingId === `${order.order_id}:payment` || isLocked}
                                className="text-xs font-semibold rounded-lg border border-gray-200 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {paymentStatusOptions.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                                  paymentStatusColors[paymentStatus] || "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {paymentStatus}
                              </span>
                            </div>
                            {updatingId === `${order.order_id}:payment` && (
                              <span className="text-[11px] text-gray-500">Updating...</span>
                            )}
                          </div>
                        </Td>

                        {/* Total */}
                        <Td className="font-semibold text-gray-900">
                          {currency(order.total_amount || 0)}
                        </Td>

                        {/* Items */}
                        <Td className="text-gray-700">{itemCount}</Td>

                        {/* Shipping */}
                        <Td>
                          {address ? (
                            <div className="text-xs text-gray-700 leading-snug max-w-[250px]">
                              {address.full_name && <div className="font-medium">{address.full_name}</div>}
                              {address.street_address && <div>{address.street_address}</div>}
                              {address.address_line1 && <div>{address.address_line1}</div>}
                              {address.address_line2 && <div>{address.address_line2}</div>}
                              {(address.city || address.state || address.postal_code) && (
                                <div>
                                  {address.city}{address.city && address.state ? ", " : ""}
                                  {address.state}{(address.city || address.state) && address.postal_code ? " - " : ""}
                                  {address.postal_code}
                                </div>
                              )}
                              {address.country && <div>{address.country}</div>}
                              {address.phone_number && <div className="text-gray-500 mt-1">{address.phone_number}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </Td>

                        {/* Actions */}
                        <Td>
                          <div
                            className="flex items-center gap-2 flex-nowrap shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              title="Download order"
                              onClick={() => handleDownload(order)}
                              className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title={isLocked ? "Unlock order (allow changes)" : "Lock order (prevent changes)"}
                              onClick={() =>
                                handleToggleLock(order.order_id, isLocked)
                              }
                              disabled={updatingId === `${order.order_id}:lock`}
                              className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                isLocked
                                  ? "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200"
                                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                              }`}
                            >
                              {isLocked ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <LockOpen className="w-4 h-4" />
                              )}
                            </button>

                            {confirmDeleteId === order.order_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(order.order_id)}
                                  disabled={deletingId === order.order_id}
                                  className="px-2 py-1 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {deletingId === order.order_id
                                    ? "Deleting..."
                                    : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-xs font-semibold rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                title="Delete order"
                                onClick={() =>
                                  setConfirmDeleteId(order.order_id)
                                }
                                className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </Td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="space-y-3">
                              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                                Order Items
                              </div>
                              <div className="space-y-2">
                                {order.order_items?.map((item) => (
                                  <div
                                    key={item.order_item_id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                                  >
                                    <div className="flex flex-col">
                                      <CopyableText
                                        value={item.products?.sku}
                                        label="SKU"
                                        className="text-xs text-gray-500"
                                      />
                                      <CopyableText
                                        value={item.products?.product_name}
                                        label="Product name"
                                        fallback="Product"
                                        className="font-semibold text-gray-900"
                                      />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-700">
                                      <span>Qty: <strong>{item.quantity}</strong></span>
                                      <span>
                                        Price:{" "}
                                        <strong>{currency(item.unit_price || item.price || 0)}</strong>
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination - fixed at bottom of table card */}
        {totalPages > 1 && (
          <div className="shrink-0 flex justify-between items-center px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg transition-colors bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <LeftArrowIcon className="w-4 h-4" />
              </button>
              {getPageNumbers().map((page, index) =>
                page === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-500 text-sm">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg transition-colors bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                title="Next page"
              >
                <RightArrowIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- small helper components ---------- */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-3 px-4 font-semibold text-left whitespace-nowrap">{children}</th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`py-3 px-4 align-top ${className}`}>{children}</td>;
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
        {label}
      </span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

/* ---------- SVG icons ---------- */

function LeftArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function RightArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}
