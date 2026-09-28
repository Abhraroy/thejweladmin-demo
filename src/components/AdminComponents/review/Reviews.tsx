"use client";

import { Fragment, useMemo, useState } from "react";
import OptimizedImage from "@/components/OptimizedImage";
import { FaStar } from "react-icons/fa";

interface Review {
  review_id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string | null;
  review_text?: string | null;
  created_at: string;
  products?: {
    product_id: string;
    product_name?: string;
    thumbnail_image?: string | null;
  } | null;
  users?: {
    user_id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
  } | null;
  review_images?: Array<{
    review_image_id: string;
    review_image_url: string;
    created_at: string;
  }> | null;
}

interface ReviewsProps {
  initialReviews: Review[];
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDate = (value?: string | null) =>
  value ? dateFormatter.format(new Date(value)) : null;

const formatDateTime = (value?: string | null) =>
  value ? dateTimeFormatter.format(new Date(value)) : null;

const renderStars = (rating: number) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300 fill-gray-300"
          }`}
        />
      ))}
    </div>
  );
};

export default function Reviews({ initialReviews }: ReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<"all" | number>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    const productsMap = new Map<string, { id: string; name: string }>();
    reviews.forEach((review) => {
      if (review.products?.product_id && review.products?.product_name) {
        productsMap.set(review.products.product_id, {
          id: review.products.product_id,
          name: review.products.product_name,
        });
      }
    });
    return Array.from(productsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const matchesRating =
        ratingFilter === "all" ? true : review.rating === ratingFilter;
      const matchesProduct =
        productFilter === "all" ? true : review.product_id === productFilter;
      const matchesSearch =
        search.trim().length === 0
          ? true
          : (review.products?.product_name || "")
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            (review.users?.first_name || "")
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            (review.users?.last_name || "")
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            (review.users?.email || "")
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            (review.title || "")
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            (review.review_text || "")
              .toLowerCase()
              .includes(search.toLowerCase());
      return matchesRating && matchesProduct && matchesSearch;
    });
  }, [reviews, search, ratingFilter, productFilter]);

  const stats = useMemo(() => {
    const total = filteredReviews.length;
    const averageRating =
      total > 0
        ? filteredReviews.reduce((sum, r) => sum + r.rating, 0) / total
        : 0;
    const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: filteredReviews.filter((r) => r.rating === star).length,
    }));
    const withImages = filteredReviews.filter(
      (r) => r.review_images && r.review_images.length > 0
    ).length;
    return { total, averageRating, ratingDistribution, withImages };
  }, [filteredReviews]);

  const toggleExpanded = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Reviews Management
          </h1>
          <p className="text-sm text-gray-600">
            View and manage customer product reviews.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews..."
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={ratingFilter}
            onChange={(e) =>
              setRatingFilter(
                e.target.value === "all" ? "all" : parseInt(e.target.value)
              )
            }
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All ratings</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
          {uniqueProducts.length > 0 && (
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All products</option>
              {uniqueProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Reviews" value={stats.total} />
        <SummaryCard
          label="Average Rating"
          value={stats.averageRating.toFixed(1)}
          sub={`${renderStars(Math.round(stats.averageRating))}`}
        />
        <SummaryCard label="5 Star Reviews" value={stats.ratingDistribution[0].count} />
        <SummaryCard label="With Images" value={stats.withImages} />
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Rating Distribution
        </h3>
        <div className="space-y-2">
          {stats.ratingDistribution.map(({ star, count }) => {
            const percentage =
              stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium text-gray-700">{star}</span>
                  <FaStar className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-12 text-right">
                  {count} ({percentage.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs uppercase tracking-wide text-gray-500">
                <Th>Product</Th>
                <Th>Customer</Th>
                <Th>Rating</Th>
                <Th>Review</Th>
                <Th>Date</Th>
                <Th>Images</Th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">
                    No reviews found.
                  </td>
                </tr>
              )}
              {filteredReviews.map((review) => {
                const isExpanded = expandedReviews.has(review.review_id);
                const user = review.users;
                const product = review.products;
                const customerName =
                  (user?.first_name || "") +
                  (user?.last_name ? ` ${user.last_name}` : "") ||
                  "Anonymous";
                const initial =
                  (user?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase();

                return (
                  <Fragment key={review.review_id}>
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                      onClick={() => toggleExpanded(review.review_id)}
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          {product?.thumbnail_image && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0 relative">
                              <OptimizedImage
                                src={product.thumbnail_image}
                                alt={product.product_name || "Product"}
                                preset="thumbnail"
                                fill
                                objectFit="cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {product?.product_name || "Unknown Product"}
                            </div>
                            {product?.product_id && (
                              <div className="text-xs text-gray-500 truncate">
                                ID: {product.product_id.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">
                              {initial}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-gray-900 truncate">
                              {customerName}
                            </span>
                            {user?.email && (
                              <span className="text-xs text-gray-500 truncate">
                                {user.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                          <span className="text-xs text-gray-600">
                            ({review.rating}/5)
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <div className="max-w-md">
                          {review.title && (
                            <div className="font-semibold text-gray-900 mb-1 truncate">
                              {review.title}
                            </div>
                          )}
                          {review.review_text ? (
                            <div className="text-gray-700 text-xs line-clamp-2">
                              {review.review_text}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              No text review
                            </span>
                          )}
                          {review.review_text &&
                            review.review_text.length > 100 && (
                              <span
                                className={`text-xs text-emerald-600 mt-1 inline-block ${
                                  isExpanded ? "hidden" : ""
                                }`}
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </span>
                            )}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex flex-col">
                          <span className="text-gray-900">
                            {formatDate(review.created_at)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(review.created_at)}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        {review.review_images && review.review_images.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 relative">
                              <OptimizedImage
                                src={review.review_images[0].review_image_url}
                                alt="Review image"
                                preset="thumbnail"
                                fill
                                objectFit="cover"
                              />
                            </div>
                            {review.review_images.length > 1 && (
                              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                +{review.review_images.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </Td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-3">
                            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                              Full Review Details
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                              {review.title && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Title</div>
                                  <div className="font-semibold text-gray-900">
                                    {review.title}
                                  </div>
                                </div>
                              )}
                              {review.review_text && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">
                                    Review Text
                                  </div>
                                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {review.review_text}
                                  </div>
                                </div>
                              )}
                              {review.review_images &&
                                review.review_images.length > 0 && (
                                  <div>
                                    <div className="text-xs text-gray-500 mb-2">
                                      Review Images ({review.review_images.length})
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {review.review_images.map((img) => (
                                        <div
                                          key={img.review_image_id}
                                          className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-200"
                                        >
                                          <OptimizedImage
                                            src={img.review_image_url}
                                            alt="Review image"
                                            preset="card"
                                            fill
                                            objectFit="cover"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">
                                    Customer Info
                                  </div>
                                  <div className="text-sm text-gray-900">
                                    {customerName}
                                  </div>
                                  {user?.email && (
                                    <div className="text-xs text-gray-600">
                                      {user.email}
                                    </div>
                                  )}
                                  {user?.phone_number && (
                                    <div className="text-xs text-gray-600">
                                      {user.phone_number}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">
                                    Product Info
                                  </div>
                                  <div className="text-sm text-gray-900">
                                    {product?.product_name || "Unknown"}
                                  </div>
                                  {product?.product_id && (
                                    <div className="text-xs text-gray-600">
                                      ID: {product.product_id}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-3 px-4 font-semibold text-left whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`py-3 px-4 align-top ${className}`}>{children}</td>;
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number | React.ReactNode;
  sub?: string | React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
        {label}
      </span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}
