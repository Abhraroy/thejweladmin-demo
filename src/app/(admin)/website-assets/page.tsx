"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pen, Plus, Trash2 } from "lucide-react";
import {
  createPromoContent,
  deletePromoContent,
  getPromoContent,
  updatePromoContent,
} from "@/app/(admin)/actions/promocontent";
import type { PromoContent, PromoLocation } from "@/types/TypeInterface";
import WebsiteImageSectionPanel from "@/components/AdminComponents/website-assets/WebsiteImageSectionPanel";

const PROMOTION_PREVIEW_IMAGE =
  "https://images.thejwel.in/website_section_images/Screenshot%202026-06-15%20233827.png";

const LOCATION_OPTIONS: { value: PromoLocation; label: string }[] = [
  { value: "promotion_banner", label: "Promotion" },
  { value: "share_link", label: "Share" },
];

const SUCCESS_BANNER_CLASS =
  "text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3";
const ERROR_BANNER_CLASS =
  "text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3";

type PromoFormData = {
  content: string;
  place_to_be_displayed: PromoLocation;
};

function buildInitialForm(location: PromoLocation = "promotion_banner"): PromoFormData {
  return {
    content: "",
    place_to_be_displayed: location,
  };
}

function toFormData(item: PromoContent): PromoFormData {
  return {
    content: item.content,
    place_to_be_displayed: item.place_to_be_displayed,
  };
}

