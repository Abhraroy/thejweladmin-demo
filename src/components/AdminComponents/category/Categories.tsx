'use client';

import React, { useState, useEffect } from 'react';
import { createCategory, updateCategory, type Category, type CreateCategoryData, type UpdateCategoryData } from "@/app/(admin)/actions";
import OptimizedImage from '@/components/OptimizedImage';
import { useRouter } from 'next/navigation';
import useAdminStore from '../../../zustandStore/AdminZustandStore';
import axios from 'axios';

// Icon Components
const ImageIcon = ({ className = 'w-5 h-5' }) => (
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

const DeleteIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

interface CategoriesProps {
  isDarkTheme: boolean;
  category?: Category; // Optional category for editing
}

export default function Categories({ isDarkTheme, category }: CategoriesProps) {
  const router = useRouter();
  const { showAddCategory, setShowAddCategory, selectedCategory, setSelectedCategory } = useAdminStore();
  const editingCategory = category ?? selectedCategory;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category_name: '',
    slug: '',
    description: '',
    image: null as File | null,
    imagePreview: '',
    is_active: true,
  });

  // Initialize form when category prop changes (for editing)
  useEffect(() => {
    if (editingCategory) {
      setFormData({
        category_name: editingCategory.category_name,
        slug: editingCategory.slug,
        description: editingCategory.description || '',
        image: null,
        imagePreview: editingCategory.category_image_url || '',
        is_active: editingCategory.is_active,
      });
    } else {
      // Reset form for new category
      setFormData({
        category_name: '',
        slug: '',
        description: '',
        image: null,
        imagePreview: '',
        is_active: true,
      });
    }
  }, [editingCategory]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-generate slug from category name
      if (name === 'category_name') {
        updated.slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }

      return updated;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        image: file,
        imagePreview: previewUrl,
      }));
    }
  };

  const removeImage = () => {
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setFormData((prev) => ({
      ...prev,
      image: null,
      imagePreview: '',
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setFormData((prev) => ({
          ...prev,
          image: file,
          imagePreview: previewUrl,
        }));
      }
    }
  };


  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let categoryImageUrl: string | null | undefined = undefined;

      // Upload image via API if it's a new file
      if (formData.image instanceof File) {
        const formDataToSend = new FormData();
        formDataToSend.append("file", formData.image);
        formDataToSend.append("folder", "categories");

        const response = await axios.post("/api/uploadImage", formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (!response.data.success || !response.data.url) {
          throw new Error(response.data.error || "Image upload failed");
        }

        categoryImageUrl = response.data.url;
      } else if (editingCategory && !formData.imagePreview) {
        // Explicit image removal in edit mode
        categoryImageUrl = null;
      }

      const categoryData: CreateCategoryData = {
        category_id: editingCategory?.category_id || '',
        category_name: formData.category_name,
        slug: formData.slug,
        description: formData.description || undefined,
        category_image_url: categoryImageUrl,
        is_active: formData.is_active,
      };

      if (editingCategory) {
        // Update existing category
        const updateData: UpdateCategoryData = {
          ...categoryData,
          category_id: editingCategory.category_id,
        };

        const result = await updateCategory(updateData);
        if (result.success) {
          router.refresh();
          handleCancel();
        } else {
          alert(`Failed to update category: ${result.error}`);
        }
      } else {
        // Create new category
        const result = await createCategory(categoryData);
        if (result.success) {
          router.refresh();
          handleCancel();
        } else {
          alert(`Failed to create category: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Clean up object URL if it exists
    if (formData.imagePreview && formData.image) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setFormData({
      category_name: '',
      slug: '',
      description: '',
      image: null,
      imagePreview: '',
      is_active: true,
    });
    setShowAddCategory(false);
    setSelectedCategory(null);
  };

  if (!showAddCategory) return null;

  return (
    <div
      id="admin-category-form"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Add/Edit Category Form (Modal) */}
      <div
        className={`relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto ${
          isDarkTheme ? 'bg-black border border-gray-700' : 'bg-white'
        } rounded-lg shadow-2xl p-6`}
        onClick={(e) => e.stopPropagation()}
      >
          <h2 className={`text-2xl font-bold mb-6 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="mb-8">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkTheme ? 'text-white' : 'text-gray-900'
                }`}
              >
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Name */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="category_name"
                    value={formData.category_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Ring, Necklace, Earring"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                    required
                  />
                </div>

                {/* Slug */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Slug *
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="e.g., ring, necklace, earring"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                    required
                  />
                  <p className={`text-xs mt-1 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                    Auto-generated from category name. Used in URLs.
                  </p>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkTheme ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the category..."
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      isDarkTheme
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                  />
                </div>

                {/* Is Active */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-[#E94E8B] bg-gray-100 border-gray-300 rounded focus:ring-[#E94E8B] focus:ring-2"
                  />
                  <label
                    htmlFor="is_active"
                    className={`ml-2 text-sm font-medium ${
                      isDarkTheme ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Active
                  </label>
                </div>
              </div>
            </div>

            {/* Category Image */}
            <div className="mb-8">
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkTheme ? 'text-white' : 'text-gray-900'
                }`}
              >
                Category Image *
              </h3>

              {!formData.imagePreview ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDarkTheme ? 'border-gray-700 hover:border-gray-600' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <ImageIcon
                    className={`w-12 h-12 mx-auto mb-4 ${
                      isDarkTheme ? 'text-gray-400' : 'text-gray-400'
                    }`}
                  />
                  <p className={`mb-2 ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className={`text-sm ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                    PNG, JPG, WEBP up to 5MB
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="category-image-upload"
                    required={!editingCategory}
                  />
                  <label
                    htmlFor="category-image-upload"
                    className="mt-4 inline-block px-4 py-2 bg-[#E94E8B] text-white rounded-lg cursor-pointer hover:bg-[#d43d75] transition-colors"
                  >
                    Select Image
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Preview box */}
                  <div
                    className={`relative w-full h-72 rounded-lg border overflow-hidden ${
                      isDarkTheme ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <OptimizedImage
                      src={formData.imagePreview}
                      alt="Category preview"
                      fill
                      objectFit="contain"
                      className="rounded-lg"
                    />
                  </div>

                  {/* Image actions */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => document.getElementById('category-image-upload')?.click()}
                      className="px-4 py-2 bg-[#E94E8B] text-white rounded-lg cursor-pointer hover:bg-[#d43d75] transition-colors"
                    >
                      {editingCategory ? 'Update Image' : 'Change Image'}
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDarkTheme
                          ? 'bg-red-900/40 text-red-200 hover:bg-red-900/60'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      Delete Image
                    </button>
                  </div>

                  <div className={`text-sm ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                    {formData.image ? 'New image selected' : 'Current image'}
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
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[#E94E8B] text-white rounded-lg font-medium hover:bg-[#d43d75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (editingCategory ? 'Update Category' : 'Add Category')}
              </button>
            </div>
          </form>
        </div>
    </div>
  );
}

