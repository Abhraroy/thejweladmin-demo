import { create } from "zustand";

interface AdminStoreState {
    categories: any;
    setCategories: (categories: any) => void;
    showAddCategory: boolean;
    setShowAddCategory: (showAddCategory: boolean) => void;
    editingCategory: boolean;
    setEditingCategory: (editingCategory: boolean) => void;
    selectedCategory: any | null;
    setSelectedCategory: (category: any | null) => void;
    formData: any;
    setFormData: (formData: any) => void;
    submitting: boolean;
    setSubmitting: (submitting: boolean) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    error: string;
    setError: (error: string) => void;
    showAddProduct: boolean;
    setShowAddProduct: (showAddProduct: boolean) => void;
    selectedProduct: any | null;
    setSelectedProduct: (product: any | null) => void;
    editingProduct: any | null;
    setEditingProduct: (product: any | null) => void;
}

const useAdminStore = create<AdminStoreState>((set) => ({
    categories: [],
    setCategories: (categories: any) => set({ categories }),
    showAddCategory: false,
    setShowAddCategory: (showAddCategory: boolean) => set({ showAddCategory }),
    editingCategory: false,
    setEditingCategory: (editingCategory: boolean) => set({ editingCategory }),
    selectedCategory: null,
    setSelectedCategory: (category: any | null) => set({ selectedCategory: category }),
    formData: {},
    setFormData: (formData: any) => set({ formData }),
    submitting: false,
    setSubmitting: (submitting: boolean) => set({ submitting }),
    loading: false,
    setLoading: (loading: boolean) => set({ loading }),
    error: '',
    setError: (error: string) => set({ error }),
    showAddProduct: false,
    setShowAddProduct: (showAddProduct: boolean) => set({ showAddProduct }),
    selectedProduct: null,
    setSelectedProduct: (product: any | null) => set({ selectedProduct: product }),
    editingProduct: null,
    setEditingProduct: (product: any | null) => set({ editingProduct: product }),
}))


export default useAdminStore;