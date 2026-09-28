"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pen, Trash2 } from "lucide-react";
import {
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  updateCoupon,
  isCouponExpired,
} from "@/app/(admin)/actions/coupons";
import { formatIstDateTime } from "@/lib/datetime";
import type { Coupon, CouponDiscountType, CouponType } from "@/types/TypeInterface";

const SUCCESS_BANNER_CLASS =
  "text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3";
const IST_OFFSET = "+05:30";

type CouponFormData = {
  coupon_code: string;
  coupon_type: CouponType;
  description: string;
  discount_type: CouponDiscountType;
  discount_value: string;
  min_purchase_amount: string;
  max_discount_amount: string;
  usage_limit: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
};

function toDateTimeLocalIST(value: Date): string {
  const s = value.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
  return s.slice(0, 16).replace(" ", "T");
}

function buildInitialCouponForm(): CouponFormData {
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    coupon_code: "",
    coupon_type: "PREPAID",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    min_purchase_amount: "0",
    max_discount_amount: "",
    usage_limit: "",
    valid_from: toDateTimeLocalIST(now),
    valid_until: toDateTimeLocalIST(weekLater),
    is_active: true,
  };
}

function toCouponFormData(coupon: Coupon): CouponFormData {
  return {
    coupon_code: coupon.coupon_code ?? "",
    coupon_type: coupon.coupon_type ?? "PREPAID",
    description: coupon.description ?? "",
    discount_type: coupon.discount_type ?? "percentage",
    discount_value: String(coupon.discount_value ?? ""),
    min_purchase_amount: String(coupon.min_purchase_amount ?? 0),
    max_discount_amount:
      coupon.max_discount_amount === null || coupon.max_discount_amount === undefined
        ? ""
        : String(coupon.max_discount_amount),
    usage_limit:
      coupon.usage_limit === null || coupon.usage_limit === undefined
        ? ""
        : String(coupon.usage_limit),
    valid_from: toDateTimeLocalIST(new Date(coupon.valid_from)),
    valid_until: toDateTimeLocalIST(new Date(coupon.valid_until)),
    is_active: Boolean(coupon.is_active),
  };
}

