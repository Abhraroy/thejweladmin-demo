"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Trash2, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import OptimizedImage from "@/components/OptimizedImage";
import useAdminStore from "@/zustandStore/AdminZustandStore";
import {
  deleteProduct,
  updateProduct,
  saveProductImageUrls,
  deleteProductImage,
} from "@/app/(admin)/actions/Product";
import { getCategories, getSubCategories } from "@/app/(admin)/actions/categories";
import { ADMIN_SELECTABLE_TAGS } from "@/lib/product-tags";
import {
  getActiveStylesForSelect,
  getActiveOccasionsForSelect,
  type StyleSelectOption,
  type OccasionSelectOption,
} from "@/app/(admin)/actions";
import { resolveOccasionId, resolveStyleId } from "@/lib/product-style-occasion";
import {
  getActiveCollectionsForSelect,
  type CollectionSelectOption,
} from "@/app/(admin)/collection/action";

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;

interface ProductDetailPanelProps {
  products: any[];
}

type FormData = {
  product_name: string;
  sku: string;
  category_id: string;
  subcategory_id: string;
  description: string;
  base_price: string;
  final_price: string;
  discount_percentage: string;
  stock_quantity: string;
  weight_grams: string;
  size: string[];
  tags: string[];
  occasion_id: string;
  style_id: string;
  collection_ids: string[];
  listed_status: boolean;
  home_visibility: boolean;
};

function getProductCollectionIds(product: any): string[] {
  if (!Array.isArray(product?.product_collections)) return [];
  return product.product_collections
    .map((pc: { collection_id?: string }) => pc.collection_id)
    .filter(Boolean)
    .map(String);
}

function calculateDiscountPercentage(base: number, final: number): number {
  if (base <= 0) return 0;
  const discount = ((base - final) / base) * 100;
  if (!Number.isFinite(discount)) return 0;
  return Math.max(0, Math.round(discount));
}

function safeArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
}

function getThumbnailUrl(product: any): string | null {
  return typeof product?.thumbnail_image === "string" && product.thumbnail_image.length > 0
    ? product.thumbnail_image
    : null;
}

function buildFormFromProduct(
  product: any,
  styles: StyleSelectOption[] = [],
  occasions: OccasionSelectOption[] = [],
): FormData {
  const basePrice = Number(product.base_price ?? 0);
  const finalPrice = Number(product.final_price ?? 0);
  return {
    product_name: product.product_name ?? "",
    sku: product.sku ?? "",
    category_id: product.category_id ?? "",
    subcategory_id: product.subcategory_id ?? "",
    description: product.description ?? "",
    base_price: String(product.base_price ?? ""),
    final_price: String(product.final_price ?? ""),
    discount_percentage: String(
      product.discount_percentage ?? calculateDiscountPercentage(basePrice, finalPrice)
    ),
    stock_quantity: String(product.stock_quantity ?? ""),
    weight_grams: String(product.weight_grams ?? ""),
    size: safeArray(product.size),
    tags: safeArray(product.tags),
    occasion_id: resolveOccasionId(product, occasions),
    style_id: resolveStyleId(product, styles),
    collection_ids: getProductCollectionIds(product),
    listed_status: product.listed_status ?? true,
    home_visibility: product.home_visibility ?? true,
  };
}

function buildProductImages(
  product: any,
  thumbnailUrl: string | null
): { id: string; url: string; isThumbnail: boolean }[] {
  const images: { id: string; url: string; isThumbnail: boolean }[] = [
    {
      id: "thumbnail",
      url: thumbnailUrl ?? "",
      isThumbnail: true,
    },
  ];

  if (Array.isArray(product.product_images)) {
    product.product_images.forEach((img: any, idx: number) => {
      if (img?.image_url && img.image_url !== thumbnailUrl) {
        images.push({
          id: img.image_id ?? `img-${idx}`,
          url: img.image_url,
          isThumbnail: false,
        });
      }
    });
  }

  return images;
}

