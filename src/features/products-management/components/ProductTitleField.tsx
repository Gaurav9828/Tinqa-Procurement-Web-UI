import React, { useId, useState } from 'react';
import { CopyPlus } from 'lucide-react';
import type { ProductResponse } from '../types/product.types';
import { matchVersions, versionLabel } from '../utils/productVersion';

interface ProductTitleFieldProps {
  value: string;
  onChange: (title: string) => void;
  /** Every product, to adapt a new version from (already loaded by the page: no request). */
  products: readonly ProductResponse[];
  /** Fills the form with this version's values. */
  onAdapt: (product: ProductResponse) => void;
  disabled?: boolean;
}

/** Index of the option the arrow keys move to, wrapping around. */
const stepIndex = (current: number, key: string, count: number): number => {
  const step = key === 'ArrowDown' ? 1 : -1;
  return (current + step + count) % Math.max(count, 1);
};

/**
 * The new product's title. Typing lists the existing versions whose name or model name matches; picking one adapts the
 * new product from it (every value is copied in). A typed name is kept as it is: products may share a name, each
 * version with its own model name.
 */
export const ProductTitleField: React.FC<ProductTitleFieldProps> = ({ value, onChange, products, onAdapt, disabled }) => {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const options = matchVersions(value, products);
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  const choose = (product: ProductResponse) => {
    setOpen(false);
    onAdapt(product);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (open) setActive(stepIndex(activeIndex, e.key, options.length));
      else setOpen(true);
    } else if (e.key === 'Enter' && open && options[activeIndex]) {
      // Picks the highlighted version instead of submitting the form
      e.preventDefault();
      choose(options[activeIndex]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
        Title *
      </label>
      <input
        id={id}
        type="text"
        required
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[activeIndex] ? `${id}-${options[activeIndex].id}` : undefined}
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder="Product Title"
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
      />
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Versions to adapt from"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto p-1 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-lg"
        >
          <li role="presentation" className="px-3 pt-1 pb-1.5 text-[10px] text-gray-400">
            Pick a version to copy all its values into this form
          </li>
          {options.map((product, index) => (
            <li
              key={product.id}
              id={`${id}-${product.id}`}
              role="option"
              aria-selected={index === activeIndex}
              // mousedown, not click: runs before the input's blur
              onMouseDown={(e) => {
                e.preventDefault();
                choose(product);
              }}
              onMouseEnter={() => setActive(index)}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer ${
                index === activeIndex ? 'bg-black/[0.05] dark:bg-white/[0.08]' : ''
              }`}
            >
              <span className="flex items-center gap-2 min-w-0 text-black dark:text-white">
                <span className="truncate">{product.title}</span>
                <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] text-[10px] font-semibold">
                  {versionLabel(product)}
                </span>
                {product.modelName && <span className="truncate text-gray-500">Model {product.modelName}</span>}
                {product.draft && <span className="shrink-0 text-[10px] text-gray-400">draft</span>}
              </span>
              <span className="shrink-0 flex items-center gap-1 text-[10px] text-[#0071e3] font-medium">
                <CopyPlus className="w-3 h-3" aria-hidden="true" /> Adapt
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
