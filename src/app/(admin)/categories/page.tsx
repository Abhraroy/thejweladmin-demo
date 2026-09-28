
import CategoryHeader from "@/components/AdminComponents/category/CategoryHeader";
import CategoriesList from "@/components/AdminComponents/category/CategoriesList";
import Categories from "@/components/AdminComponents/category/Categories";
import { getCategories } from "./action";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoriesPage() {
  const isDarkTheme = false;

  const { success, data: categoriesData, message } = await getCategories();
  if (!success) {
    console.error('Error fetching categories:', message);
    return <div>Error fetching categories: {message}</div>;
  }

  return <>
    <div className="p-6">
      <CategoryHeader isDarkTheme={false} />
      <Categories isDarkTheme={false} />
      <div
        className={`${isDarkTheme ? 'bg-black border border-gray-700' : 'bg-white'
          } rounded-lg shadow p-6`}
      >
        <h2 className={`text-xl font-semibold mb-2 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
          Main Categories ({categoriesData?.length || 0})
        </h2>
        <p className={`text-sm mb-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
          Manage your jewelry categories.
        </p>

        {categoriesData?.length === 0 ? (
          <div className={`text-center py-12 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
            No categories added yet. Click &quot;Add Category&quot; to create your first category.
          </div>
        ) : (
          <div className="space-y-4">
            {categoriesData?.map((category: any) => (
              <CategoriesList key={category.category_id} category={category} isDarkTheme={isDarkTheme} />
            ))}
          </div>
        )}
      </div>
    </div>
  </>
}

