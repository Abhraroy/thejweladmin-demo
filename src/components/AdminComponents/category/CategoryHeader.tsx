"use client";
import useAdminStore from "../../../zustandStore/AdminZustandStore";
export default function CategoryHeader({isDarkTheme}: {isDarkTheme: boolean}) {
    const { showAddCategory, setShowAddCategory, setSelectedCategory } = useAdminStore();

const PlusIcon = ({ className = 'w-5 h-5' }) => (
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

    
    
    return <>
    <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className={`text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
        Categories Management
      </h1>
      <p className={`text-sm mt-1 ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
        Manage main categories and their subcategories for your jewelry collection
      </p>
    </div>
    <button
      onClick={() => {
        if (!showAddCategory) {
          // Opening "Add Category" should clear any previously selected category (edit mode)
          setSelectedCategory(null);
          setShowAddCategory(true);
        } else {
          // Closing
          setShowAddCategory(false);
          setSelectedCategory(null);
        }
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        isDarkTheme
          ? 'bg-[#E94E8B] text-white hover:bg-[#d43d75]'
          : 'bg-[#E94E8B] text-white hover:bg-[#d43d75]'
      }`}
    >
      {!showAddCategory?<PlusIcon className="w-5 h-5" />:""}
      {showAddCategory ? 'Cancel' : 'Add Category'}
    </button>
  </div>
  </>
}