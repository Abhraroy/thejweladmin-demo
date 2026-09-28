"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pen, Trash2, Plus, X, Search } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import {
  createCollection,
  deleteCollection,
  getCollections,
  searchProducts,
  updateCollection,
  type CollectionWithProducts,
  type ProductOption,
} from "./action";

const SUCCESS_BANNER_CLASS =
  "text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3";

type CollectionFormData = {
  collection_name: string;
  description: string;
  is_active: boolean;
  product_ids: string[];
};

function buildInitialForm(): CollectionFormData {
  return {
    collection_name: "",
    description: "",
    is_active: true,
    product_ids: [],
  };
}

function toFormData(collection: CollectionWithProducts): CollectionFormData {
  return {
    collection_name: collection.collection_name,
    description: collection.description ?? "",
    is_active: collection.is_active,
    product_ids: collection.product_collections.map((pc) => pc.product_id),
  };
}

function getCollectionProducts(collection: CollectionWithProducts): ProductOption[] {
  return collection.product_collections
    .map((pc) => pc.products)
    .filter((p): p is ProductOption => p !== null);
}

export default function CollectionPage() {
  const [collections, setCollections] = useState<CollectionWithProducts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CollectionFormData>(buildInitialForm());
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [collectionToEdit, setCollectionToEdit] = useState<CollectionWithProducts | null>(null);
  const [editForm, setEditForm] = useState<CollectionFormData>(buildInitialForm());
  const [isEditSaving, setIsEditSaving] = useState(false);

  const [collectionToDelete, setCollectionToDelete] = useState<CollectionWithProducts | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ProductOption[]>([]);
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);

  const activeFormProductIds = collectionToEdit ? editForm.product_ids : formData.product_ids;
  const setActiveFormProductIds = collectionToEdit
    ? (ids: string[]) => setEditForm((prev) => ({ ...prev, product_ids: ids }))
    : (ids: string[]) => setFormData((prev) => ({ ...prev, product_ids: ids }));

  const refreshCollections = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    const result = await getCollections();
    if (!result.success) {
      setListError(result.error || "Unable to load collections");
      setCollections([]);
      setIsLoading(false);
      return;
    }
    setCollections(result.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshCollections();
  }, [refreshCollections]);

  const activeCount = useMemo(
    () => collections.filter((c) => c.is_active).length,
    [collections],
  );

  const runProductSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    const result = await searchProducts(query);
    setIsSearching(false);
    if (result.success) {
      setSearchResults(result.data ?? []);
    }
  }, []);

  useEffect(() => {
    if (!showCreateForm && !collectionToEdit) return;

    const timer = setTimeout(() => {
      runProductSearch(productSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch, showCreateForm, collectionToEdit, runProductSearch]);

  const resetProductPicker = () => {
    setProductSearch("");
    setSearchResults([]);
    setSelectedProducts([]);
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setFormData(buildInitialForm());
    setFormError(null);
    resetProductPicker();
  };

  const openCreateForm = () => {
    setActionError(null);
    setSuccessMessage(null);
    setFormData(buildInitialForm());
    setFormError(null);
    resetProductPicker();
    setShowCreateForm(true);
    runProductSearch("");
  };

  const openEditModal = (collection: CollectionWithProducts) => {
    setActionError(null);
    setSuccessMessage(null);
    setCollectionToEdit(collection);
    setEditForm(toFormData(collection));
    setSelectedProducts(getCollectionProducts(collection));
    setProductSearch("");
    runProductSearch("");
  };

  const closeEditModal = () => {
    setCollectionToEdit(null);
    setEditForm(buildInitialForm());
    setIsEditSaving(false);
    setActionError(null);
    resetProductPicker();
  };

  const closeDeleteModal = () => {
    setCollectionToDelete(null);
    setIsDeleting(false);
    setActionError(null);
  };

  const addProductToForm = (product: ProductOption) => {
    if (activeFormProductIds.includes(product.product_id)) return;
    setActiveFormProductIds([...activeFormProductIds, product.product_id]);
    setSelectedProducts((prev) => {
      if (prev.some((p) => p.product_id === product.product_id)) return prev;
      return [...prev, product];
    });
  };

  const removeProductFromForm = (productId: string) => {
    setActiveFormProductIds(activeFormProductIds.filter((id) => id !== productId));
    setSelectedProducts((prev) => prev.filter((p) => p.product_id !== productId));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.collection_name.trim()) {
      setFormError("Collection name is required");
      return;
    }

    setIsSaving(true);
    const result = await createCollection({
      collection_name: formData.collection_name,
      description: formData.description || undefined,
      is_active: formData.is_active,
      product_ids: formData.product_ids,
    });

    if (!result.success) {
      setFormError(result.error || "Failed to create collection");
      setIsSaving(false);
      return;
    }

    setSuccessMessage(`Collection "${formData.collection_name.trim()}" created.`);
    setIsSaving(false);
    closeCreateForm();
    await refreshCollections();
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!collectionToEdit) return;

    setActionError(null);

    if (!editForm.collection_name.trim()) {
      setActionError("Collection name is required");
      return;
    }

    setIsEditSaving(true);
    const result = await updateCollection(collectionToEdit.collection_id, {
      collection_name: editForm.collection_name,
      description: editForm.description || undefined,
      is_active: editForm.is_active,
      product_ids: editForm.product_ids,
    });

    if (!result.success) {
      setActionError(result.error || "Failed to update collection");
      setIsEditSaving(false);
      return;
    }

    setSuccessMessage(
      `Collection "${editForm.collection_name.trim()}" updated.`,
    );
    setIsEditSaving(false);
    closeEditModal();
    await refreshCollections();
  };

  const handleDelete = async () => {
    if (!collectionToDelete) return;

    setActionError(null);
    setIsDeleting(true);
    const result = await deleteCollection(collectionToDelete.collection_id);

    if (!result.success) {
      setActionError(result.error || "Failed to delete collection");
      setIsDeleting(false);
      return;
    }

    setSuccessMessage(`Collection "${collectionToDelete.collection_name}" deleted.`);
    setIsDeleting(false);
    closeDeleteModal();
    await refreshCollections();
  };

  const renderProductPicker = () => (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Products in collection
      </label>

      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedProducts.map((product) => (
            <span
              key={product.product_id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-black text-xs font-medium border border-indigo-200"
            >
              {product.product_name || product.sku || "Unnamed product"}
              <button
                type="button"
                onClick={() => removeProductFromForm(product.product_id)}
                className="hover:text-indigo-950"
                aria-label={`Remove ${product.product_name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="Search products by name or SKU..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
        />
      </div>

      <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
        {isSearching ? (
          <div className="p-3 text-sm text-slate-500">Searching...</div>
        ) : searchResults.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">No products found.</div>
        ) : (
          searchResults.map((product) => {
            const isSelected = activeFormProductIds.includes(product.product_id);
            return (
              <button
                key={product.product_id}
                type="button"
                disabled={isSelected}
                onClick={() => addProductToForm(product)}
                className={`w-full flex items-center gap-3 p-2.5 text-left border-b border-slate-100 last:border-b-0 transition-colors ${
                  isSelected
                    ? "bg-slate-50 opacity-60 cursor-not-allowed"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className="relative w-10 h-10 rounded-md overflow-hidden bg-slate-100 shrink-0">
                  {product.thumbnail_image ? (
                    <OptimizedImage
                      src={product.thumbnail_image}
                      alt={product.product_name ?? ""}
                      preset="thumbnail"
                      fill
                      objectFit="cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {product.product_name || "Unnamed product"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {product.sku ? `SKU: ${product.sku}` : "No SKU"}
                    {product.final_price != null ? ` · ₹${product.final_price}` : ""}
                  </p>
                </div>
                {!isSelected && <Plus className="w-4 h-4 text-[#360000] shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderCollectionForm = (
    data: CollectionFormData,
    onChange: (field: keyof CollectionFormData, value: string | boolean) => void,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
    isSubmitting: boolean,
    submitLabel: string,
    error: string | null,
    onClose: () => void,
    title: string,
    subtitle: string,
  ) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/55"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border-2 border-slate-900 px-2.5 py-1 text-xs font-semibold text-black hover:bg-slate-50 hover:cursor-pointer"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Collection name *
            </label>
            <input
              value={data.collection_name}
              onChange={(e) => onChange("collection_name", e.target.value)}
              placeholder="e.g. Summer Collection"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={data.description}
              onChange={(e) => onChange("description", e.target.value)}
              rows={3}
              placeholder="Optional description for this collection"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={data.is_active}
              onChange={(e) => onChange("is_active", e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            Collection active
          </label>

          {renderProductPicker()}

          {error ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-[#360000] text-white text-sm font-semibold hover:bg-[#360000] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="border-b border-black pb-4">
        <h1 className="text-2xl font-bold">Collections</h1>
        <p className="text-sm text-gray-500">
          Create and manage product collections
        </p>
      </div>

      <div className="flex justify-between items-center pr-4">
        <div className="border border-black py-0.5 px-2 w-fit rounded-full  text-black">
          <p className="text-[0.8rem] font-bold">
            Active Collections: {activeCount}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="border border-black p-2 w-fit rounded-lg bg-[#360000] hover:cursor-pointer"
        >
          <p className="text-[1rem] font-bold text-white">Create Collection</p>
        </button>
      </div>

      <div className="border border-slate-200 rounded-xl p-4 bg-white">
        {successMessage && !showCreateForm && !collectionToEdit && !collectionToDelete ? (
          <div className={`mb-3 ${SUCCESS_BANNER_CLASS}`}>{successMessage}</div>
        ) : null}

        {actionError && !collectionToEdit && !collectionToDelete ? (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {actionError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="text-sm text-slate-500">Loading collections...</div>
        ) : listError ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {listError}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-sm text-slate-500">
            No collections yet. Click &quot;Create Collection&quot; to add one.
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((collection) => {
              const products = getCollectionProducts(collection);
              const isExpanded = expandedCollectionId === collection.collection_id;

              return (
                <div
                  key={collection.collection_id}
                  className="border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {collection.collection_name}
                        </h2>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            collection.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {collection.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {collection.description ? (
                        <p className="text-sm text-slate-600 mt-1">
                          {collection.description}
                        </p>
                      ) : null}
                      <p className="text-xs text-slate-500 mt-1">
                        {products.length} product{products.length === 1 ? "" : "s"}
                        {collection.slug ? ` · /${collection.slug}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCollectionId(
                            isExpanded ? null : collection.collection_id,
                          )
                        }
                        className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {isExpanded ? "Hide products" : "View products"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(collection)}
                        className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        aria-label={`Edit ${collection.collection_name}`}
                      >
                        <Pen className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setCollectionToDelete(collection);
                        }}
                        className="p-1.5 rounded-md border border-red-300 bg-white text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${collection.collection_name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      {products.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No products in this collection.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {products.map((product) => (
                            <div
                              key={product.product_id}
                              className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 bg-slate-50"
                            >
                              <div className="relative w-12 h-12 rounded-md overflow-hidden bg-white shrink-0">
                                {product.thumbnail_image ? (
                                  <OptimizedImage
                                    src={product.thumbnail_image}
                                    alt={product.product_name ?? ""}
                                    preset="thumbnail"
                                    fill
                                    objectFit="cover"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {product.product_name || "Unnamed product"}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {product.sku || "No SKU"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateForm &&
        renderCollectionForm(
          formData,
          (field, value) =>
            setFormData((prev) => ({ ...prev, [field]: value })),
          handleCreate,
          isSaving,
          "Create Collection",
          formError,
          closeCreateForm,
          "Create Collection",
          "Add a new collection and assign products to it.",
        )}

      {collectionToEdit &&
        renderCollectionForm(
          editForm,
          (field, value) =>
            setEditForm((prev) => ({ ...prev, [field]: value })),
          handleUpdate,
          isEditSaving,
          "Save changes",
          actionError,
          closeEditModal,
          `Edit ${collectionToEdit.collection_name}`,
          "Update collection details and products.",
        )}

      {collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/55"
            onClick={closeDeleteModal}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete {collectionToDelete.collection_name}?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This permanently removes the collection and its product links.
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
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
