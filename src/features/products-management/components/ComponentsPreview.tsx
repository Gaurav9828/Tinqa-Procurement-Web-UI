import React from 'react';
import { WarrantyBadge } from '../../item-management/components/WarrantyBadge';
import { formatWarrantyDuration } from '../../item-management/utils/itemWarranty';
import type { ComponentWarrantySnapshot } from '../types/product.types';

interface PreviewComponent {
  itemName: string;
  quantity: number | string;
  warranties: ComponentWarrantySnapshot[];
}

/** Read-only list of components, each with its component-level warranties grouped under it. */
export const ComponentsPreview: React.FC<{ components: PreviewComponent[]; title?: string }> = ({ components, title = 'Components & item warranties' }) => (
  <div>
    <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">{title}:</span>
    <ul className="border border-black/10 dark:border-white/10 rounded-xl divide-y divide-black/5 dark:divide-white/5" aria-label="Components preview">
      {components.map((component, i) => (
        <li key={i} className="px-3 py-2 space-y-1">
          <div className="flex justify-between gap-2">
            <span className="font-medium text-black dark:text-white">{component.itemName}</span>
            <span className="text-gray-500 shrink-0">× {component.quantity}</span>
          </div>
          {component.warranties.length === 0 ? (
            <p className="text-gray-400 italic">No item warranties</p>
          ) : (
            <ul className="space-y-0.5">
              {component.warranties.map((w, j) => (
                <li key={j} className="flex flex-wrap items-center gap-1.5">
                  <WarrantyBadge type={w.warrantyType} />
                  <span className="text-gray-700 dark:text-gray-300">{w.title}</span>
                  <span className="text-gray-400">{formatWarrantyDuration(w.durationValue, w.durationUnit)}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  </div>
);