export default function WebsiteAssetsPage() {
  const [allPromoContent, setAllPromoContent] = useState<PromoContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<PromoFormData>(buildInitialForm());
  const [isCreating, setIsCreating] = useState(false);

  const [itemToEdit, setItemToEdit] = useState<PromoContent | null>(null);
  const [editForm, setEditForm] = useState<PromoFormData>(buildInitialForm());
  const [isEditing, setIsEditing] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<PromoContent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const promotionLines = useMemo(
    () => allPromoContent.filter((item) => item.place_to_be_displayed === "promotion_banner"),
    [allPromoContent]
  );

  const shareLines = useMemo(
    () => allPromoContent.filter((item) => item.place_to_be_displayed === "share_link"),
    [allPromoContent]
  );

  const refreshPromoContent = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    const result = await getPromoContent();
    if (!result.success) {
      setListError(result.error || "Unable to load content");
      setAllPromoContent([]);
      setIsLoading(false);
      return;
    }
    setAllPromoContent(result.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshPromoContent();
  }, [refreshPromoContent]);

  const handleCreateInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateForm = (location: PromoLocation) => {
    setActionError(null);
    setCreateForm(buildInitialForm(location));
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setCreateForm(buildInitialForm());
    setActionError(null);
  };

  const openEditModal = (item: PromoContent) => {
    setActionError(null);
    setItemToEdit(item);
    setEditForm(toFormData(item));
  };

  const closeEditModal = () => {
    setItemToEdit(null);
    setEditForm(buildInitialForm());
    setIsEditing(false);
    setActionError(null);
  };

  const closeDeleteModal = () => {
    setItemToDelete(null);
    setIsDeleting(false);
    setActionError(null);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMessage(null);

    if (!createForm.content.trim()) {
      setActionError("Content cannot be empty");
      return;
    }

    setIsCreating(true);
    const result = await createPromoContent({
      content: createForm.content,
      place_to_be_displayed: createForm.place_to_be_displayed,
    });

    if (!result.success) {
      setActionError(result.error || "Failed to add content");
      setIsCreating(false);
      return;
    }

    setSuccessMessage("Content added successfully.");
    closeCreateForm();
    setIsCreating(false);
    await refreshPromoContent();
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!itemToEdit) return;

    setActionError(null);
    setSuccessMessage(null);

    if (!editForm.content.trim()) {
      setActionError("Content cannot be empty");
      return;
    }

    setIsEditing(true);
    const result = await updatePromoContent(itemToEdit.id, {
      content: editForm.content,
      place_to_be_displayed: editForm.place_to_be_displayed,
    });

    if (!result.success) {
      setActionError(result.error || "Failed to update content");
      setIsEditing(false);
      return;
    }

    setSuccessMessage("Content updated successfully.");
    closeEditModal();
    await refreshPromoContent();
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setActionError(null);
    setSuccessMessage(null);
    setIsDeleting(true);

    const result = await deletePromoContent(itemToDelete.id);
    if (!result.success) {
      setActionError(result.error || "Failed to delete content");
      setIsDeleting(false);
      return;
    }

    setSuccessMessage("Content deleted successfully.");
    closeDeleteModal();
    await refreshPromoContent();
  };

  const renderContentList = (items: PromoContent[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="py-8 text-center text-sm text-gray-600">Loading content...</div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="py-8 text-center text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-500 mb-1">Line {index + 1}</p>
              <p className="text-sm text-gray-900 wrap-break-word">{item.content}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => openEditModal(item)}
                className="p-2 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                aria-label="Edit content"
              >
                <Pen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setItemToDelete(item);
                }}
                className="p-2 rounded-md border border-red-300 bg-white text-red-600 hover:bg-red-50"
                aria-label="Delete content"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLocationField = (
    value: PromoLocation,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void,
    name = "place_to_be_displayed"
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Display location</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
      >
        {LOCATION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2 pb-4 border-b border-black">
        <h1 className="text-3xl font-bold">Website Assets</h1>
        <p className="text-xl font-bold">Manage your assets here</p>
      </div>

      {successMessage && <div className={SUCCESS_BANNER_CLASS}>{successMessage}</div>}
      {listError && <div className={ERROR_BANNER_CLASS}>{listError}</div>}

      {/* promotion bar content management starts here */}

      <div className="flex flex-col gap-4 pb-4 border border-dashed border-black rounded-lg p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-bold">Promotion Bar Content</h2>
            <button
              type="button"
              onClick={() => openCreateForm("promotion_banner")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Add Promotion Line
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-900">**Preview of the section that will be affected**</p>
          </div>

          <img
            src={PROMOTION_PREVIEW_IMAGE}
            alt="Promotion bar placement preview"
            className="w-full h-full object-contain"
          />

          {renderContentList(
            promotionLines,
            "No promotion lines yet. Add your first line to show in the top banner."
          )}
        </div>
      </div>

      {/* share link content management starts here */}

      <div className="flex flex-col gap-4 pb-4 border border-dashed border-black rounded-lg p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-bold">Share Link Content</h2>
            <button
              type="button"
              onClick={() => openCreateForm("share_link")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Add Share Link Content
            </button>
          </div>

          {renderContentList(
            shareLines,
            "No share link content yet. Add content to show in the share section."
          )}
        </div>
      </div>


      {/* Hero Section Content Management Starts Here */}

      <div className="flex flex-col gap-4 pb-4 border border-dashed border-black rounded-lg p-4">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Hero Section</h2>
          <p className="text-sm text-red-900">**Preview of the section that will be affected**</p>
        </div>
        <img src="https://images.thejwel.in/website_section_images/Screenshot%202026-06-15%20234648.png" alt="Hero Section" className="w-full h-full object-contain" />
        <WebsiteImageSectionPanel
          sectionName="homepage_hero"
          title="Hero Section"
          description="Upload and manage carousel images for the homepage hero banner."
        />
      </div>

      {/* Hero Section Content Management Ends Here */}

      {/* Image Gallery Content Management Starts Here */}

      <div className="flex flex-col gap-4 pb-4 border border-dashed border-black rounded-lg p-4">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Image Gallery</h2>
          <p className="text-sm text-red-900">**Preview of the section that will be affected**</p>
        </div>
        <img src="https://images.thejwel.in/website_section_images/Screenshot%202026-06-16%20013934.png" alt="Image Gallery" className="w-full h-full object-contain" />
        <WebsiteImageSectionPanel
          sectionName="homepage_image_gallery"
          title="Image Gallery"
          description="Upload and manage carousel images for the homepage image gallery."
        />
      </div>

      {/* Image Gallery Content Management Ends Here */}

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/55"
            onClick={closeCreateForm}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Content</h3>
              <button
                type="button"
                onClick={closeCreateForm}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {actionError && <div className={`mt-4 ${ERROR_BANNER_CLASS}`}>{actionError}</div>}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              {renderLocationField(createForm.place_to_be_displayed, handleCreateInput)}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea
                  name="content"
                  value={createForm.content}
                  onChange={handleCreateInput}
                  rows={3}
                  placeholder="Write your content here..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Saving..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/55"
            onClick={closeEditModal}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Content</h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {actionError && <div className={`mt-4 ${ERROR_BANNER_CLASS}`}>{actionError}</div>}

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              {renderLocationField(editForm.place_to_be_displayed, handleEditInput)}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea
                  name="content"
                  value={editForm.content}
                  onChange={handleEditInput}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/55"
            onClick={closeDeleteModal}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">Delete content?</h3>
            <p className="mt-2 text-sm text-slate-600 wrap-break-word">
              &ldquo;{itemToDelete.content}&rdquo;
            </p>
            {actionError && <div className={`mt-4 ${ERROR_BANNER_CLASS}`}>{actionError}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
