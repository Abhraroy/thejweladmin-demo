'use client';

import React, { useEffect, useState } from 'react';
import OptimizedImage from '@/components/OptimizedImage';
import { ImageIcon, X } from 'lucide-react';

type StyleOccasionItem = Record<string, unknown>;

type StyleOccasionFormModalProps = {
  open: boolean;
  entityLabel: string;
  nameField: 'style_name' | 'occasion_name';
  editingItem: StyleOccasionItem | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    slug: string;
    image: File | string | null | undefined;
    removeImage: boolean;
    is_active: boolean;
  }) => Promise<void>;
};

export default function StyleOccasionFormModal({
  open,
  entityLabel,
  nameField,
  editingItem,
  onClose,
  onSubmit,
}: StyleOccasionFormModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingItem) {
      setName(String(editingItem[nameField] ?? ''));
      setSlug(String(editingItem.slug ?? ''));
      setImage(null);
      setImagePreview(String(editingItem.image_link ?? ''));
      setRemoveImage(false);
      setIsActive(Boolean(editingItem.is_active ?? true));
    } else {
      setName('');
      setSlug('');
      setImage(null);
      setImagePreview('');
      setRemoveImage(false);
      setIsActive(true);
    }
  }, [open, editingItem, nameField]);

  if (!open) return null;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingItem) {
      setSlug(
        value
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, ''),
      );
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview && image) {
      URL.revokeObjectURL(imagePreview);
    }
    setImage(null);
    setImagePreview('');
    setRemoveImage(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      let imagePayload: File | string | null | undefined = image ?? undefined;
      if (removeImage) {
        imagePayload = null;
      } else if (!image && imagePreview && editingItem) {
        imagePayload = imagePreview;
      }

      await onSubmit({
        name: name.trim(),
        slug: slug.trim(),
        image: imagePayload,
        removeImage,
        is_active: isActive,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingItem ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E94E8B]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Slug *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E94E8B]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Image (optional)
            </label>
            {imagePreview ? (
              <div className="relative mb-3 aspect-square w-full max-w-xs overflow-hidden rounded-lg border border-gray-200">
                <OptimizedImage
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="mb-3 flex aspect-square w-full max-w-xs items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#E94E8B] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#d4437c]"
              />
              {imagePreview && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-[#E94E8B] focus:ring-[#E94E8B]"
            />
            Active
          </label>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#E94E8B] px-4 py-2 text-sm font-medium text-white hover:bg-[#d4437c] disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
