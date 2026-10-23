import React, { useId, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Tag } from 'lucide-react';
import { CATEGORY_NAME_MAX, type ProductCategory } from '../types/product.types';
import { cleanCategoryName, findCategory, matchCategories } from '../utils/productCategory';

interface ProductCategoryFieldProps {
  value: string;
  onChange: (name: string) => void;
  categories: readonly ProductCategory[];
  error?: string | null;
  disabled?: boolean;
}

type Option = { kind: 'existing'; category: ProductCategory } | { kind: 'new'; name: string };

const optionKey = (option: Option) => (option.kind === 'existing' ? `c-${option.category.id}` : 'new');

const countLabel = (category: ProductCategory): string | null => {
  if (category.productCount === undefined) return null;
  return category.productCount === 1 ? '1 product' : `${category.productCount} products`;
};

/** Says what saving will do with the typed name. */
const hintFor = (existing: ProductCategory | undefined, typed: string): string => {
  if (existing) {
    const count = countLabel(existing);
    return count ? `Existing category · ${count}` : 'Existing category';
  }
  if (typed) return `New category — "${typed}" is created when the product is saved.`;
  return 'Pick a category or type a new one, e.g. Accessories or Spare parts.';
};

/** Index of the option the arrow keys move to, wrapping around. */
const stepIndex = (current: number, key: string, count: number): number => {
  const step = key === 'ArrowDown' ? 1 : -1;
  return (current + step + count) % Math.max(count, 1);
};

/**
 * Category picker that also creates categories: typing filters the existing ones, and a name that matches none is
 * offered as "Create". A name that matches an existing category (ignoring case, spacing and punctuation) always
 * picks that category, so "accessories" never becomes a second Accessories.
 */
export const ProductCategoryField: React.FC<ProductCategoryFieldProps> = ({ value, onChange, categories, error, disabled }) => {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const typed = cleanCategoryName(value);
  const existing = findCategory(categories, value);
  const options: Option[] = [
    ...matchCategories(categories, value).map((category): Option => ({ kind: 'existing', category })),
    ...(typed && !existing ? [{ kind: 'new', name: typed } as Option] : []),
  ];
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  const choose = (option: Option) => {
    onChange(option.kind === 'existing' ? option.category.name : option.name);
    setOpen(false);
  };

  // Leaving the field settles the spelling: an existing category's own name, or the cleaned new name
  const settle = () => {
    setOpen(false);
    if (existing && existing.name !== value) onChange(existing.name);
    else if (!existing && typed !== value) onChange(typed);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (open) setActive(stepIndex(activeIndex, e.key, options.length));
      else setOpen(true);
    } else if (e.key === 'Enter' && open && options[activeIndex]) {
      // Picks the highlighted option instead of submitting the form
      e.preventDefault();
      choose(options[activeIndex]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const hintId = `${id}-hint`;
  const isNew = !existing && !!typed;

  return (
    <div className="relative">
      <label htmlFor={id} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
        Category *
      </label>
      <div className="relative">
        <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[activeIndex] ? `${id}-${optionKey(options[activeIndex])}` : undefined}
          aria-describedby={hintId}
          aria-invalid={!!error}
          autoComplete="off"
          maxLength={CATEGORY_NAME_MAX}
          value={value}
          disabled={disabled}
          placeholder="Select or create a category"
          onChange={(e) => {
            onChange(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={settle}
          onKeyDown={onKeyDown}
          className={`w-full pl-8 pr-8 py-2 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white ${
            error ? 'border-rose-500/60' : 'border-black/10 dark:border-white/10'
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show categories"
          disabled={disabled}
          // Keeps focus in the input so its blur does not close the list again
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((wasOpen) => !wasOpen);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Categories"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto p-1 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-xl shadow-lg"
        >
          {options.map((option, index) => {
            const selected = option.kind === 'existing' && option.category.id === existing?.id;
            return (
              <li
                key={optionKey(option)}
                id={`${id}-${optionKey(option)}`}
                role="option"
                aria-selected={selected}
                // mousedown, not click: runs before the input's blur
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActive(index)}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer ${
                  index === activeIndex ? 'bg-black/[0.05] dark:bg-white/[0.08]' : ''
                }`}
              >
                {option.kind === 'existing' ? (
                  <>
                    <span className="flex items-center gap-2 min-w-0 text-black dark:text-white">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${selected ? 'text-[#0071e3]' : 'invisible'}`} aria-hidden="true" />
                      <span className="truncate">{option.category.name}</span>
                    </span>
                    {countLabel(option.category) && <span className="shrink-0 text-[10px] text-gray-400">{countLabel(option.category)}</span>}
                  </>
                ) : (
                  <span className="flex items-center gap-2 min-w-0 text-[#0071e3] font-medium">
                    <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">Create category "{option.name}"</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p id={hintId} role="alert" className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : (
        <p id={hintId} className={`mt-1 text-[10px] ${isNew ? 'text-[#0071e3]' : 'text-gray-400'}`}>
          {hintFor(existing, typed)}
        </p>
      )}
    </div>
  );
};
