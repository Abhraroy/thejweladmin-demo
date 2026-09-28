'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import StyleOccasionCard from './StyleOccasionCard';
import StyleOccasionFormModal from './StyleOccasionFormModal';

type StyleOccasionItem = Record<string, unknown>;

type StyleOccasionActions = {
  create: (data: any) => Promise<{ success: boolean; error?: string }>;
  update: (data: any) => Promise<{ success: boolean; error?: string }>;
  delete: (id: string) => Promise<{ success: boolean; error?: string }>;
};

export type StyleOccasionPageConfig = {
  title: string;
  subtitle: string;
  entityLabel: string;
  nameField: 'style_name' | 'occasion_name';
  idField: 'style_id' | 'occasion_id';
  imageField: 'image_link';
  actions: StyleOccasionActions;
};

type StyleOccasionManagementPageProps = {
  config: StyleOccasionPageConfig;
  initialData: StyleOccasionItem[];
};

export default function StyleOccasionManagementPage({
  config,
  initialData,
}: StyleOccasionManagementPageProps) {
  const router = useRouter();
  const [items, setItems] = useState<StyleOccasionItem[]>(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StyleOccasionItem | null>(null);

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  const activeCount = useMemo(
    () => items.filter((item) => Boolean(item.is_active)).length,
    [items],
  );

  const refreshList = () => {
    router.refresh();
  };

  const handleCreateOrUpdate = async (payload: {
    name: string;
    slug: string;
    image: File | string | null | undefined;
    removeImage: boolean;
    is_active: boolean;
  }) => {
    if (editingItem) {
      const result = await config.actions.update({
        [config.idField]: editingItem[config.idField],
        [config.nameField]: payload.name,
        slug: payload.slug,
        image_link: payload.removeImage ? null : payload.image,
        is_active: payload.is_active,
      });

      if (!result.success) {
        alert(result.error ?? `Failed to update ${config.entityLabel.toLowerCase()}`);
        return;
      }
    } else {
      const result = await config.actions.create({
        [config.nameField]: payload.name,
        slug: payload.slug,
        image_link: payload.image ?? null,
        is_active: payload.is_active,
      });

      if (!result.success) {
        alert(result.error ?? `Failed to create ${config.entityLabel.toLowerCase()}`);
        return;
      }
    }

    setModalOpen(false);
    setEditingItem(null);
    refreshList();
  };

  const handleDelete = async (item: StyleOccasionItem) => {
    const id = String(item[config.idField]);
    const result = await config.actions.delete(id);

    if (!result.success) {
      alert(result.error ?? `Failed to delete ${config.entityLabel.toLowerCase()}`);
      return;
    }

    setItems((prev) => prev.filter((row) => String(row[config.idField]) !== id));
    refreshList();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          <p className="mt-1 text-sm text-gray-600">{config.subtitle}</p>
          <p className="mt-2 text-sm text-gray-500">
            {activeCount} active / {items.length} total
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#E94E8B] px-4 py-2 text-sm font-medium text-white hover:bg-[#d4437c]"
        >
          <Plus className="h-4 w-4" />
          Add {config.entityLabel}
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {items.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No {config.entityLabel.toLowerCase()}s yet. Click &quot;Add {config.entityLabel}&quot; to create one.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <StyleOccasionCard
                key={String(item[config.idField])}
                item={item}
                nameField={config.nameField}
                imageField={config.imageField}
                entityLabel={config.entityLabel}
                onEdit={(row) => {
                  setEditingItem(row);
                  setModalOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <StyleOccasionFormModal
        open={modalOpen}
        entityLabel={config.entityLabel}
        nameField={config.nameField}
        editingItem={editingItem}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleCreateOrUpdate}
      />
    </div>
  );
}
