import React from 'react';
import { Link } from 'react-router-dom';
import { ReviewStars } from './ReviewStars';
import { productReviewsPath } from '../utils/review.utils';

interface Props {
  productId: number;
  averageRating: number;
  reviewCount: number;
}

/** "★★★★☆ 4.2 (18) · View reviews" for the product admin pages. Counts only active reviews. */
export const ProductRatingSummary: React.FC<Props> = ({ productId, averageRating, reviewCount }) => (
  <div className="flex flex-col gap-0.5">
    {reviewCount > 0 ? (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <ReviewStars rating={averageRating} />
        <span className="font-semibold text-black dark:text-white">{averageRating.toFixed(1)}</span>
        <span className="text-gray-400">({reviewCount})</span>
      </span>
    ) : (
      <span className="text-gray-400 whitespace-nowrap">No reviews</span>
    )}
    <Link to={productReviewsPath(productId)} className="text-[11px] text-[#0071e3] hover:underline whitespace-nowrap">
      View reviews
    </Link>
  </div>
);
