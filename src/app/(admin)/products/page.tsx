
import ProductsManagement from "@/components/AdminComponents/product/ProductsManagement";
import { getProducts } from "./action";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductsPage() {
  const { success, data: productsData, message } = await getProducts();

  if (!success) {
    return <div>Error fetching products: {message}</div>;
  }

  return (
    <div className="h-full p-6 overflow-hidden">
      <ProductsManagement products={productsData ?? []} />
    </div>
  );
}
