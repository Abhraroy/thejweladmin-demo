"use client"
import ProductDetailPanel from "@/components/AdminComponents/product/ProductDetailPanel";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getProductDetails, getReviewsForProduct } from './action';


export default function ProductPage() {
  const params = useParams();
  const product_id = params?.product_id as string;
  const [productDetails, setProductDetails] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!product_id) {
      setError("Product ID is missing");
      setLoading(false);
      return;
    }

    const getProductdetails = async () => {
        
        const { success, data: productData, message } = await getProductDetails(product_id);
        if (!success) {
          setError(message);
          setProductDetails(null);
          return;
        }
        setProductDetails([productData ?? []]);
        setError(null);
        setLoading(false);
    };
    setLoading(true);
    getProductdetails();
    const reviewData = async () => {
      if (!product_id) return;
      
      const { success, data: reviewsData, message } = await getReviewsForProduct(product_id);
      if (!success) {
        setError(message ?? "Error fetching reviews");
        setReviews( [] as any[]);
        setLoading(false);
        return;
      }
      setReviews(reviewsData ?? [] as any[]);
      setLoading(false);
    };
    reviewData();
  }, [product_id]);



  if (loading) {
    return (
      <div className="min-h-screen bg-theme-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-sage mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !productDetails) {
    return (
      <div className="min-h-screen bg-theme-cream flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The product you're looking for doesn't exist."}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-theme-sage hover:bg-theme-olive text-white font-medium rounded-lg transition-colors duration-200"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-cream flex flex-col">
      {productDetails && Array.isArray(productDetails) && productDetails.length > 0 && (
        <ProductDetailPanel products={productDetails} />
      )}
    </div>
  );
}