function formsEqual(a: FormData, b: FormData): boolean {
  return (
    a.product_name === b.product_name &&
    a.sku === b.sku &&
    a.category_id === b.category_id &&
    a.subcategory_id === b.subcategory_id &&
    a.description === b.description &&
    a.base_price === b.base_price &&
    a.final_price === b.final_price &&
    a.discount_percentage === b.discount_percentage &&
    a.stock_quantity === b.stock_quantity &&
    a.weight_grams === b.weight_grams &&
    a.occasion_id === b.occasion_id &&
    a.style_id === b.style_id &&
    a.listed_status === b.listed_status &&
    a.home_visibility === b.home_visibility &&
    JSON.stringify(a.size) === JSON.stringify(b.size) &&
    JSON.stringify(a.tags) === JSON.stringify(b.tags) &&
    JSON.stringify([...a.collection_ids].sort()) ===
      JSON.stringify([...b.collection_ids].sort())
  );
}

export default function ProductDetailPanel({ products }: ProductDetailPanelProps) {
  const router = useRouter();
  const { selectedProduct, setSelectedProduct, setEditingProduct } = useAdminStore();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    product_name: "",
    sku: "",
    category_id: "",
    subcategory_id: "",
    description: "",
    base_price: "",
    final_price: "",
    discount_percentage: "0",
    stock_quantity: "",
    weight_grams: "",
    size: [],
    tags: [],
    occasion_id: "",
    style_id: "",
    collection_ids: [],
    listed_status: true,
    home_visibility: true,
  });
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [subCategoriesList, setSubCategoriesList] = useState<any[]>([]);
  const [collectionsList, setCollectionsList] = useState<CollectionSelectOption[]>([]);
  const [stylesList, setStylesList] = useState<StyleSelectOption[]>([]);
  const [occasionsList, setOccasionsList] = useState<OccasionSelectOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const isDirtyRef = useRef(false);

  const resizeDescription = useCallback(() => {
    const textarea = descriptionRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const fetchSubCategories = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      setSubCategoriesList([]);
      return;
    }
    const result = await getSubCategories(categoryId);
    if (result.success && result.data) {
      setSubCategoriesList(result.data);
    } else {
      setSubCategoriesList([]);
    }
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const result = await getCategories();
      if (result.success && result.data) {
        setCategoriesList(result.data);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchCollections = async () => {
      const result = await getActiveCollectionsForSelect();
      if (result.success && result.data) {
        setCollectionsList(result.data);
      }
    };
    fetchCollections();
  }, []);

  useEffect(() => {
    const fetchStyleOccasionOptions = async () => {
      const [stylesResult, occasionsResult] = await Promise.all([
        getActiveStylesForSelect(),
        getActiveOccasionsForSelect(),
      ]);

      if (stylesResult.success && stylesResult.data) {
        setStylesList(stylesResult.data);
      }

      if (occasionsResult.success && occasionsResult.data) {
        setOccasionsList(occasionsResult.data);
      }
    };
    fetchStyleOccasionOptions();
  }, []);

  const resetForm = useCallback(
    (product: any) => {
      setFormData(buildFormFromProduct(product, stylesList, occasionsList));
      if (product.category_id) {
        fetchSubCategories(product.category_id);
      } else {
        setSubCategoriesList([]);
      }
    },
    [fetchSubCategories, stylesList, occasionsList]
  );

  useEffect(() => {
    setActiveImageIndex(0);
    if (selectedProduct) {
      resetForm(selectedProduct);
    }
  }, [selectedProduct?.product_id, resetForm]);

  const isDirty = useMemo(() => {
    if (!selectedProduct) return false;
    const original = buildFormFromProduct(selectedProduct, stylesList, occasionsList);
    return !formsEqual(formData, original);
  }, [formData, selectedProduct, stylesList, occasionsList]);

  const selectedCategoryName = categoriesList.find(
    (cat) => cat.category_id === formData.category_id
  )?.category_name;
  const isBangleCategory = (selectedCategoryName ?? "").toLowerCase().trim().includes("bangle");

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    resizeDescription();
  }, [formData.description, resizeDescription]);

  useEffect(() => {
    if (!isBangleCategory && formData.size.length > 0) {
      setFormData((prev) => ({ ...prev, size: [] }));
    }
  }, [isBangleCategory, formData.size.length]);

  useEffect(() => {
    if (!selectedProduct?.product_id) return;
    const fresh = products.find((p) => p.product_id === selectedProduct.product_id);
    if (!fresh) return;

    setSelectedProduct(fresh);

    if (!isDirtyRef.current) {
      resetForm(fresh);
    }
  }, [products, selectedProduct?.product_id, resetForm, setSelectedProduct]);

  if (!selectedProduct) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-80 text-center px-6">
        <p className="text-gray-500 text-sm">
          Select a product from the catalogue to view details.
        </p>
      </div>
    );
  }

  const productImages = buildProductImages(selectedProduct, getThumbnailUrl(selectedProduct));
  const activeEntry = productImages[activeImageIndex];
  const activeImage = activeEntry?.url ?? "";

  const buildSavePayload = () => ({
    ...selectedProduct,
    product_name: formData.product_name.trim(),
    sku: formData.sku.trim(),
    category_id: formData.category_id,
    subcategory_id: formData.subcategory_id || null,
    description: formData.description,
    base_price: Number(formData.base_price) || 0,
    final_price: Number(formData.final_price) || 0,
    discount_percentage: Number(formData.discount_percentage) || 0,
    stock_quantity: Number(formData.stock_quantity) || 0,
    weight_grams: Number(formData.weight_grams) || 0,
    size: formData.size,
    tags: formData.tags,
    occasion_id: formData.occasion_id || null,
    style_id: formData.style_id || null,
    collection_ids: formData.collection_ids,
    listed_status: formData.listed_status,
    home_visibility: formData.home_visibility,
    thumbnail_image: selectedProduct.thumbnail_image ?? null,
  });

  const handleDeleteProduct = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this product? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await deleteProduct(selectedProduct.product_id);
      if (result?.success) {
        setSelectedProduct(null);
        setEditingProduct(null);
        router.refresh();
      } else {
        alert(`Failed to delete product: ${result?.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An unexpected error occurred while deleting the product.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDiscard = () => {
    resetForm(selectedProduct);
  };

  const handleSave = async () => {
    if (!isDirty) return;

    try {
      setIsSaving(true);
      const result = await updateProduct(selectedProduct.product_id, buildSavePayload());

      if (result?.success) {
        isDirtyRef.current = false;
        router.refresh();
      } else {
        alert(`Failed to save product: ${result?.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("An unexpected error occurred while saving the product.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!imageId || imageId === "thumbnail" || imageId.startsWith("img-")) {
      return;
    }

    if (!confirm("Are you sure you want to delete this gallery image?")) {
      return;
    }

    try {
      setDeletingImageId(imageId);
      const result = await deleteProductImage(imageId);

      if (result?.success) {
        const deletedIndex = productImages.findIndex((img) => img.id === imageId);
        const remaining = productImages.filter((img) => img.id !== imageId);
        if (remaining.length === 0) {
          setActiveImageIndex(0);
        } else if (deletedIndex <= activeImageIndex) {
          setActiveImageIndex(Math.max(0, activeImageIndex - 1));
        }
        router.refresh();
      } else {
        alert(`Failed to delete image: ${result?.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Delete image error:", error);
      alert("An unexpected error occurred while deleting the image.");
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      alert("Image is too large. Please upload a file under 8MB.");
      return;
    }

    try {
      setIsUploadingThumbnail(true);
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);
      formDataToSend.append("folder", "products/thumbnails");

      const response = await axios.post("/api/uploadImage", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Upload failed");
      }

      const thumbnailUrl = response.data.url;
      const result = await updateProduct(selectedProduct.product_id, {
        ...selectedProduct,
        thumbnail_image: thumbnailUrl,
      });

      if (!result?.success) {
        throw new Error(result?.error || "Failed to save thumbnail");
      }

      setActiveImageIndex(0);
      setSelectedProduct(result.data ?? { ...selectedProduct, thumbnail_image: thumbnailUrl });
      router.refresh();
    } catch (error: any) {
      console.error("Thumbnail upload error:", error);
      alert(`Failed to upload thumbnail: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsUploadingThumbnail(false);
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = "";
      }
    }
  };

  const handleUploadImages = async (files: File[]) => {
    if (!files.length) {
      alert("No files selected");
      return;
    }

    try {
      setIsUploading(true);

      const uploadPromises = Array.from(files).map(async (file) => {
        const formDataToSend = new FormData();
        formDataToSend.append("file", file);
        formDataToSend.append("folder", "products/images");

        const response = await axios.post("/api/uploadImage", formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (!response.data.success) {
          throw new Error(response.data.error || "Upload failed");
        }

        return response.data;
      });

      const uploadResults = await Promise.all(uploadPromises);
      const imageUrls = uploadResults.map((result) => result.url).filter(Boolean);

      if (imageUrls.length === 0) {
        throw new Error("No images were successfully uploaded");
      }

      const saveResult = await saveProductImageUrls(selectedProduct.product_id, imageUrls);

      if (!saveResult.success) {
        throw new Error(saveResult.error || "Failed to save image URLs to database");
      }

      alert(`Successfully uploaded ${imageUrls.length} image(s)`);
      router.refresh();
    } catch (error: any) {
      console.error("Error uploading images:", error);
      alert(`Failed to upload images: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const updatePrice = (field: "base_price" | "final_price", value: string) => {
    setFormData((prev) => {
      const nextBase = field === "base_price" ? value : prev.base_price;
      const nextFinal = field === "final_price" ? value : prev.final_price;
      const baseNum = Number(nextBase) || 0;
      const finalNum = Number(nextFinal) || 0;
      return {
        ...prev,
        [field]: value,
        discount_percentage: String(calculateDiscountPercentage(baseNum, finalNum)),
      };
    });
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94E8B] focus:border-transparent";
  const labelClass = "block text-base font-bold text-gray-700 mb-1.5";
  const sectionTitleClass = "text-sm font-semibold text-gray-900";

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
            selectedProduct.listed_status
              ? "bg-gray-100 text-gray-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {selectedProduct.listed_status ? "ACTIVE LISTING" : "INACTIVE"}
        </span>
        <button
          type="button"
          onClick={handleDeleteProduct}
          disabled={isDeleting}
          title="Delete product"
          className="p-2 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="px-6 py-5 space-y-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">
          {selectedProduct.product_name}
        </h2>

        {/* Product images — thumbnail is always first in grid */}
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_11rem] gap-4 items-start">
          <div className="group relative aspect-square w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
            {activeImage ? (
              <>
                <OptimizedImage
                  src={activeImage}
                  alt={selectedProduct.product_name ?? "Product"}
                  preset="full"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                {activeEntry?.isThumbnail && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-[#E94E8B] text-white text-[10px] font-semibold uppercase tracking-wide">
                    Thumbnail
                  </span>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2 px-4 text-center">
                {activeEntry?.isThumbnail ? (
                  <>
                    <span>No thumbnail uploaded</span>
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      disabled={isUploadingThumbnail}
                      className="text-[#E94E8B] text-xs font-medium hover:underline disabled:opacity-60"
                    >
                      Upload thumbnail
                    </button>
                  </>
                ) : (
                  "No gallery images"
                )}
              </div>
            )}
            {activeEntry?.isThumbnail && activeImage && (
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={isUploadingThumbnail}
                title="Replace thumbnail"
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/95 text-white text-xs font-medium  hover:bg-white hover:text-black
                hover:border-1 hover:border-black transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isUploadingThumbnail ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Replace"
                )}
              </button>
            )}
            {activeEntry && !activeEntry.isThumbnail && activeImage && (
              <button
                type="button"
                onClick={() => handleDeleteImage(activeEntry.id)}
                disabled={deletingImageId === activeEntry.id}
                title="Delete this gallery image"
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/95 text-white text-xs font-medium opacity-100  hover:bg-white hover:text-black hover:border hover:border-black transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingImageId === activeEntry.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-2 gap-2">
            {productImages.map((img, idx) => (
              <div key={img.id} className="group/thumb relative aspect-square">
                {img.isThumbnail && !img.url ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveImageIndex(idx);
                      thumbnailInputRef.current?.click();
                    }}
                    disabled={isUploadingThumbnail}
                    className={`w-full h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors disabled:opacity-60 ${
                      activeImageIndex === idx
                        ? "border-[#E94E8B] text-[#E94E8B] bg-[#E94E8B]/5"
                        : "border-gray-300 hover:border-[#E94E8B] hover:text-[#E94E8B]"
                    }`}
                  >
                    {isUploadingThumbnail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span className="text-[9px] font-medium">Thumbnail</span>
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-full h-full rounded-lg overflow-hidden border-2 transition-all ${
                        activeImageIndex === idx
                          ? "border-[#E94E8B] ring-2 ring-[#E94E8B]/30"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <OptimizedImage
                        src={img.url}
                        alt={img.isThumbnail ? "Thumbnail" : `Gallery ${idx}`}
                        preset="thumbnail"
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    </button>
                    {img.isThumbnail && (
                      <>
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[#E94E8B] text-white text-[8px] font-semibold uppercase pointer-events-none">
                          Thumbnail
                        </span>
                        
                      </>
                    )}
                    {!img.isThumbnail && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(img.id);
                        }}
                        disabled={deletingImageId === img.id}
                        title="Delete gallery image"
                        className="absolute top-1 right-1 z-10 p-1 rounded-md bg-white/95 text-red-600 opacity-0 group-hover/thumb:opacity-100 hover:bg-red-50 transition-opacity disabled:opacity-60"
                      >
                        {deletingImageId === img.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Upload gallery images"
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-[#E94E8B] hover:text-[#E94E8B] hover:bg-[#E94E8B]/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Add</span>
                </>
              )}
            </button>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleThumbnailUpload(file);
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleUploadImages(Array.from(files));
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className={sectionTitleClass}>Basic Information</h3>
            <div>
              <label className={labelClass}>Product Name</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, product_name: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>SKU Number</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                ref={descriptionRef}
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, description: e.target.value }));
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                rows={1}
                className={`${inputClass} min-h-11 resize-none overflow-hidden`}
              />
            </div>
            <label className="flex items-center gap-3 text-base font-bold text-gray-700">
              <input
                type="checkbox"
                checked={formData.listed_status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, listed_status: e.target.checked }))
                }
                className="h-4 w-4 accent-[#E94E8B]"
              />
              Listed (visible to shoppers)
            </label>
            <label className="flex items-center gap-3 text-base font-bold text-gray-700">
              <input
                type="checkbox"
                checked={formData.home_visibility}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, home_visibility: e.target.checked }))
                }
                className="h-4 w-4 accent-[#E94E8B]"
              />
              Home visibility
            </label>
          </div>

          <div className="space-y-4">
            <h3 className={sectionTitleClass}>Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Base Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => updatePrice("base_price", e.target.value)}
                  onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Final Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.final_price}
                  onChange={(e) => updatePrice("final_price", e.target.value)}
                  onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  className={`${inputClass} text-[#E94E8B] font-semibold`}
                />
              </div>
              <div>
                <label className={labelClass}>Discount (%)</label>
                <input
                  type="number"
                  value={formData.discount_percentage}
                  disabled
                  className={`${inputClass} disabled:opacity-70`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className={sectionTitleClass}>Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Main Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => {
                    const categoryId = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      category_id: categoryId,
                      subcategory_id: "",
                    }));
                    fetchSubCategories(categoryId);
                  }}
                  className={inputClass}
                >
                  <option value="">Select category</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Sub Category</label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subcategory_id: e.target.value }))
                  }
                  disabled={!formData.category_id}
                  className={`${inputClass} disabled:opacity-50`}
                >
                  <option value="">Select sub category</option>
                  {subCategoriesList.map((subCat) => (
                    <option key={subCat.subcategory_id} value={subCat.subcategory_id}>
                      {subCat.subcategory_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className={sectionTitleClass}>Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Weight (grams)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.weight_grams}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, weight_grams: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Occasion</label>
                <select
                  value={formData.occasion_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, occasion_id: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">Select occasion</option>
                  {occasionsList.map((occasion) => (
                    <option key={occasion.occasion_id} value={occasion.occasion_id}>
                      {occasion.occasion_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Style</label>
                <select
                  value={formData.style_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, style_id: e.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">Select style</option>
                  {stylesList.map((style) => (
                    <option key={style.style_id} value={style.style_id}>
                      {style.style_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Collections</label>
                {collectionsList.length === 0 ? (
                  <p className="text-sm text-gray-500">No active collections available.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {collectionsList.map((collection) => {
                      const isSelected = formData.collection_ids.includes(
                        collection.collection_id,
                      );
                      return (
                        <button
                          key={collection.collection_id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              collection_ids: isSelected
                                ? prev.collection_ids.filter(
                                    (id) => id !== collection.collection_id,
                                  )
                                : [...prev.collection_ids, collection.collection_id],
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                            isSelected
                              ? "bg-[#E94E8B] border-[#E94E8B] text-white"
                              : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                          }`}
                        >
                          {collection.collection_name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Size</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[24, 26, 28].map((size) => {
                    const sizeValue = size.toString();
                    const isSelected = formData.size.includes(sizeValue);
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!formData.category_id || !isBangleCategory}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            size: prev.size.includes(sizeValue)
                              ? prev.size.filter((s) => s !== sizeValue)
                              : [...prev.size, sizeValue],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          isSelected
                            ? "bg-[#E94E8B] border-[#E94E8B] text-white"
                            : "bg-white border-gray-200 text-gray-900 hover:border-gray-300"
                        } disabled:opacity-50`}
                      >
                        {size}mm
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={formData.size.join(", ")}
                  onChange={(e) => {
                    const sizes = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);
                    setFormData((prev) => ({ ...prev, size: sizes }));
                  }}
                  disabled={!formData.category_id || !isBangleCategory}
                  placeholder="Comma separated sizes"
                  className={`${inputClass} disabled:opacity-50`}
                />
                {(!formData.category_id || !isBangleCategory) && (
                  <p className="text-xs text-gray-500 mt-1">Size is only available for Bangle category</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className={sectionTitleClass}>Inventory</h3>
            <div>
              <label className={labelClass}>Stock Quantity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stock_quantity: e.target.value }))
                  }
                  className={inputClass}
                />
                {Number(formData.stock_quantity) <= 5 && (
                  <span className="shrink-0 inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                    Low Stock
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className={sectionTitleClass}>Tags</h3>
            <div className="flex flex-wrap gap-2">
              {ADMIN_SELECTABLE_TAGS.map((tag) => {
                const isSelected = formData.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        tags: isSelected
                          ? prev.tags.filter((t) => t !== tag)
                          : [...prev.tags, tag],
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-sm capitalize transition-colors ${
                      isSelected
                        ? "bg-[#E94E8B] border-[#E94E8B] text-white"
                        : "bg-white border-gray-200 text-gray-900 hover:border-gray-300"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={formData.tags.join(", ")}
              onChange={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0);
                setFormData((prev) => ({ ...prev, tags }));
              }}
              placeholder="Or enter custom tags separated by commas"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!isDirty || isSaving}
          className="px-5 py-2.5 rounded-lg border border-black text-black font-medium text-xl opacity-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          hover:cursor-pointer"
        >
          Discard Changes
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="px-5 py-2.5 rounded-lg bg-black text-white font-medium text-xl opacity-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2
          hover:cursor-pointer"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
