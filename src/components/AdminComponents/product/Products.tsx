"use client";

import React, { useState, useEffect } from "react";
import { createProduct, updateProduct } from "@/app/(admin)/actions/Product";
import { Category, getCategories, getSubCategories } from "@/app/(admin)/actions/categories";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import useAdminStore from "../../../zustandStore/AdminZustandStore";
import OptimizedImage from "@/components/OptimizedImage";
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

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB guard to keep server action body small

interface ProductFormProps {
  isDarkTheme: boolean;
  product?: any; // Optional product for editing
}

const ImageIcon = ({ className = "w-5 h-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
    />
  </svg>
);

export default function ProductForm({ isDarkTheme, product }: ProductFormProps) {
  const router = useRouter();
  const { showAddProduct, setShowAddProduct, editingProduct: storeEditingProduct, setEditingProduct } =
    useAdminStore();
  const editingProduct = product ?? storeEditingProduct;
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [subCategoriesList, setSubCategoriesList] = useState<any[]>([]);
  const [collectionsList, setCollectionsList] = useState<CollectionSelectOption[]>([]);
  const [stylesList, setStylesList] = useState<StyleSelectOption[]>([]);
  const [occasionsList, setOccasionsList] = useState<OccasionSelectOption[]>([]);

  // Allow empty string for numeric inputs so placeholder can show (instead of a leading 0).
  type NumericInput = number | "";
  const [formData, setFormData] = useState({
    product_name: "",
    description: "",
    category_id: "",
    subcategory_id: "",
    sku: "",
    base_price: "" as NumericInput,
    discount_percentage: 0,
    final_price: "" as NumericInput,
    stock_quantity: 1,
    weight_grams: 0,
    thumbnail_image: null as File | string | null,
    size: [] as string[],
    tags: [] as string[],
    occasion_id: "" as string,
    style_id: "" as string,
    collection_ids: [] as string[],
    listed_status: true as boolean,
    home_visibility: true as boolean,
  });
  const [thumbnailImagePreview, setThumbnailImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const providedTags = [...ADMIN_SELECTABLE_TAGS];

  useEffect(() => {
    const fetchCategories = async () => {
      const result = await getCategories();
      if (result.success && result.data) {
        setCategoriesList(result.data as Category[]);
      } else {
        console.error('Failed to fetch categories:', result.error);
        alert(`Failed to load categories: ${result.error}`);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchCollections = async () => {
      const result = await getActiveCollectionsForSelect();
      if (result.success && result.data) {
        setCollectionsList(result.data);
      } else {
        console.error("Failed to fetch collections:", result.error);
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
      } else {
        console.error("Failed to fetch styles:", stylesResult.error);
      }

      if (occasionsResult.success && occasionsResult.data) {
        setOccasionsList(occasionsResult.data);
      } else {
        console.error("Failed to fetch occasions:", occasionsResult.error);
      }
    };
    fetchStyleOccasionOptions();
  }, []);

  // Initialize form when product prop changes (for editing)
  useEffect(() => {
    if (editingProduct) {
      const safeString = (v: any) => (v === null || v === undefined ? "" : String(v));
      const safeNumber = (v: any, fallback = 0) => {
        if (v === null || v === undefined || v === "") return fallback;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
      };
      const safeArray = (v: any): string[] => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

      const safeCollectionIds = (v: any): string[] =>
        Array.isArray(v)
          ? v
              .map((pc) => (typeof pc === "string" ? pc : pc?.collection_id))
              .filter(Boolean)
              .map(String)
          : [];

      setFormData({
        product_name: safeString(editingProduct.product_name),
        description: safeString(editingProduct.description),
        category_id: safeString(editingProduct.category_id),
        subcategory_id: safeString(editingProduct.subcategory_id),
        sku: safeString(editingProduct.sku),
        base_price: safeNumber(editingProduct.base_price, 0) as NumericInput,
        discount_percentage: safeNumber(editingProduct.discount_percentage, 0),
        final_price: safeNumber(editingProduct.final_price, 0) as NumericInput,
        stock_quantity: safeNumber(editingProduct.stock_quantity, 1),
        weight_grams: safeNumber(editingProduct.weight_grams, 0),
        thumbnail_image: (editingProduct.thumbnail_image ?? null) as string | null,
        size: safeArray(editingProduct.size),
        tags: safeArray(editingProduct.tags),
        occasion_id: resolveOccasionId(editingProduct, occasionsList),
        style_id: resolveStyleId(editingProduct, stylesList),
        collection_ids: safeCollectionIds(editingProduct.product_collections),
        listed_status: editingProduct.listed_status ?? true,
        home_visibility: editingProduct.home_visibility ?? true,
      });
      setThumbnailImagePreview(
        typeof editingProduct.thumbnail_image === "string" && editingProduct.thumbnail_image.length > 0
          ? editingProduct.thumbnail_image
          : null
      );
      const categoryId = safeString(editingProduct.category_id);
      if (categoryId) {
        fetchSubCategories(categoryId);
      }
    } else {
      // Reset form for new product
      setFormData({
        product_name: "",
        description: "",
        category_id: "",
        subcategory_id: "",
        sku: "",
        base_price: "" as NumericInput,
        discount_percentage: 0,
        final_price: "" as NumericInput,
        stock_quantity: 1,
        weight_grams: 0,
        thumbnail_image: null,
        size: [],
        tags: [],
        occasion_id: "",
        style_id: stylesList[0]?.style_id ?? "",
        collection_ids: [],
        listed_status: true,
        home_visibility: true,
      });
      setThumbnailImagePreview(null);
    }
  }, [editingProduct, stylesList, occasionsList]);

  const selectedCategoryName = categoriesList.find(
    (cat) => cat.category_id === formData.category_id
  )?.category_name;
  const isBangleCategory = (selectedCategoryName ?? "")
    .toLowerCase()
    .trim()
    .includes("bangle");

  // Keep size data only for bangle products.
  useEffect(() => {
    if (!isBangleCategory && formData.size.length > 0) {
      setFormData((prev) => ({ ...prev, size: [] }));
    }
  }, [isBangleCategory, formData.size.length]);


  const fetchSubCategories = async (categoryId: string) => {
    const result = await getSubCategories(categoryId);
    if(result.success && result.data){
      setSubCategoriesList(result.data as any[]);
    }else{
      console.error("Error fetching sub categories:", result.message);
    }
  }

  const calculateDiscountPercentage = (base: number, final: number): number => {
    if (base <= 0) return 0;
    const discount = ((base - final) / base) * 100;
    if (!Number.isFinite(discount)) return 0;
    // Whole number (no decimals) and never negative.
    return Math.max(0, Math.round(discount));
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (name === "base_price" || name === "final_price") {
      const numericValue: NumericInput =
        value === "" ? "" : Number.isFinite(Number(value)) ? Number(value) : "";
      setFormData((prev) => {
        const nextBase = name === "base_price" ? numericValue : prev.base_price;
        const nextFinal = name === "final_price" ? numericValue : prev.final_price;
        const baseNum = nextBase === "" ? 0 : nextBase;
        const finalNum = nextFinal === "" ? 0 : nextFinal;
        return {
          ...prev,
          [name]: numericValue,
          discount_percentage: calculateDiscountPercentage(baseNum, finalNum),
        };
      });
      return;
    }

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      alert("Image is too large. Please upload a file under 8MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      thumbnail_image: file,
    }));
    setThumbnailImagePreview(previewUrl);
  };

  const removeImage = () => {
    if (formData.thumbnail_image) {
      if (formData.thumbnail_image instanceof File) {
        URL.revokeObjectURL(URL.createObjectURL(formData.thumbnail_image));
      }
    }
    setFormData((prev) => ({
      ...prev,
      thumbnail_image: null,
    }));
    setThumbnailImagePreview(null);
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
  
    const startTime = performance.now();
  
    try {
      setIsSaving(true);
  
      let thumbnailUrl: string | null = null;
      let thumbnailUploadTime = 0;
  
      // Upload thumbnail if it's a new file
      if (formData.thumbnail_image instanceof File) {
        const thumbnailStartTime = performance.now();
        
        const formDataToSend = new FormData();
        formDataToSend.append("file", formData.thumbnail_image);
        formDataToSend.append("folder", "products/thumbnails");

        const response = await axios.post("/api/uploadImage", formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (!response.data.success || !response.data.url) {
          throw new Error(response.data.error || "Thumbnail upload failed");
        }

        thumbnailUrl = response.data.url;
        thumbnailUploadTime = performance.now() - thumbnailStartTime;
      } else if (typeof formData.thumbnail_image === 'string') {
        // If it's already a URL (editing mode), use it as is
        thumbnailUrl = formData.thumbnail_image;
      }
  
      if (editingProduct) {
        // Update existing product
        const updateStartTime = performance.now();
        
        const result = await updateProduct(editingProduct.product_id, {
          ...formData,
          thumbnail_image: thumbnailUrl,
          subcategory_id: formData.subcategory_id || null,
        });
  
        if (!result.success) {
          throw new Error(result.error);
        }
        const updateTime = performance.now() - updateStartTime;
        
        router.refresh();
        setShowAddProduct(false);
        handleCancel();
      } else {
        // Create new product
        const createStartTime = performance.now();
        
        const result = await createProduct({
          ...formData,
          thumbnail_image: thumbnailUrl,
          subcategory_id: formData.subcategory_id || null,
        });
  
        if (!result.success) {
          throw new Error(result.error);
        }
  
        const createTime = performance.now() - createStartTime;
        
        router.refresh();
        setShowAddProduct(false);
        handleCancel();
      }
      
      const totalTime = performance.now() - startTime;
    } catch (error: any) {
      const totalTime = performance.now() - startTime;
      console.error('❌ Error occurred after', totalTime.toFixed(2), 'ms:', error);
      alert(error.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };
  const handleCancel = () => {
    if (formData.thumbnail_image instanceof File && thumbnailImagePreview) {
      URL.revokeObjectURL(thumbnailImagePreview);
    }
    setFormData({
      product_name: "",
      description: "",
      category_id: "",
      subcategory_id: "",
      sku: "",
      base_price: "" as NumericInput,
      discount_percentage: 0,
      final_price: "" as NumericInput,
      stock_quantity: 1,
      weight_grams: 0,
      thumbnail_image: null,
      size: [],
      tags: [],
      occasion_id: "",
      style_id: stylesList[0]?.style_id ?? "",
      collection_ids: [],
      listed_status: true,
      home_visibility: true,
    });
    setThumbnailImagePreview(null);
    setSubCategoriesList([]);
    setShowAddProduct(false);
    setEditingProduct(null);
  };



  if (!showAddProduct) return null;

  return (
    <div
      id="admin-product-form"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Add/Edit Product Form (Modal) */}
      <div
        className={`relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto ${
          isDarkTheme ? "bg-black border border-gray-700" : "bg-white"
        } rounded-lg shadow-2xl p-6`}
        onClick={(e) => e.stopPropagation()}
      >
          <h2
            className={`text-2xl font-bold mb-6 ${
              isDarkTheme ? "text-white" : "text-gray-900"
            }`}
          >
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="mb-8">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkTheme ? "text-white" : "text-gray-900"
                }`}
              >
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Riva Bold Pearl 22K Gold Platted Necklace"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                    required
                    maxLength={255}
                  />
                </div>

                {/* SKU */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    SKU (Stock Keeping Unit) *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="e.g., NKL-GOLD-001"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                    required
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Enter product description..."
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                  />
                </div>

                {/* Listed Status */}
                <div className="md:col-span-2">
                  <label
                    className={`flex items-center gap-3 text-sm font-medium ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="listed_status"
                      checked={!!formData.listed_status}
                      onChange={handleInputChange}
                      className="h-4 w-4 accent-[#E94E8B]"
                    />
                    Listed (visible to shoppers)
                  </label>
                  <p className={`text-xs mt-1 ${isDarkTheme ? "text-gray-400" : "text-gray-500"}`}>
                    Uncheck to hide this product from all customer views.
                  </p>
                </div>

                {/* Home Visibility */}
                <div className="md:col-span-2">
                  <label
                    className={`flex items-center gap-3 text-sm font-medium ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="home_visibility"
                      checked={!!formData.home_visibility}
                      onChange={handleInputChange}
                      className="h-4 w-4 accent-[#E94E8B]"
                    />
                    Home visibility
                  </label>
                  <p className={`text-xs mt-1 ${isDarkTheme ? "text-gray-400" : "text-gray-500"}`}>
                    Uncheck to hide from homepage carousels (product can still appear in shop if listed).
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-8">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkTheme ? "text-white" : "text-gray-900"
                }`}
              >
                Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleInputChange}
                    // Prevent accidental value changes when scrolling while focused (common on number inputs)
                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                    placeholder="899.00"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Final Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="final_price"
                    value={formData.final_price}
                    onChange={handleInputChange}
                    // Prevent accidental value changes when scrolling while focused (common on number inputs)
                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                    placeholder="549.00"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="discount_percentage"
                    value={formData.discount_percentage}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B] disabled:opacity-70`}
                  />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-8">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkTheme ? "text-white" : "text-gray-900"
                }`}
              >
                Categories
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Category */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Main Category *
                  </label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={(e)=>{
                      handleInputChange(e);
                      fetchSubCategories(e.target.value);
                    }}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                  >
                    <option value="">Select Category</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub Category */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Sub Category *
                  </label>
                  <select
                    name="subcategory_id"
                    value={formData.subcategory_id}
                    onChange={handleInputChange}
                    disabled={!formData.category_id}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B] disabled:opacity-50`}
                  >
                    <option value="">Select Sub Category</option>
                    {formData.category_id && subCategoriesList.length > 0 &&
                      subCategoriesList.map((subCat) => (
                        <option key={subCat.subcategory_id} value={subCat.subcategory_id}>
                          {subCat.subcategory_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Product Specifications */}
            <div className="mb-8">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkTheme ? "text-white" : "text-gray-900"
                }`}
              >
                Product Specifications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Weight (grams)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="weight_grams"
                    value={formData.weight_grams}
                    onChange={handleInputChange}
                    placeholder="15.00"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Size (comma separated)
                  </label>
                  <div className="flex flex-row items-center gap-2">
                    {[24, 26, 28].map((size) => {
                      const sizeValue = size.toString();
                      const isSelected = formData.size.includes(sizeValue);

                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={!formData.category_id || !isBangleCategory}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            isSelected
                              ? "bg-[#E94E8B] border-[#E94E8B] text-white"
                              : isDarkTheme
                              ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600"
                              : "bg-white border-gray-300 text-gray-900 hover:bg-gray-100 hover:border-gray-400"
                          } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                          onClick={() => {
                            setFormData((prev) => {
                              const nextSizes = prev.size.includes(sizeValue)
                                ? prev.size.filter((s) => s !== sizeValue)
                                : [...prev.size, sizeValue];
                              return { ...prev, size: nextSizes };
                            });
                          }}
                        >
                          {size}mm
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    name="size"
                    value={(formData.size!==null && formData.size!==undefined) ? formData.size.join(", ") : ""}
                    onChange={(e) => {
                      const sizes = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0);
                      setFormData((prev) => ({ ...prev, size: sizes }));
                    }}
                    placeholder="Select Size"
                    disabled={!formData.category_id || !isBangleCategory}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B] disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  {(!formData.category_id || !isBangleCategory) && (
                    <p className={`text-xs mt-1 ${
                      isDarkTheme ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Size is only available for Bangle category
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Occasion *
                  </label>
                  <select
                    name="occasion_id"
                    value={formData.occasion_id}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                    required
                  >
                    <option value="">Select Occasion</option>
                    {occasionsList.map((occasion) => (
                      <option key={occasion.occasion_id} value={occasion.occasion_id}>
                        {occasion.occasion_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Style
                  </label>
                  <select
                    name="style_id"
                    value={formData.style_id}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                  >
                    <option value="">Select Style</option>
                    {stylesList.map((style) => (
                      <option key={style.style_id} value={style.style_id}>
                        {style.style_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Collections
                  </label>
                  {collectionsList.length === 0 ? (
                    <p className={`text-sm ${isDarkTheme ? "text-gray-400" : "text-gray-500"}`}>
                      No active collections available.
                    </p>
                  ) : (
                    <div className="flex flex-row flex-wrap items-center gap-2">
                      {collectionsList.map((collection) => {
                        const isSelected = formData.collection_ids.includes(
                          collection.collection_id,
                        );
                        return (
                          <button
                            key={collection.collection_id}
                            type="button"
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                              isSelected
                                ? "bg-[#E94E8B] border-[#E94E8B] text-white"
                                : isDarkTheme
                                  ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600"
                                  : "bg-white border-gray-300 text-gray-900 hover:bg-gray-100 hover:border-gray-400"
                            } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
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
                          >
                            {collection.collection_name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="mb-8">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkTheme ? "text-white" : "text-gray-900"
                }`}
              >
                Inventory
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-8">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkTheme ? "text-white" : "text-gray-900"
                }`}
              >
                Tags
              </h3>
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDarkTheme ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Tags (comma separated)
                </label>
                <div className="flex flex-row flex-wrap items-center gap-2 mb-3">
                  {providedTags.map((tag) => {
                    const isSelected = Array.isArray(formData.tags)
                      ? formData.tags.includes(tag)
                      : false;
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`px-4 py-2 rounded-lg border transition-colors capitalize ${
                          isSelected
                            ? isDarkTheme
                              ? "bg-[#E94E8B] border-[#E94E8B] text-white"
                              : "bg-[#E94E8B] border-[#E94E8B] text-white"
                            : isDarkTheme
                            ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600"
                            : "bg-white border-gray-300 text-gray-900 hover:bg-gray-100 hover:border-gray-400"
                        } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                        onClick={() => {
                          if (isSelected) {
                            setFormData((prev) => ({
                              ...prev,
                              tags: prev.tags.filter((t) => t !== tag),
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              tags: [...prev.tags, tag],
                            }));
                          }
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  name="tags"
                  value={Array.isArray(formData.tags) ? formData.tags.join(", ") : ""}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0);
                    setFormData((prev) => ({ ...prev, tags }));
                  }}
                  placeholder="Or enter custom tags separated by commas"
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDarkTheme
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                />
                <p className={`text-xs mt-2 ${
                  isDarkTheme ? "text-gray-400" : "text-gray-500"
                }`}>
                  Click buttons above to add tags or enter custom tags separated by commas
                </p>
              </div>
            </div>

            {/* Product Thumbnail Image */}
            <div className="mb-8">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkTheme ? "text-white" : "text-gray-900"
                }`}
              >
                Thumbnail Image
              </h3>
              {!thumbnailImagePreview ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    isDarkTheme ? "border-gray-700" : "border-gray-300"
                  }`}
                >
                  <ImageIcon
                    className={`w-12 h-12 mx-auto mb-4 ${
                      isDarkTheme ? "text-gray-400" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`mb-2 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    <span className="font-semibold">Click to upload</span> or drag
                    and drop
                  </p>
                  <p
                    className={`text-sm ${
                      isDarkTheme ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    PNG, JPG, WEBP up to 5MB
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="thumbnail-image-upload"
                    // Required only when creating OR when editing a product that has no existing thumbnail
                    required={!editingProduct}
                  />
                  <label
                    htmlFor="thumbnail-image-upload"
                    className="mt-4 inline-block px-4 py-2 bg-[#E94E8B] text-white rounded-lg cursor-pointer hover:bg-[#d43d75] transition-colors"
                  >
                    Select Image
                  </label>
                </div>
              ) : (
                <div className="relative w-2/3 max-w-xs aspect-2/3 rounded-lg border overflow-hidden">
                  <OptimizedImage
                    src={thumbnailImagePreview}
                    alt="Thumbnail preview"
                    fill
                    objectFit="cover"
                    className="rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <div
                    className={`mt-2 text-sm ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Image uploaded successfully
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isDarkTheme
                    ? "bg-gray-800 text-white hover:bg-gray-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-[#E94E8B] text-white rounded-lg font-medium hover:bg-[#d43d75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Saving...
                  </>
                ) : (
                  editingProduct ? 'Update Product' : 'Add Product'
                )}
              </button>
            </div>
          </form>
        </div>
    </div>
  );
}
