'use client';

import React, { useState } from 'react';
import OptimizedImage from '@/components/OptimizedImage';
import { ImageIcon, Pencil, Trash2 } from 'lucide-react';

type StyleOccasionItem = Record<string, unknown>;

type StyleOccasionCardProps = {
  item: StyleOccasionItem;
  nameField: string;
  imageField: string;
  entityLabel: string;
  onEdit: (item: StyleOccasionItem) => void;
  onDelete: (item: StyleOccasionItem) => void;
};

export default function StyleOccasionCard({
  item,
  nameField,
  imageField,
  entityLabel,
  onEdit,
  onDelete,
}: StyleOccasionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const name = String(item[nameField] ?? '');
  const imageLink = item[imageField] as string | null | undefined;
  const isActive = Boolean(item.is_active);

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="relative aspect-square bg-gray-50">
          {imageLink ? (
            <OptimizedImage
              src={imageLink}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}

          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="rounded-md bg-white/90 p-1.5 text-gray-700 shadow hover:bg-white"
              aria-label={`Edit ${entityLabel}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-md bg-white/90 p-1.5 text-red-600 shadow hover:bg-white"
              aria-label={`Delete ${entityLabel}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-3">
          <p className="truncate text-sm font-medium text-gray-900" title={name}>
            {name}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete {entityLabel}?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete &quot;{name}&quot;? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete(item);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
