import React from 'react';
import { Star } from 'lucide-react';

interface Props {
  /** 0–5; fractional values (averages) round to the nearest whole star. */
  rating: number;
  size?: 'sm' | 'md';
}

export const ReviewStars: React.FC<Props> = ({ rating, size = 'sm' }) => {
  const filled = Math.round(Math.min(Math.max(rating, 0), 5));
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="inline-flex items-center gap-0.5 whitespace-nowrap">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`${iconClass} ${star <= filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-neutral-600'}`}
        />
      ))}
    </span>
  );
};
