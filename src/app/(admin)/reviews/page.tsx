
import Reviews from "@/components/AdminComponents/review/Reviews";
import { getReviews } from "./action";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReviewsPage() {
  
  const { success, data: reviewsData, message } = await getReviews();

  if (!success) {
    console.error("Error fetching reviews:", message);
    return (
      <div className="w-full p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error fetching reviews: {message}</p>
        </div>
      </div>
    );
  }

  if (reviewsData?.length === 0) {
    return (
      <div className="w-full p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No reviews found</p>
        </div>
      </div>
    );
  }
  return <Reviews initialReviews={reviewsData ?? []} />;
}
