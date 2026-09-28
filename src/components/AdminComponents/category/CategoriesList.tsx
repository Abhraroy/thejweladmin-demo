"use client"

import React, { useState } from 'react';
import { deleteCategory, createSubCategory, updateSubCategory, deleteSubCategory } from "@/app/(admin)/actions/categories";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import useAdminStore from "../../../zustandStore/AdminZustandStore";
import { categoryWithSubCategories } from '@/types/RelationTypeInterface';
import { SubCategory } from '@/types/TypeInterface';
import OptimizedImage from '@/components/OptimizedImage';


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

const EditIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586Z" />
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

const ChevronDownIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);


export default function CategoriesList({ category, isDarkTheme }: { category: categoryWithSubCategories, isDarkTheme: boolean }) {
  const router = useRouter();
  const { setShowAddCategory, setSelectedCategory } = useAdminStore();
  const [showSubCategories, setShowSubCategories] = useState(false);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [subcategory_image_url_preview, setSubcategoryImageUrlPreview] = useState<string | null>(null);
  const [isEditingSubCategory, setIsEditingSubCategory] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    subcategory_id: '' as string | null,
    subcategory_name: '',
    category_id: '',
    subcategory_image_url: null as File | string | null | undefined,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleEdit = (categoryToEdit: categoryWithSubCategories) => {
    setSelectedCategory(categoryToEdit);
    setShowAddCategory(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        const result = await deleteCategory(categoryId);
        if (result.success) {
          router.refresh();
        } else {
          alert(`Failed to delete category: ${result.error}`);
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('An unexpected error occurred while deleting the category.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      return updated;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        subcategory_image_url: file,
      }));
      setSubcategoryImageUrlPreview(previewUrl);
    }
  };

  const removeImage = () => {
    if (subcategory_image_url_preview?.startsWith('blob:')) {
      URL.revokeObjectURL(subcategory_image_url_preview);
    }
    setFormData((prev) => ({
      ...prev,
      subcategory_image_url: null,
    }));
    setSubcategoryImageUrlPreview(null);
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
          subcategory_image_url: file,
        }));
        setSubcategoryImageUrlPreview(previewUrl);
      }
    }
  };

  const handleCancel = () => {
    if (subcategory_image_url_preview?.startsWith('blob:')) {
      URL.revokeObjectURL(subcategory_image_url_preview);
    }
    setFormData({
      subcategory_id: '',
      subcategory_name: '',
      category_id: '',
      subcategory_image_url: null,
      is_active: true,
    });
    setSubcategoryImageUrlPreview(null);
    setShowAddSubCategory(false);
    setIsEditingSubCategory(false);
  };

  const handleSubmit =
    (category_id: string) =>
    async (e: React.SubmitEvent) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        let imageUrl: string | undefined = undefined;

        if (formData.subcategory_image_url instanceof File) {
          const formDataToSend = new FormData();
          formDataToSend.append("file", formData.subcategory_image_url);
          formDataToSend.append("folder", "sub_categories");

          const response = await axios.post("/api/uploadImage", formDataToSend, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          if (!response.data.success || !response.data.url) {
            throw new Error(response.data.error || "Image upload failed");
          }

          imageUrl = response.data.url;
        } else if (typeof formData.subcategory_image_url === 'string') {
          imageUrl = formData.subcategory_image_url;
        }

        const formDataWithCategoryId = {
          ...formData,
          category_id: category_id,
          subcategory_image_url: imageUrl || formData.subcategory_image_url
        };

        if (isEditingSubCategory) {
          const result = await updateSubCategory(formDataWithCategoryId);
          if (result.success) {
            router.refresh();
            handleCancel();
            setShowAddSubCategory(false);
            setSubmitting(false);
            return;
          } else {
            alert(`Failed to update sub category: ${result?.error}`);
            setSubmitting(false);
            return;
          }
        }

        const result = await createSubCategory(formDataWithCategoryId);
        if (result.success) {
          router.refresh();
          handleCancel();
          setShowAddSubCategory(false);
        } else {
          alert(`Failed to create sub category: ${result?.error}`);
        }
      } catch (error) {
        console.error("Submit error:", error);
        alert(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    };

  const handleEditSubCategory = (subcategory_id: string, subcategory_name: string, subcategory_image_url: string | null | undefined, is_active: boolean | null | undefined) => {
    if (subcategory_id) {
      setFormData({
        subcategory_id: subcategory_id,
        subcategory_name: subcategory_name,
        category_id: '',
        subcategory_image_url: subcategory_image_url,
        is_active: is_active ?? true
      });
      setSubcategoryImageUrlPreview(subcategory_image_url || null);
      setIsEditingSubCategory(true);
      setShowAddSubCategory(true);
      setShowSubCategories(true);
    }
  };

  const handleDeleteSubCategory = async (subcategory_id: string) => {
    if (confirm('Are you sure you want to delete this sub category? This action cannot be undone.')) {
      const result = await deleteSubCategory(subcategory_id);
      if (result.success) {
        router.refresh();
      } else {
        alert(`Failed to delete sub category: ${result?.error}`);
      }
    }
  };

  const subCategoryCount = category?.sub_categories?.length ?? 0;

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-colors ${
        isDarkTheme ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
      }`}
    >
      {/* Category row */}
      <div
        className={`flex flex-wrap items-center gap-4 p-4 transition-colors ${
          isDarkTheme ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
        }`}
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative shrink-0">
          {category.category_image_url ? (
            <OptimizedImage
              src={category.category_image_url}
              alt={category.category_name}
              preset="thumbnail"
              fill
              objectFit="cover"
            />
          ) : (
            <ImageIcon className={`w-6 h-6 ${isDarkTheme ? 'text-gray-600' : 'text-gray-400'}`} />
          )}
        </div>

        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="min-w-0">
            <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'}`}>
              Name
            </p>
            <p className={`font-medium truncate ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
              {category.category_name}
            </p>
          </div>

          <div className="min-w-0">
            <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'}`}>
              Slug
            </p>
            <p className={`text-sm truncate ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
              {category.slug}
            </p>
          </div>

          <div className="min-w-0">
            <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'}`}>
              Description
            </p>
            <p className={`text-sm truncate ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`} title={category.description || ''}>
              {category.description || '—'}
            </p>
          </div>

          <div>
            <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'}`}>
              Status
            </p>
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
              category.is_active
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {category.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleEdit(category)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkTheme
                ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
            title="Edit"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(category.category_id)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkTheme
                ? 'hover:bg-red-900 text-red-400 hover:text-red-300'
                : 'hover:bg-red-50 text-red-600 hover:text-red-700'
            }`}
            title="Delete"
          >
            <DeleteIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSubCategories(!showSubCategories)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkTheme
                ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
            title={showSubCategories ? 'Hide sub categories' : 'Show sub categories'}
            aria-expanded={showSubCategories}
          >
            <ChevronDownIcon
              className={`w-5 h-5 transition-transform duration-200 ${showSubCategories ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Sub categories panel */}
      {showSubCategories && !showAddSubCategory && (
        <div className={`border-t px-4 py-4 ${isDarkTheme ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="mb-3">
            {subCategoryCount > 0 ? (
              <span className={`text-sm ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                {subCategoryCount} sub categor{subCategoryCount === 1 ? 'y' : 'ies'}
              </span>
            ) : (
              <span className={`text-sm ${isDarkTheme ? 'text-gray-500' : 'text-gray-500'}`}>
                No sub categories added yet.
              </span>
            )}
          </div>

          {subCategoryCount > 0 && (
            <div className="space-y-2 mb-4">
              {category.sub_categories?.map((subCategory: SubCategory) => (
                <div
                  key={subCategory.subcategory_id}
                  className={`flex flex-wrap items-center gap-4 p-3 rounded-lg border ${
                    isDarkTheme ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="relative w-14 h-14 rounded-full shrink-0 overflow-hidden">
                    {subCategory.subcategory_image_url ? (
                      <OptimizedImage
                        src={subCategory.subcategory_image_url}
                        alt={subCategory.subcategory_name ?? ''}
                        preset="thumbnail"
                        fill
                        objectFit="cover"
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <ImageIcon className={`w-5 h-5 ${isDarkTheme ? 'text-gray-600' : 'text-gray-400'}`} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                      {subCategory.subcategory_name}
                    </p>
                  </div>

                  <span className={`text-xs font-medium px-2 py-1 rounded shrink-0 ${
                    subCategory.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {subCategory.is_active ? 'Active' : 'Inactive'}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkTheme
                          ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                          : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                      }`}
                      title="Edit sub category"
                      onClick={() => handleEditSubCategory(
                        subCategory.subcategory_id,
                        subCategory.subcategory_name ?? '',
                        subCategory.subcategory_image_url ?? '',
                        subCategory.is_active ?? true
                      )}
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkTheme
                          ? 'hover:bg-red-900 text-red-400 hover:text-red-300'
                          : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                      }`}
                      title="Delete sub category"
                      onClick={() => handleDeleteSubCategory(subCategory.subcategory_id)}
                    >
                      <DeleteIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkTheme
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Add Sub Category"
            onClick={() => setShowAddSubCategory(true)}
          >
            Add Sub Category
          </button>
        </div>
      )}

      {/* Add / Edit sub category form */}
      {showAddSubCategory && (
        <div className={`border-t p-6 ${isDarkTheme ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <h3 className={`text-xl font-semibold mb-6 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
            {isEditingSubCategory ? 'Edit Sub Category' : 'Add New Sub Category'}
          </h3>

          <form onSubmit={handleSubmit(category.category_id)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
                  Sub Category Name *
                </label>
                <input
                  type="text"
                  name="subcategory_name"
                  value={formData.subcategory_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Gold Rings, Silver Necklaces"
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDarkTheme
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-[#E94E8B]`}
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`is_active_sub_${category.category_id}`}
                  name="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-[#E94E8B] bg-gray-100 border-gray-300 rounded focus:ring-[#E94E8B] focus:ring-2"
                />
                <label
                  htmlFor={`is_active_sub_${category.category_id}`}
                  className={`ml-2 text-sm font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Active
                </label>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
                Sub Category Image
              </label>
              {!subcategory_image_url_preview ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDarkTheme ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <ImageIcon
                    className={`w-12 h-12 mx-auto mb-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-400'}`}
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
                    id={`sub-category-image-upload-${category.category_id}`}
                  />
                  <label
                    htmlFor={`sub-category-image-upload-${category.category_id}`}
                    className="mt-4 inline-block px-4 py-2 bg-[#E94E8B] text-white rounded-lg cursor-pointer hover:bg-[#d43d75] transition-colors"
                  >
                    {isEditingSubCategory ? 'Change Image' : 'Select Image'}
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    className={`w-full h-72 rounded-lg border overflow-hidden flex items-center justify-center ${
                      isDarkTheme ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <img
                      src={subcategory_image_url_preview}
                      alt="Sub category preview"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => document.getElementById(`sub-category-image-upload-${category.category_id}`)?.click()}
                      className="px-4 py-2 bg-[#E94E8B] text-white rounded-lg cursor-pointer hover:bg-[#d43d75] transition-colors"
                    >
                      {isEditingSubCategory ? 'Update Image' : 'Change Image'}
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
                    {formData.subcategory_image_url instanceof File ? 'New image selected' : 'Current image'}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id={`sub-category-image-upload-${category.category_id}`}
                  />
                </div>
              )}
            </div>

            <div className={`flex justify-end gap-4 pt-4 border-t ${isDarkTheme ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={handleCancel}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isDarkTheme
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
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
                {submitting ? 'Saving...' : (isEditingSubCategory ? 'Update Sub Category' : 'Add Sub Category')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
