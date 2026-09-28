"use client";

import useAdminStore from "@/zustandStore/AdminZustandStore";
import ProductForm from "@/components/AdminComponents/product/Products";
import ProductCatalogueList from "@/components/AdminComponents/product/ProductCatalogueList";
import ProductDetailPanel from "@/components/AdminComponents/product/ProductDetailPanel";

interface ProductsManagementProps {
  products: any[];
}

const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export default function ProductsManagement({ products }: ProductsManagementProps) {
  const { showAddProduct, setShowAddProduct, setEditingProduct } = useAdminStore();

  const handleAddProductClick = () => {
    if (showAddProduct) {
      setShowAddProduct(false);
      setEditingProduct(null);
    } else {
      setEditingProduct(null);
      setShowAddProduct(true);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <header className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Products Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your jewelry products, categories, and inventory
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddProductClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-[#E94E8B] text-white hover:bg-[#d43d75]"
        >
          {!showAddProduct && <PlusIcon className="w-5 h-5" />}
          {showAddProduct ? "Cancel" : "Add Product"}
        </button>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-4">
        <div className="w-full lg:flex-[0_0_48%] lg:max-w-[720px] shrink-0 flex flex-col min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <ProductCatalogueList products={products} />
        </div>
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <ProductDetailPanel products={products} />
        </div>
      </div>

      <ProductForm isDarkTheme={false} />
    </div>
  );
}
