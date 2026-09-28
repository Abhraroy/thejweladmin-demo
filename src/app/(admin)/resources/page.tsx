"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  deleteCoupon,
  getAllCoupons,
  updateCoupon,
  updateCouponState,
} from "@/app/(admin)/actions/coupons";
import {
  deleteImageResource,
  getAllImageResources,
  saveImageResource,
  type ImageResourceRecord,
  updateImageResource,
} from "@/app/(admin)/actions/resources";
import type { Coupon, CouponDiscountType, CouponType } from "@/types/TypeInterface";
import OptimizedImage from "@/components/OptimizedImage";

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
const SUCCESS_BANNER_CLASS =
  "text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3";

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

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function toDateTimeLocalValue(value: Date) {
  const year = value.getFullYear();
  const month = pad2(value.getMonth() + 1);
  const day = pad2(value.getDate());
  const hours = pad2(value.getHours());
  const minutes = pad2(value.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCouponStatus(coupon: Coupon) {
  const now = new Date();
  const startsAt = new Date(coupon.valid_from);
  const endsAt = new Date(coupon.valid_until);

  if (!coupon.is_active) {
    return { label: "Inactive", tone: "bg-gray-100 text-gray-700" };
  }
  if (!Number.isNaN(startsAt.getTime()) && now < startsAt) {
    return { label: "Scheduled", tone: "bg-indigo-100 text-indigo-700" };
  }
  if (!Number.isNaN(endsAt.getTime()) && now > endsAt) {
    return { label: "Expired", tone: "bg-amber-100 text-amber-700" };
  }
  return { label: "Live", tone: "bg-emerald-100 text-emerald-700" };
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

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/55"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sectionInputRef = useRef<HTMLSelectElement | null>(null);
  const imageEditFileInputRef = useRef<HTMLInputElement | null>(null);

  const [folder, setFolder] = useState<string>("resources");
  const sectionNameOptions = [
    { value: "", label: "Select section" },
    { value: "homepage_hero", label: "Homepage Hero (carousel)" },
    { value: "homepage_image_gallery", label: "Homepage Image Gallery (carousel)" },
    { value: "banner_summer", label: "Banner Summer" },
    { value: "banner_festival", label: "Banner Festival" },
    { value: "banner_seasonal", label: "Banner Seasonal" },
    { value: "marketing_assets", label: "Marketing Assets" },
  ];
  const [sectionName, setSectionName] = useState<string>("");
  const [redirectRoute, setRedirectRoute] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | "saved" | "not_saved">(
    null
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [couponList, setCouponList] = useState<Coupon[]>([]);
  const [isCouponLoading, setIsCouponLoading] = useState(true);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [imageResources, setImageResources] = useState<ImageResourceRecord[]>([]);
  const [isImageResourcesLoading, setIsImageResourcesLoading] = useState(true);
  const [imageResourceError, setImageResourceError] = useState<string | null>(null);
  const [imageResourceSuccess, setImageResourceSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [couponToEdit, setCouponToEdit] = useState<Coupon | null>(null);
  const [couponEditForm, setCouponEditForm] = useState<CouponFormData>(
    buildInitialCouponForm()
  );
  const [isCouponEditSaving, setIsCouponEditSaving] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [isCouponDeleting, setIsCouponDeleting] = useState(false);
  const [imageResourceToEdit, setImageResourceToEdit] =
    useState<ImageResourceRecord | null>(null);
  const [imageEditSection, setImageEditSection] = useState("");
  const [imageEditRedirectRoute, setImageEditRedirectRoute] = useState("");
  const [imageEditFolder, setImageEditFolder] = useState("resources");
  const [imageEditFile, setImageEditFile] = useState<File | null>(null);
  const [imageEditPreviewUrl, setImageEditPreviewUrl] = useState<string | null>(null);
  const [imageEditError, setImageEditError] = useState<string | null>(null);
  const [isImageEditSaving, setIsImageEditSaving] = useState(false);
  const [imageResourceToDelete, setImageResourceToDelete] =
    useState<ImageResourceRecord | null>(null);
  const isAnyModalOpen = Boolean(
    couponToEdit || couponToDelete || imageResourceToEdit || imageResourceToDelete
  );

  const fileMeta = useMemo(() => {
    if (!file) return null;
    return {
      name: file.name,
      type: file.type,
      sizeMb: (file.size / (1024 * 1024)).toFixed(2),
    };
  }, [file]);

  const refreshCoupons = async () => {
    setIsCouponLoading(true);
    setCouponError(null);
    const result = await getAllCoupons();
    if (!result.success) {
      setCouponError(result.error || "Unable to load coupons");
      setCouponList([]);
      setIsCouponLoading(false);
      return;
    }
    setCouponList(result.data ?? []);
    setIsCouponLoading(false);
  };

  const refreshImageResources = async () => {
    setIsImageResourcesLoading(true);
    setImageResourceError(null);
    const result = await getAllImageResources();
    if (!result.success) {
      setImageResourceError(result.error || "Unable to load image resources");
      setImageResources([]);
    } else {
      setImageResources(result.data ?? []);
    }
    setIsImageResourcesLoading(false);
  };

  useEffect(() => {
    refreshCoupons();
    refreshImageResources();
  }, []);

  useEffect(() => {
    if (!isAnyModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAnyModalOpen]);

  const resetSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setRedirectRoute("");
    setError(null);
    setCopied(false);
    setSaveStatus(null);
    setSaveError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openCouponEditModal = (coupon: Coupon) => {
    setCouponToEdit(coupon);
    setCouponEditForm(toCouponFormData(coupon));
    setCouponError(null);
    setCouponSuccess(null);
  };

  const closeCouponEditModal = () => {
    setCouponToEdit(null);
    setCouponEditForm(buildInitialCouponForm());
    setIsCouponEditSaving(false);
  };

  const closeCouponDeleteModal = () => {
    setCouponToDelete(null);
    setIsCouponDeleting(false);
  };

  const openImageEditModal = (resource: ImageResourceRecord) => {
    if (imageEditPreviewUrl) {
      URL.revokeObjectURL(imageEditPreviewUrl);
    }
    setImageResourceToEdit(resource);
    setImageEditSection(resource.section_name ?? "");
    setImageEditRedirectRoute(resource.redirect_route ?? "");
    setImageEditFolder("resources");
    setImageEditFile(null);
    setImageEditPreviewUrl(null);
    setImageEditError(null);
    setImageResourceError(null);
    setImageResourceSuccess(null);
    if (imageEditFileInputRef.current) {
      imageEditFileInputRef.current.value = "";
    }
  };

  const closeImageEditModal = () => {
    setImageResourceToEdit(null);
    setImageEditSection("");
    setImageEditRedirectRoute("");
    setImageEditFolder("resources");
    setImageEditFile(null);
    if (imageEditPreviewUrl) {
      URL.revokeObjectURL(imageEditPreviewUrl);
    }
    setImageEditPreviewUrl(null);
    setImageEditError(null);
    setIsImageEditSaving(false);
    if (imageEditFileInputRef.current) {
      imageEditFileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!isAnyModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (imageResourceToDelete) {
        setImageResourceToDelete(null);
        return;
      }
      if (imageResourceToEdit) {
        closeImageEditModal();
        return;
      }
      if (couponToDelete) {
        closeCouponDeleteModal();
        return;
      }
      if (couponToEdit) {
        closeCouponEditModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    closeCouponDeleteModal,
    closeCouponEditModal,
    closeImageEditModal,
    couponToDelete,
    couponToEdit,
    imageResourceToDelete,
    imageResourceToEdit,
    isAnyModalOpen,
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setUploadedUrl(null);
    setUploadedKey(null);
    setCopied(false);
    setSaveStatus(null);
    setSaveError(null);

    const nextFile = e.target.files?.[0] ?? null;
    if (!nextFile) {
      resetSelection();
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      resetSelection();
      setError("Please select an image file.");
      return;
    }

    if (nextFile.size > MAX_IMAGE_UPLOAD_BYTES) {
      resetSelection();
      setError("Image is too large. Please upload a file under 8MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreview = URL.createObjectURL(nextFile);
    setFile(nextFile);
    setPreviewUrl(nextPreview);
  };

  const uploadResourceImage = async () => {
    if (!file) {
      setError("Please choose an image before uploading.");
      return;
    }

    if (!sectionName.trim()) {
      setError("Please select a section.");
      sectionInputRef.current?.focus();
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadedUrl(null);
    setUploadedKey(null);
    setCopied(false);
    setSaveStatus(null);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (folder.trim()) formData.append("folder", folder.trim());
      formData.append("sectionName", sectionName.trim());

      const res = await fetch("/api/uploadImage", {
        method: "POST",
        body: formData,
      });

      const data: any = await res.json();
      if (!res.ok || !data?.success || !data?.url) {
        throw new Error(data?.error || "Upload failed");
      }

      setUploadedUrl(data.url);
      setUploadedKey(data.key ?? null);

      const result = await saveImageResource({
        image_link: data.url,
        section_name: sectionName.trim(),
        redirect_route: redirectRoute.trim() || undefined,
      });

      if (!result.success) {
        setSaveStatus("not_saved");
        setSaveError(result.error ?? "Failed to save to database");
      } else {
        setSaveStatus("saved");
        await refreshImageResources();
      }
    } catch (err) {
      console.error("Resource upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const copyUrl = async () => {
    if (!uploadedUrl) return;
    try {
      await navigator.clipboard.writeText(uploadedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleCouponEditInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setCouponEditForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setCouponEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    setCouponError(null);
    setCouponSuccess(null);
    setToggleLoadingId(coupon.coupon_id);
    const result = await updateCouponState(coupon.coupon_id, !coupon.is_active);
    if (!result.success) {
      setCouponError(result.error || "Failed to update coupon state");
      setToggleLoadingId(null);
      return;
    }
    setCouponSuccess(
      `Coupon ${coupon.coupon_code} is now ${
        coupon.is_active ? "inactive" : "active"
      }.`
    );
    await refreshCoupons();
    setToggleLoadingId(null);
  };

  const handleUpdateCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!couponToEdit) return;

    setCouponError(null);
    setCouponSuccess(null);

    if (!couponEditForm.coupon_code.trim()) {
      setCouponError("Coupon code is required");
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
        couponEditForm.usage_limit === "" ? null : Number(couponEditForm.usage_limit),
      valid_from: new Date(couponEditForm.valid_from + ":00+05:30").toISOString(),
      valid_until: new Date(couponEditForm.valid_until + ":00+05:30").toISOString(),
      is_active: couponEditForm.is_active,
    });

    if (!result.success) {
      setCouponError(result.error || "Failed to update coupon");
      setIsCouponEditSaving(false);
      return;
    }

    setCouponSuccess(`Coupon ${couponEditForm.coupon_code.trim().toUpperCase()} updated.`);
    await refreshCoupons();
    setIsCouponEditSaving(false);
    closeCouponEditModal();
  };

  const handleDeleteCoupon = async () => {
    if (!couponToDelete) return;

    setCouponError(null);
    setCouponSuccess(null);
    setIsCouponDeleting(true);
    const result = await deleteCoupon(couponToDelete.coupon_id);
    if (!result.success) {
      setCouponError(result.error || "Failed to delete coupon");
      setIsCouponDeleting(false);
      return;
    }

    setCouponSuccess(`Coupon ${couponToDelete.coupon_code} deleted.`);
    await refreshCoupons();
    setIsCouponDeleting(false);
    closeCouponDeleteModal();
  };

  const handleImageEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0] ?? null;

    if (imageEditPreviewUrl) {
      URL.revokeObjectURL(imageEditPreviewUrl);
    }
    setImageEditPreviewUrl(null);
    setImageEditFile(null);
    setImageEditError(null);

    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/")) {
      setImageEditError("Please select an image file.");
      return;
    }

    if (nextFile.size > MAX_IMAGE_UPLOAD_BYTES) {
      setImageEditError("Image is too large. Please upload a file under 8MB.");
      return;
    }

    const nextPreview = URL.createObjectURL(nextFile);
    setImageEditFile(nextFile);
    setImageEditPreviewUrl(nextPreview);
  };

  const handleUpdateImageResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageResourceToEdit) return;

    setImageEditError(null);
    setImageResourceError(null);
    setImageResourceSuccess(null);

    if (!imageEditSection.trim()) {
      setImageEditError("Please select a section.");
      return;
    }

    setIsImageEditSaving(true);

    try {
      let nextImageLink: string | undefined;

      if (imageEditFile) {
        const formData = new FormData();
        formData.append("file", imageEditFile);
        if (imageEditFolder.trim()) formData.append("folder", imageEditFolder.trim());
        formData.append("sectionName", imageEditSection.trim());

        const res = await fetch("/api/uploadImage", {
          method: "POST",
          body: formData,
        });
        const data: any = await res.json();

        if (!res.ok || !data?.success || !data?.url) {
          throw new Error(data?.error || "Upload failed");
        }
        nextImageLink = data.url;
      }

      const result = await updateImageResource({
        id: imageResourceToEdit.id,
        section_name: imageEditSection.trim(),
        redirect_route: imageEditRedirectRoute.trim() || undefined,
        image_link: nextImageLink,
      });

      if (!result.success) {
        setImageEditError(result.error || "Failed to update image resource");
        setIsImageEditSaving(false);
        return;
      }

      setImageResourceSuccess("Image resource updated successfully.");
      await refreshImageResources();
      setIsImageEditSaving(false);
      closeImageEditModal();
    } catch (err) {
      setImageEditError(err instanceof Error ? err.message : "Failed to update image");
      setIsImageEditSaving(false);
    }
  };

  const handleDeleteImageResource = async (resource: ImageResourceRecord) => {
    setImageResourceError(null);
    setImageResourceSuccess(null);
    setDeletingId(resource.id);
    const result = await deleteImageResource(resource.id);
    if (!result.success) {
      setImageResourceError(result.error || "Failed to delete image");
    } else {
      setImageResourceSuccess("Image resource deleted successfully.");
      await refreshImageResources();
    }
    setDeletingId(null);
  };

  const handleConfirmDeleteImageResource = async () => {
    if (!imageResourceToDelete) return;
    await handleDeleteImageResource(imageResourceToDelete);
    setImageResourceToDelete(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-linear-to-b from-slate-50 to-white min-h-full">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm p-5 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Resources
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage media resources and coupons from a single advanced admin
            layout.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                Upload Resource Image
              </h2>
              <span className="rounded-full bg-rose-50 text-rose-700 text-xs px-3 py-1 font-medium">
                Media
              </span>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-800">
                Section name
              </label>
              <select
                ref={sectionInputRef}
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-200 bg-white"
              >
                {sectionNameOptions.map((opt) => (
                  <option key={opt.value || "empty"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Saved in Supabase under `section_name`.
              </p>

              <label className="block text-sm font-semibold text-slate-800 mt-4">
                Redirect route (optional)
              </label>
              <input
                value={redirectRoute}
                onChange={(e) => setRedirectRoute(e.target.value)}
                placeholder="e.g. /products/sale"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-200"
              />
              <p className="text-xs text-slate-500">
                Saved in Supabase under `redirect_route`.
              </p>

              <label className="block text-sm font-semibold text-slate-800 mt-4">
                Folder (optional)
              </label>
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="e.g. resources/home"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-200"
              />

              <label className="block text-sm font-semibold text-slate-800 mt-4">
                Image
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50"
                >
                  Choose image
                </button>
                <span className="text-xs text-slate-500">
                  {fileMeta ? fileMeta.name : "No file selected"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-slate-500">Max size: 8MB.</p>

              {fileMeta && (
                <div className="text-xs text-slate-600 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div>
                    <span className="font-semibold">Selected:</span>{" "}
                    {fileMeta.name}
                  </div>
                  <div>
                    <span className="font-semibold">Type:</span> {fileMeta.type}
                  </div>
                  <div>
                    <span className="font-semibold">Size:</span> {fileMeta.sizeMb}
                    MB
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={uploadResourceImage}
                  disabled={isUploading || !file || !sectionName.trim()}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </button>
                <button
                  type="button"
                  onClick={resetSelection}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>

              {error && (
                <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>

            <div className="space-y-3 mt-5">
              <div className="text-sm font-semibold text-slate-800">Preview</div>
              <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden aspect-16/10 flex items-center justify-center relative">
                {previewUrl ? (
                  <OptimizedImage
                    src={previewUrl}
                    alt="Preview"
                    fill
                    objectFit="contain"
                  />
                ) : (
                  <div className="text-sm text-slate-500">
                    Select an image to preview
                  </div>
                )}
              </div>

              {uploadedUrl && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white">
                  <div className="text-sm font-semibold text-slate-900">
                    Uploaded
                  </div>
                  <div className="mt-2 text-xs text-slate-600 break-all">
                    <span className="font-semibold">Section:</span>{" "}
                    {sectionName.trim()}
                  </div>
                  {redirectRoute.trim() && (
                    <div className="mt-2 text-xs text-slate-600 break-all">
                      <span className="font-semibold">Redirect route:</span>{" "}
                      {redirectRoute.trim()}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-slate-600 break-all">
                    <span className="font-semibold">URL:</span> {uploadedUrl}
                  </div>
                  {uploadedKey && (
                    <div className="mt-1 text-xs text-slate-600 break-all">
                      <span className="font-semibold">Key:</span> {uploadedKey}
                    </div>
                  )}

                  {saveStatus && (
                    <div
                      className={[
                        "mt-3 text-sm rounded-lg p-3 border",
                        saveStatus === "saved"
                          ? "bg-green-50 text-green-800 border-green-200"
                          : "bg-amber-50 text-amber-900 border-amber-200",
                      ].join(" ")}
                    >
                      {saveStatus === "saved" ? (
                        <>Saved to Supabase (`image_resources`).</>
                      ) : (
                        <>
                          Uploaded to Cloudflare, but not saved to Supabase.
                          {saveError ? (
                            <div className="mt-1 text-xs break-all">
                              <span className="font-semibold">Reason:</span>{" "}
                              {saveError}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={copyUrl}
                      className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50"
                    >
                      {copied ? "Copied!" : "Copy URL"}
                    </button>
                    <a
                      href={uploadedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50"
                    >
                      Open
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Uploaded Image Resources
                </h3>
                <button
                  type="button"
                  onClick={refreshImageResources}
                  disabled={isImageResourcesLoading}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Refresh
                </button>
              </div>

              {imageResourceError && (
                <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {imageResourceError}
                </div>
              )}
              {imageResourceSuccess && (
                <div className={`mt-2 ${SUCCESS_BANNER_CLASS}`}>
                  {imageResourceSuccess}
                </div>
              )}

              {isImageResourcesLoading ? (
                <div className="mt-3 text-sm text-slate-500">
                  Loading image resources...
                </div>
              ) : imageResources.length === 0 ? (
                <div className="mt-3 text-sm text-slate-500">
                  No image resources uploaded yet.
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-auto pr-1">
                  {imageResources.map((resource) => (
                    <article
                      key={resource.id}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60"
                    >
                      <div className="aspect-video bg-slate-100 relative">
                        {resource.image_link ? (
                          <OptimizedImage
                            src={resource.image_link}
                            alt={resource.section_name || "Resource"}
                            preset="card"
                            fill
                            objectFit="cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {resource.section_name || "—"}
                        </div>
                        {resource.redirect_route && (
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            → {resource.redirect_route}
                          </div>
                        )}
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openImageEditModal(resource)}
                            className="px-2 py-1 rounded-md border border-slate-300 text-slate-800 text-[11px] font-semibold hover:bg-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageResourceToDelete(resource)}
                            disabled={deletingId === resource.id}
                            className="px-2 py-1 rounded-md border border-red-300 text-red-700 text-[11px] font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === resource.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                Coupon Management
              </h2>
              <span className="rounded-full bg-indigo-50 text-indigo-700 text-xs px-3 py-1 font-medium">
                Coupons
              </span>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Existing Coupons
                </h3>
                <button
                  type="button"
                  onClick={refreshCoupons}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>

              {isCouponLoading ? (
                <div className="mt-3 text-sm text-slate-500">Loading coupons...</div>
              ) : couponList.length === 0 ? (
                <div className="mt-3 text-sm text-slate-500">
                  No coupons available yet.
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 max-h-130 overflow-auto pr-1">
                  {couponList.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    return (
                      <article
                        key={coupon.coupon_id}
                        className="border border-slate-200 rounded-xl p-4 bg-slate-50/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm sm:text-base font-semibold text-slate-900">
                                {coupon.coupon_code}
                              </h4>
                              {coupon.coupon_type && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                  {coupon.coupon_type}
                                </span>
                              )}
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${status.tone}`}
                              >
                                {status.label}
                              </span>
                            </div>
                            {coupon.description ? (
                              <p className="text-xs text-slate-600 mt-1">
                                {coupon.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => openCouponEditModal(coupon)}
                              className="px-3 py-1.5 rounded-md border border-indigo-300 text-indigo-700 text-xs font-semibold hover:bg-indigo-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setCouponToDelete(coupon)}
                              className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCoupon(coupon)}
                              disabled={toggleLoadingId === coupon.coupon_id}
                              className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {toggleLoadingId === coupon.coupon_id
                                ? "Updating..."
                                : coupon.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                          <div>
                            <span className="font-semibold">Discount:</span>{" "}
                            {coupon.discount_value}{" "}
                            {coupon.discount_type === "percentage" ? "%" : "fixed"}
                          </div>
                          <div>
                            <span className="font-semibold">Min purchase:</span>{" "}
                            {coupon.min_purchase_amount ?? 0}
                          </div>
                          <div>
                            <span className="font-semibold">Max discount:</span>{" "}
                            {coupon.max_discount_amount ?? "N/A"}
                          </div>
                          <div>
                            <span className="font-semibold">Usage:</span>{" "}
                            {coupon.usage_count ?? 0}
                            {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}
                          </div>
                          <div>
                            <span className="font-semibold">From:</span>{" "}
                            {formatDate(coupon.valid_from)}
                          </div>
                          <div>
                            <span className="font-semibold">Until:</span>{" "}
                            {formatDate(coupon.valid_until)}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {couponToEdit && (
        <ModalShell
          title={`Edit coupon ${couponToEdit.coupon_code}`}
          description="Update coupon details and save changes."
          onClose={closeCouponEditModal}
        >
          <form onSubmit={handleUpdateCoupon} className="space-y-4">
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

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeCouponEditModal}
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
        </ModalShell>
      )}

      {couponToDelete && (
        <ModalShell
          title={`Delete coupon ${couponToDelete.coupon_code}?`}
          description="This permanently removes the coupon from the database."
          onClose={closeCouponDeleteModal}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete this coupon?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCouponDeleteModal}
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
                {isCouponDeleting ? "Deleting..." : "Delete coupon"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {imageResourceToEdit && (
        <ModalShell
          title={`Edit image resource #${imageResourceToEdit.id}`}
          description="Update section, redirect route, or replace the image."
          onClose={closeImageEditModal}
        >
          <form onSubmit={handleUpdateImageResource} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Section name
              </label>
              <select
                value={imageEditSection}
                onChange={(e) => setImageEditSection(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-200 bg-white"
              >
                {sectionNameOptions.map((opt) => (
                  <option key={`edit-${opt.value || "empty"}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Redirect route (optional)
              </label>
              <input
                value={imageEditRedirectRoute}
                onChange={(e) => setImageEditRedirectRoute(e.target.value)}
                placeholder="e.g. /products/sale"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Folder (optional for new upload)
              </label>
              <input
                value={imageEditFolder}
                onChange={(e) => setImageEditFolder(e.target.value)}
                placeholder="e.g. resources/home"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Replace image (optional)
              </label>
              <input
                ref={imageEditFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageEditFileChange}
                className="block w-full text-sm text-slate-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-slate-300 file:bg-white file:text-slate-700 file:font-semibold"
              />
              {imageEditPreviewUrl ? (
                <div className="mt-3">
                  <div className="text-xs text-slate-500 mb-1">New image preview</div>
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <OptimizedImage
                      src={imageEditPreviewUrl}
                      alt="New image preview"
                      fill
                      objectFit="cover"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {imageEditError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                {imageEditError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeImageEditModal}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isImageEditSaving}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImageEditSaving ? "Saving..." : "Save image resource"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {imageResourceToDelete && (
        <ModalShell
          title={`Delete image resource #${imageResourceToDelete.id}?`}
          description="This removes the image resource record and attempts to clean up cloud storage."
          onClose={() => setImageResourceToDelete(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete this image resource?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImageResourceToDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteImageResource}
                disabled={deletingId === imageResourceToDelete.id}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === imageResourceToDelete.id
                  ? "Deleting..."
                  : "Delete image"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}