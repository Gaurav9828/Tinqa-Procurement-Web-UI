import React from 'react';
import type { ProductResponse } from '../types/product.types';
import { describedImages } from '../utils/productImages';

/** A product's images, each with its view (front, side, …) and what it shows. */
export const ProductImagesView: React.FC<{ product: Partial<ProductResponse> }> = ({ product }) => {
  const images = describedImages(product);
  if (images.length === 0) return null;
  return (
    <div>
      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Images</h4>
      <ul className="space-y-2">
        {images.map((image) => (
          <li key={image.index} className="flex items-start gap-3">
            <a href={image.url} target="_blank" rel="noreferrer" className="shrink-0">
              <img
                src={image.url}
                alt={image.view}
                className="w-14 h-14 rounded-lg object-cover border border-black/10 dark:border-white/10"
                onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
              />
            </a>
            <div className="min-w-0">
              <p className="font-semibold text-black dark:text-white">
                {image.index + 1} · {image.view}
              </p>
              <p className={image.description ? 'text-gray-600 dark:text-gray-300' : 'italic text-gray-400'}>
                {image.description ?? 'No description yet'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