export default function CouponsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [couponForm, setCouponForm] = useState<CouponFormData>(
    buildInitialCouponForm(),
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isCouponSaving, setIsCouponSaving] = useState(false);
  const [couponList, setCouponList] = useState<Coupon[]>([]);
  const [isCouponLoading, setIsCouponLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [expiredMap, setExpiredMap] = useState<Record<string, boolean>>({});
  const [couponToEdit, setCouponToEdit] = useState<Coupon | null>(null);
  const [couponEditForm, setCouponEditForm] = useState<CouponFormData>(
    buildInitialCouponForm(),
  );
  const [isCouponEditSaving, setIsCouponEditSaving] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [isCouponDeleting, setIsCouponDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshCoupons = useCallback(async () => {
    setIsCouponLoading(true);
    setListError(null);
    const result = await getAllCoupons();
    if (!result.success) {
      setListError(result.error || "Unable to load coupons");
      setCouponList([]);
      setExpiredMap({});
      setIsCouponLoading(false);
      return;
    }
    const coupons = result.data ?? [];
    setCouponList(coupons);

    const expiryResults = await Promise.all(
      coupons.map(async (coupon) => ({
        id: coupon.coupon_id,
        expired: await isCouponExpired(coupon),
      })),
    );
    setExpiredMap(
      Object.fromEntries(expiryResults.map((item) => [item.id, item.expired])),
    );
    setIsCouponLoading(false);
  }, []);

  useEffect(() => {
    refreshCoupons();
  }, [refreshCoupons]);

  const activeCouponCount = useMemo(
    () =>
      couponList.filter(
        (coupon) => coupon.is_active && !expiredMap[coupon.coupon_id],
      ).length,
    [couponList, expiredMap],
  );

  const activeCoupons = useMemo(
    () =>
      couponList.filter(
        (coupon) => coupon.is_active && !expiredMap[coupon.coupon_id],
      ),
    [couponList, expiredMap],
  );

  const inactiveCoupons = useMemo(
    () =>
      couponList.filter(
        (coupon) => !coupon.is_active || expiredMap[coupon.coupon_id],
      ),
    [couponList, expiredMap],
  );

  const renderCouponCard = (coupon: Coupon) => {
    const expired = expiredMap[coupon.coupon_id] ?? false;
    return (
      <div
        key={coupon.coupon_id}
        className={`relative border-4 border-dashed border-black rounded-xl p-4 
                  w-[18%]
                  flex flex-col gap-2
                  ${expired ? "opacity-50" : ""}`}
      >
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEditModal(coupon)}
            className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:cursor-pointer"
            aria-label={`Edit ${coupon.coupon_code}`}
          >
            <Pen className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setCouponToDelete(coupon);
            }}
            className="p-1.5 rounded-md border border-red-300 bg-white text-red-600 hover:bg-red-50 hover:cursor-pointer"
            aria-label={`Delete ${coupon.coupon_code}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 pr-16">
          <div className="flex items-center gap-2">
            <p className="text-[3rem] font-bold text-slate-900">
              {coupon.discount_value}
              {coupon.discount_type === "percentage" ? "%" : "₹"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-[1.2rem] font-bold text-slate-900">
              {coupon.coupon_code}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-[0.8rem] font-bold text-slate-900">
              {formatIstDateTime(coupon.valid_from)} -{" "}
              {formatIstDateTime(coupon.valid_until)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const handleCouponInput = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setCouponForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setCouponForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCouponEditInput = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setCouponEditForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setCouponEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const openEditModal = (coupon: Coupon) => {
    setActionError(null);
    setCouponToEdit(coupon);
    setCouponEditForm(toCouponFormData(coupon));
  };

  const closeEditModal = () => {
    setCouponToEdit(null);
    setCouponEditForm(buildInitialCouponForm());
    setIsCouponEditSaving(false);
    setActionError(null);
  };

  const closeDeleteModal = () => {
    setCouponToDelete(null);
    setIsCouponDeleting(false);
    setActionError(null);
  };

  const resetCouponForm = () => {
    setCouponForm(buildInitialCouponForm());
    setCouponError(null);
    setCouponSuccess(null);
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    resetCouponForm();
  };

  const handleCreateCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);

    if (!couponForm.coupon_code.trim()) {
      setCouponError("Coupon code is required");
      return;
    }

    setIsCouponSaving(true);
    const result = await createCoupon({
      coupon_code: couponForm.coupon_code,
      coupon_type: couponForm.coupon_type,
      description: couponForm.description || undefined,
      discount_type: couponForm.discount_type,
      discount_value: Number(couponForm.discount_value || 0),
      min_purchase_amount: Number(couponForm.min_purchase_amount || 0),
      max_discount_amount:
        couponForm.max_discount_amount === ""
          ? null
          : Number(couponForm.max_discount_amount),
      usage_limit:
        couponForm.usage_limit === "" ? null : Number(couponForm.usage_limit),
      valid_from: new Date(`${couponForm.valid_from}:00${IST_OFFSET}`).toISOString(),
      valid_until: new Date(`${couponForm.valid_until}:00${IST_OFFSET}`).toISOString(),
      is_active: couponForm.is_active,
    });

    if (!result.success) {
      setCouponError(result.error || "Failed to create coupon");
      setIsCouponSaving(false);
      return;
    }

    setCouponSuccess("Coupon created successfully.");
    resetCouponForm();
    setIsCouponSaving(false);
    setShowCreateForm(false);
    await refreshCoupons();
  };

  const handleUpdateCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!couponToEdit) return;

    setActionError(null);

    if (!couponEditForm.coupon_code.trim()) {
      setActionError("Coupon code is required");
      return;
    }

    setIsCouponEditSaving(true);
    const result = await updateCoupon(couponToEdit.coupon_id, {
      coupon_code: couponEditForm.coupon_code,
      coupon_type: couponEditForm.coupon_type,
      description: couponEditForm.description || undefined,
      discount_type: couponEditForm.discount_type,
      discount_value: Number(couponEditForm.discount_value || 0),
      min_purchase_amount: Number(couponEditForm.min_purchase_amount || 0),
      max_discount_amount:
        couponEditForm.max_discount_amount === ""
          ? null
          : Number(couponEditForm.max_discount_amount),
      usage_limit:
        couponEditForm.usage_limit === ""
          ? null
          : Number(couponEditForm.usage_limit),
      valid_from: new Date(
        `${couponEditForm.valid_from}:00${IST_OFFSET}`,
      ).toISOString(),
      valid_until: new Date(
        `${couponEditForm.valid_until}:00${IST_OFFSET}`,
      ).toISOString(),
      is_active: couponEditForm.is_active,
    });

    if (!result.success) {
      setActionError(result.error || "Failed to update coupon");
      setIsCouponEditSaving(false);
      return;
    }

    setCouponSuccess(
      `Coupon ${couponEditForm.coupon_code.trim().toUpperCase()} updated.`,
    );
    setIsCouponEditSaving(false);
    closeEditModal();
    await refreshCoupons();
  };

  const handleDeleteCoupon = async () => {
    if (!couponToDelete) return;

    setActionError(null);
    setIsCouponDeleting(true);
    const result = await deleteCoupon(couponToDelete.coupon_id);

    if (!result.success) {
      setActionError(result.error || "Failed to delete coupon");
      setIsCouponDeleting(false);
      return;
    }

    setCouponSuccess(`Coupon ${couponToDelete.coupon_code} deleted.`);
    setIsCouponDeleting(false);
    closeDeleteModal();
    await refreshCoupons();
  };

  return (
    <>
      <div className="flex flex-col gap-4 p-6">
        <div className="border-b border-black pb-4">
          <h1 className="text-2xl font-bold">Coupons</h1>
          <p className="text-sm text-gray-500">Manage your coupons here</p>
        </div>
        <div className="flex justify-between pr-4">
          <div
            className="border border-black py-0.5 px-2 w-fit rounded-full
            bg-green-300 text-black flex items-center justify-center "
          >
            <p className="text-[0.8rem] font-bold text-black">
              Active Coupons: {activeCouponCount}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => {
                setCouponError(null);
                setCouponSuccess(null);
                setShowCreateForm(true);
              }}
              className="border border-black p-2 w-fit rounded-lg
                bg-red-600 text-black flex items-center justify-center
                hover:cursor-pointer
                "
            >
              <p className="text-[1rem] font-bold text-black">Create Coupon</p>
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 bg-white">
          {couponSuccess && !showCreateForm && !couponToEdit && !couponToDelete ? (
            <div className={`mb-3 ${SUCCESS_BANNER_CLASS}`}>{couponSuccess}</div>
          ) : null}
          {actionError && !couponToEdit && !couponToDelete ? (
            <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {actionError}
            </div>
          ) : null}

          {isCouponLoading ? (
            <div className="mt-3 text-sm text-slate-500">Loading coupons...</div>
          ) : listError ? (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {listError}
            </div>
          ) : couponList.length === 0 ? (
            <div className="mt-3 text-sm text-slate-500">
              No coupons available yet.
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">
                  Active Coupons ({activeCouponCount})
                </h2>
                {activeCoupons.length === 0 ? (
                  <div className="text-sm text-slate-500">No active coupons.</div>
                ) : (
                  <div className="flex flex-row gap-2 flex-wrap p-2">
                    {activeCoupons.map((coupon) => renderCouponCard(coupon))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">
                  Inactive Coupons ({inactiveCoupons.length})
                </h2>
                {inactiveCoupons.length === 0 ? (
                  <div className="text-sm text-slate-500">No inactive coupons.</div>
                ) : (
                  <div className="flex flex-row gap-2 flex-wrap p-2">
                    {inactiveCoupons.map((coupon) => renderCouponCard(coupon))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {couponToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/55"
              onClick={closeEditModal}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Edit coupon {couponToEdit.coupon_code}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Update coupon details and save changes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleUpdateCoupon} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Coupon code
                    </label>
                    <input
                      name="coupon_code"
                      value={couponEditForm.coupon_code}
                      onChange={handleCouponEditInput}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Coupon type
                    </label>
                    <select
                      name="coupon_type"
                      value={couponEditForm.coupon_type}
                      onChange={handleCouponEditInput}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    >
                      <option value="COD">COD</option>
                      <option value="PREPAID">PREPAID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Discount type
                    </label>
                    <select
                      name="discount_type"
                      value={couponEditForm.discount_type}
                      onChange={handleCouponEditInput}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Discount value
                    </label>
                    <input
                      name="discount_value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={couponEditForm.discount_value}
                      onChange={handleCouponEditInput}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Min purchase amount
                    </label>
                    <input
                      name="min_purchase_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={couponEditForm.min_purchase_amount}
                      onChange={handleCouponEditInput}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Max discount amount (optional)
                    </label>
                    <input
                      name="max_discount_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={couponEditForm.max_discount_amount}
                      onChange={handleCouponEditInput}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Usage limit (optional)
                    </label>
                    <input
                      name="usage_limit"
                      type="number"
                      min="0"
                      step="1"
                      value={couponEditForm.usage_limit}
                      onChange={handleCouponEditInput}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Valid from (IST)
                    </label>
                    <input
                      name="valid_from"
                      type="datetime-local"
                      value={couponEditForm.valid_from}
                      onChange={handleCouponEditInput}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Valid until (IST)
                    </label>
                    <input
                      name="valid_until"
                      type="datetime-local"
                      value={couponEditForm.valid_until}
                      onChange={handleCouponEditInput}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    value={couponEditForm.description}
                    onChange={handleCouponEditInput}
                    placeholder="Optional coupon description"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={couponEditForm.is_active}
                    onChange={handleCouponEditInput}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  Coupon active
                </label>

                {actionError ? (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    {actionError}
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCouponEditSaving}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCouponEditSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {couponToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/55"
              onClick={closeDeleteModal}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Delete coupon {couponToDelete.coupon_code}?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                This permanently removes the coupon from the database.
              </p>
              {actionError ? (
                <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {actionError}
                </div>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCoupon}
                  disabled={isCouponDeleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCouponDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          {showCreateForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/55"
                onClick={closeCreateForm}
                aria-hidden="true"
              />
              <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Create Coupon
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Add a new discount coupon for your store.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreateForm}
                    className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleCreateCoupon} className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Coupon code
                      </label>
                      <input
                        name="coupon_code"
                        value={couponForm.coupon_code}
                        onChange={handleCouponInput}
                        placeholder="e.g. FESTIVE10"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Coupon type
                      </label>
                      <select
                        name="coupon_type"
                        value={couponForm.coupon_type}
                        onChange={handleCouponInput}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      >
                        <option value="COD">COD</option>
                        <option value="PREPAID">PREPAID</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Discount type
                      </label>
                      <select
                        name="discount_type"
                        value={couponForm.discount_type}
                        onChange={handleCouponInput}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Discount value
                      </label>
                      <input
                        name="discount_value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={couponForm.discount_value}
                        onChange={handleCouponInput}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Min purchase amount
                      </label>
                      <input
                        name="min_purchase_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={couponForm.min_purchase_amount}
                        onChange={handleCouponInput}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Max discount amount (optional)
                      </label>
                      <input
                        name="max_discount_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={couponForm.max_discount_amount}
                        onChange={handleCouponInput}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Usage limit (optional)
                      </label>
                      <input
                        name="usage_limit"
                        type="number"
                        min="0"
                        step="1"
                        value={couponForm.usage_limit}
                        onChange={handleCouponInput}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Valid from (IST)
                      </label>
                      <input
                        name="valid_from"
                        type="datetime-local"
                        value={couponForm.valid_from}
                        onChange={handleCouponInput}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Valid until (IST)
                      </label>
                      <input
                        name="valid_until"
                        type="datetime-local"
                        value={couponForm.valid_until}
                        onChange={handleCouponInput}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      value={couponForm.description}
                      onChange={handleCouponInput}
                      placeholder="Optional coupon description"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={couponForm.is_active}
                      onChange={handleCouponInput}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    Active after creation
                  </label>

                  {couponError && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                      {couponError}
                    </div>
                  )}
                  {couponSuccess && (
                    <div className={SUCCESS_BANNER_CLASS}>{couponSuccess}</div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isCouponSaving}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCouponSaving ? "Creating..." : "Create Coupon"}
                    </button>
                    <button
                      type="button"
                      onClick={resetCouponForm}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
