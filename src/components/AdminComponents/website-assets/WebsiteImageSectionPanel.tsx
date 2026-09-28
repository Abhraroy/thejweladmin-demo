"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pen, Trash2 } from "lucide-react";
import {
  deleteImageResource,
  getImageResourcesBySection,
  saveImageResource,
  updateImageResource,
  type ImageResourceRecord,
} from "@/app/(admin)/actions/resources";

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;

const INPUT_CLASS =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-400 bg-white";
const PRIMARY_BTN_CLASS =
  "px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed";
const SECONDARY_BTN_CLASS =
  "px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50";
const SUCCESS_BANNER_CLASS =
  "text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3";
const ERROR_BANNER_CLASS =
  "text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3";

type WebsiteImageSectionPanelProps = {
  sectionName: string;
  title: string;
  description?: string;
};

export default function WebsiteImageSectionPanel({
  sectionName,
  title,
  description,
}: WebsiteImageSectionPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageEditFileInputRef = useRef<HTMLInputElement | null>(null);

  const [folder, setFolder] = useState("resources");
  const [redirectRoute, setRedirectRoute] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | "saved" | "not_saved">(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [imageResources, setImageResources] = useState<ImageResourceRecord[]>([]);
  const [isImageResourcesLoading, setIsImageResourcesLoading] = useState(true);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [sectionSuccess, setSectionSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [imageResourceToEdit, setImageResourceToEdit] = useState<ImageResourceRecord | null>(null);
  const [imageEditRedirectRoute, setImageEditRedirectRoute] = useState("");
  const [imageEditFolder, setImageEditFolder] = useState("resources");
  const [imageEditFile, setImageEditFile] = useState<File | null>(null);
  const [imageEditPreviewUrl, setImageEditPreviewUrl] = useState<string | null>(null);
  const [imageEditError, setImageEditError] = useState<string | null>(null);
  const [isImageEditSaving, setIsImageEditSaving] = useState(false);

  const [imageResourceToDelete, setImageResourceToDelete] = useState<ImageResourceRecord | null>(
    null
  );

  const fileMeta = useMemo(() => {
    if (!file) return null;
    return {
      name: file.name,
      type: file.type,
      sizeMb: (file.size / (1024 * 1024)).toFixed(2),
    };
  }, [file]);

  const refreshImageResources = useCallback(async () => {
    setIsImageResourcesLoading(true);
    setSectionError(null);
    const result = await getImageResourcesBySection(sectionName);
    if (!result.success) {
      setSectionError(result.error || "Unable to load images");
      setImageResources([]);
    } else {
      setImageResources(result.data ?? []);
    }
    setIsImageResourcesLoading(false);
  }, [sectionName]);

  useEffect(() => {
    refreshImageResources();
  }, [refreshImageResources]);

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
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const uploadResourceImage = async () => {
    if (!file) {
      setError("Please choose an image before uploading.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadedUrl(null);
    setUploadedKey(null);
    setCopied(false);
    setSaveStatus(null);
    setSaveError(null);
    setSectionSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (folder.trim()) formData.append("folder", folder.trim());
      formData.append("sectionName", sectionName);

      const res = await fetch("/api/uploadImage", {
        method: "POST",
        body: formData,
      });

      const data: { success?: boolean; url?: string; key?: string; error?: string } =
        await res.json();
      if (!res.ok || !data?.success || !data?.url) {
        throw new Error(data?.error || "Upload failed");
      }

      setUploadedUrl(data.url);
      setUploadedKey(data.key ?? null);

      const result = await saveImageResource({
        image_link: data.url,
        section_name: sectionName,
        redirect_route: redirectRoute.trim() || undefined,
      });

      if (!result.success) {
        setSaveStatus("not_saved");
        setSaveError(result.error ?? "Failed to save to database");
      } else {
        setSaveStatus("saved");
        setSectionSuccess("Image uploaded and saved successfully.");
        resetSelection();
        await refreshImageResources();
      }
    } catch (err) {
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

  const openImageEditModal = (resource: ImageResourceRecord) => {
    if (imageEditPreviewUrl) URL.revokeObjectURL(imageEditPreviewUrl);
    setImageResourceToEdit(resource);
    setImageEditRedirectRoute(resource.redirect_route ?? "");
    setImageEditFolder("resources");
    setImageEditFile(null);
    setImageEditPreviewUrl(null);
    setImageEditError(null);
    setSectionError(null);
    setSectionSuccess(null);
    if (imageEditFileInputRef.current) imageEditFileInputRef.current.value = "";
  };

  const closeImageEditModal = () => {
    setImageResourceToEdit(null);
    setImageEditRedirectRoute("");
    setImageEditFolder("resources");
    setImageEditFile(null);
    if (imageEditPreviewUrl) URL.revokeObjectURL(imageEditPreviewUrl);
    setImageEditPreviewUrl(null);
    setImageEditError(null);
    setIsImageEditSaving(false);
    if (imageEditFileInputRef.current) imageEditFileInputRef.current.value = "";
  };

  const handleImageEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0] ?? null;

    if (imageEditPreviewUrl) URL.revokeObjectURL(imageEditPreviewUrl);
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

    setImageEditFile(nextFile);
    setImageEditPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleUpdateImageResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageResourceToEdit) return;

    setImageEditError(null);
    setSectionError(null);
    setSectionSuccess(null);
    setIsImageEditSaving(true);

    try {
      let nextImageLink: string | undefined;

      if (imageEditFile) {
        const formData = new FormData();
        formData.append("file", imageEditFile);
        if (imageEditFolder.trim()) formData.append("folder", imageEditFolder.trim());
        formData.append("sectionName", sectionName);

        const res = await fetch("/api/uploadImage", {
          method: "POST",
          body: formData,
        });
        const data: { success?: boolean; url?: string; error?: string } = await res.json();

        if (!res.ok || !data?.success || !data?.url) {
          throw new Error(data?.error || "Upload failed");
        }
        nextImageLink = data.url;
      }

      const result = await updateImageResource({
        id: imageResourceToEdit.id,
        section_name: sectionName,
        redirect_route: imageEditRedirectRoute.trim() || undefined,
        image_link: nextImageLink,
      });

      if (!result.success) {
        setImageEditError(result.error || "Failed to update image");
        setIsImageEditSaving(false);
        return;
      }

      setSectionSuccess("Image updated successfully.");
      await refreshImageResources();
      closeImageEditModal();
    } catch (err) {
      setImageEditError(err instanceof Error ? err.message : "Failed to update image");
      setIsImageEditSaving(false);
    }
  };

  const handleDeleteImageResource = async () => {
    if (!imageResourceToDelete) return;

    setSectionError(null);
    setSectionSuccess(null);
    setDeletingId(imageResourceToDelete.id);

    const result = await deleteImageResource(imageResourceToDelete.id);
    if (!result.success) {
      setSectionError(result.error || "Failed to delete image");
    } else {
      setSectionSuccess("Image deleted successfully.");
      await refreshImageResources();
    }

    setDeletingId(null);
    setImageResourceToDelete(null);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div>
          {description ? <p className="text-sm text-gray-600 mt-1">{description}</p> : null}
        </div>

        {sectionSuccess && <div className={SUCCESS_BANNER_CLASS}>{sectionSuccess}</div>}
        {sectionError && <div className={ERROR_BANNER_CLASS}>{sectionError}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-white">
            <h3 className="text-sm font-bold text-gray-900">Upload Image</h3>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Redirect route (optional)
              </label>
              <input
                value={redirectRoute}
                onChange={(e) => setRedirectRoute(e.target.value)}
                placeholder="e.g. /products/sale"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Folder (optional)
              </label>
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="e.g. resources/home"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Image</label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={SECONDARY_BTN_CLASS}
                >
                  Choose image
                </button>
                <span className="text-xs text-gray-500">
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
              <p className="text-xs text-gray-500 mt-1">Max size: 8MB.</p>
            </div>

            {fileMeta && (
              <div className="text-xs text-gray-600 rounded-lg bg-gray-50 border border-gray-200 p-3">
                <div>
                  <span className="font-semibold">Selected:</span> {fileMeta.name}
                </div>
                <div>
                  <span className="font-semibold">Type:</span> {fileMeta.type}
                </div>
                <div>
                  <span className="font-semibold">Size:</span> {fileMeta.sizeMb} MB
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={uploadResourceImage}
                disabled={isUploading || !file}
                className={PRIMARY_BTN_CLASS}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
              <button type="button" onClick={resetSelection} className={SECONDARY_BTN_CLASS}>
                Clear
              </button>
            </div>

            {error && <div className={ERROR_BANNER_CLASS}>{error}</div>}

            {uploadedUrl && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="text-sm font-semibold text-gray-900">Uploaded</div>
                {redirectRoute.trim() && (
                  <div className="mt-2 text-xs text-gray-600 break-all">
                    <span className="font-semibold">Redirect route:</span> {redirectRoute.trim()}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-600 break-all">
                  <span className="font-semibold">URL:</span> {uploadedUrl}
                </div>
                {uploadedKey && (
                  <div className="mt-1 text-xs text-gray-600 break-all">
                    <span className="font-semibold">Key:</span> {uploadedKey}
                  </div>
                )}
                {saveStatus && (
                  <div
                    className={
                      saveStatus === "saved"
                        ? `mt-3 ${SUCCESS_BANNER_CLASS}`
                        : `mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3`
                    }
                  >
                    {saveStatus === "saved" ? (
                      <>Saved to Supabase (`image_resources`).</>
                    ) : (
                      <>
                        Uploaded to Cloudflare, but not saved to Supabase.
                        {saveError ? (
                          <div className="mt-1 text-xs break-all">
                            <span className="font-semibold">Reason:</span> {saveError}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={copyUrl} className={SECONDARY_BTN_CLASS}>
                    {copied ? "Copied!" : "Copy URL"}
                  </button>
                  <a
                    href={uploadedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={SECONDARY_BTN_CLASS}
                  >
                    Open
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="text-sm font-bold text-gray-900">Preview</div>
            <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden aspect-video flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-sm text-gray-500">Select an image to preview</div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900">Uploaded Images</h3>
            <button
              type="button"
              onClick={refreshImageResources}
              disabled={isImageResourcesLoading}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {isImageResourcesLoading ? (
            <div className="py-6 text-center text-sm text-gray-600">Loading images...</div>
          ) : imageResources.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg">
              No images uploaded for this section yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {imageResources.map((resource) => (
                <article
                  key={resource.id}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                >
                  <div className="aspect-video bg-gray-100 relative">
                    {resource.image_link ? (
                      <img
                        src={resource.image_link}
                        alt={title}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={
                          () => {
                            window.open(resource.image_link ?? "", "_blank");
                          }
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    {resource.redirect_route && (
                      <div className="text-xs text-gray-500 truncate">→ {resource.redirect_route}</div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openImageEditModal(resource)}
                        className="p-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50
                        cursor-pointer"
                        aria-label="Edit image"
                      >
                        <Pen className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageResourceToDelete(resource)}
                        disabled={deletingId === resource.id}
                        className="p-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                        aria-label="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {imageResourceToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/55"
            onClick={closeImageEditModal}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Edit Image</h3>
              <button
                type="button"
                onClick={closeImageEditModal}
                className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUpdateImageResource} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Redirect route (optional)
                </label>
                <input
                  value={imageEditRedirectRoute}
                  onChange={(e) => setImageEditRedirectRoute(e.target.value)}
                  placeholder="e.g. /products/sale"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Folder (optional for new upload)
                </label>
                <input
                  value={imageEditFolder}
                  onChange={(e) => setImageEditFolder(e.target.value)}
                  placeholder="e.g. resources/home"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Replace image (optional)
                </label>
                <input
                  ref={imageEditFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageEditFileChange}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-gray-300 file:bg-white file:text-gray-700 file:font-semibold"
                />
                {imageEditPreviewUrl ? (
                  <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={imageEditPreviewUrl}
                      alt="New image preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}
              </div>

              {imageEditError && <div className={ERROR_BANNER_CLASS}>{imageEditError}</div>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeImageEditModal} className={SECONDARY_BTN_CLASS}>
                  Cancel
                </button>
                <button type="submit" disabled={isImageEditSaving} className={PRIMARY_BTN_CLASS}>
                  {isImageEditSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {imageResourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/55"
            onClick={() => setImageResourceToDelete(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900">Delete image?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This removes the image from storage and the database.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImageResourceToDelete(null)}
                disabled={deletingId !== null}
                className={SECONDARY_BTN_CLASS}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteImageResource}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId !== null ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
