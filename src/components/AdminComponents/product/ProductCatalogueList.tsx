"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import useAdminStore from "@/zustandStore/AdminZustandStore";
import { getStyleLabel } from "@/lib/product-style";

interface ProductCatalogueListProps {
  products: any[];
}

const formatPrice = (value: number | string | null | undefined) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

export default function ProductCatalogueList({ products }: ProductCatalogueListProps) {
  const { selectedProduct, setSelectedProduct } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const uniqueCategories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      const cat = p?.categories;
      if (cat?.category_id && cat?.category_name) {
        map.set(cat.category_id, cat.category_name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const uniqueSubcategories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      const sub = p?.sub_categories;
      if (sub?.subcategory_id && sub?.subcategory_name) {
        map.set(sub.subcategory_id, sub.subcategory_name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const uniqueStyles = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const style = (p?.style ?? p?.collection ?? "").trim();
      if (style) set.add(style);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const uniqueCollections = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      const productCollections = Array.isArray(p?.product_collections)
        ? p.product_collections
        : [];
      productCollections.forEach((pc: { collection_id?: string; collections?: { collection_id?: string; collection_name?: string } | null }) => {
        const collection = pc?.collections;
        if (collection?.collection_id && collection?.collection_name) {
          map.set(collection.collection_id, collection.collection_name);
        } else if (pc?.collection_id) {
          map.set(pc.collection_id, pc.collection_id);
        }
      });
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !normalizedQuery ||
        String(p?.sku ?? "").toLowerCase().includes(normalizedQuery) ||
        String(p?.product_name ?? "").toLowerCase().includes(normalizedQuery);
      const matchesCategory = !categoryFilter || p?.category_id === categoryFilter;
      const matchesSubcategory =
        !subcategoryFilter || p?.subcategory_id === subcategoryFilter;
      const productStyle = (p?.style ?? p?.collection ?? "").trim();
      const matchesStyle = !styleFilter || productStyle === styleFilter;
      const productCollectionIds = Array.isArray(p?.product_collections)
        ? p.product_collections
            .map((pc: { collection_id?: string }) => pc.collection_id)
            .filter(Boolean)
        : [];
      const matchesCollection =
        !collectionFilter || productCollectionIds.includes(collectionFilter);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesSubcategory &&
        matchesStyle &&
        matchesCollection
      );
    });
  }, [products, normalizedQuery, categoryFilter, subcategoryFilter, styleFilter, collectionFilter]);

  const hasActiveFilters =
    Boolean(categoryFilter || subcategoryFilter || styleFilter || collectionFilter);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  useEffect(() => {
    if (filteredProducts.length === 0) {
      setSelectedProduct(null);
      return;
    }
    const currentStillVisible = selectedProduct
      ? filteredProducts.some((p) => p.product_id === selectedProduct.product_id)
      : false;
    if (!currentStillVisible) {
      setSelectedProduct(filteredProducts[0]);
    }
  }, [filteredProducts, selectedProduct, setSelectedProduct]);

  const clearFilters = () => {
    setCategoryFilter("");
    setSubcategoryFilter("");
    setStyleFilter("");
    setCollectionFilter("");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 p-4 space-y-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU or Name..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E94E8B] focus:border-transparent"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{filteredProducts.length}</span>{" "}
            Products Available
          </p>
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                hasActiveFilters
                  ? "border-[#E94E8B] text-[#E94E8B] bg-pink-50"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-2 z-20 w-64 p-4 bg-white rounded-lg border border-gray-200 shadow-lg space-y-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94E8B]"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={subcategoryFilter}
                  onChange={(e) => setSubcategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94E8B]"
                >
                  <option value="">All Subcategories</option>
                  {uniqueSubcategories.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={styleFilter}
                  onChange={(e) => setStyleFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94E8B]"
                >
                  <option value="">All Styles</option>
                  {uniqueStyles.map((style) => (
                    <option key={style} value={style}>
                      {getStyleLabel(style)}
                    </option>
                  ))}
                </select>
                <select
                  value={collectionFilter}
                  onChange={(e) => setCollectionFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94E8B]"
                >
                  <option value="">All Collections</option>
                  {uniqueCollections.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-500 px-4 text-center">
            {normalizedQuery || hasActiveFilters
              ? "No products match your search or filters."
              : "No products available."}
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-700 border-b border-gray-200 w-16">
                  Image
                </th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-700 border-b border-gray-200">
                  SKU
                </th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-700 border-b border-gray-200">
                  Product Name
                </th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-700 border-b border-gray-200">
                  Stock
                </th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-700 border-b border-gray-200">
                  Listed
                </th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-700 border-b border-gray-200">
                  Final Price
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const isSelected =
                  selectedProduct?.product_id === product.product_id;
                const stockQty = Number(product.stock_quantity);
                const isLowStock = Number.isFinite(stockQty) && stockQty <= 5;

                return (
                  <tr
                    key={product.product_id}
                    onClick={() => setSelectedProduct(product)}
                    aria-selected={isSelected}
                    className={`cursor-pointer border-b border-gray-100 transition-colors ${
                      isSelected
                        ? "bg-[#F3E8FF] border-l-4 border-l-[#E94E8B]"
                        : "border-l-4 border-l-transparent hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-2 px-3">
                      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        <OptimizedImage
                          src={product.thumbnail_image ?? ""}
                          alt={product.product_name ?? "Product"}
                          preset="thumbnail"
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    </td>
                    <td
                      className="py-2 px-3 text-gray-700 max-w-[100px] truncate"
                      title={product.sku ?? ""}
                    >
                      {product.sku || "—"}
                    </td>
                    <td
                      className="py-2 px-3 font-medium text-gray-900 max-w-[140px] truncate"
                      title={product.product_name ?? ""}
                    >
                      {product.product_name || "—"}
                    </td>
                    <td className="py-2 px-3 text-gray-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {product.stock_quantity ?? "—"}
                        {isLowStock && (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                            Low
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          product.listed_status
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.listed_status ? "Listed" : "Unlisted"}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#E94E8B] whitespace-nowrap">
                      {formatPrice(product.final_price)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
