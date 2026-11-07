import React from 'react';
import type { ProductPageTab } from '../hooks/useProductPageTab';

const TABS: readonly (readonly [ProductPageTab, string])[] = [
  ['products', 'Products'],
  ['stock-entry', 'Stock entry'],
];

const ACTIVE = 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm';
const IDLE = 'text-gray-500 hover:text-black dark:hover:text-white';

/** Products or Stock entry, for those who may add stock. */
export const ProductPageTabs: React.FC<{ tab: ProductPageTab; onChange: (tab: ProductPageTab) => void }> = ({ tab, onChange }) => (
  <div role="tablist" aria-label="Products or stock entry" className="inline-flex p-1 rounded-xl bg-black/5 dark:bg-white/5">
    {TABS.map(([id, label]) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={tab === id}
        onClick={() => onChange(id)}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === id ? ACTIVE : IDLE}`}
      >
        {label}
      </button>
    ))}
  </div>
);
