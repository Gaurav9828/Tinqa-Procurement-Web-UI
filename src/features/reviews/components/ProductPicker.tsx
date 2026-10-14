import React, { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { ReviewProductOption } from '../hooks/useReviewProductOptions';

const MAX_VISIBLE_OPTIONS = 50;

interface Props {
  options: ReviewProductOption[];
  isLoading: boolean;
  value: number | null;
  onChange: (productId: number | null) => void;
  className?: string;
}

/** Searchable product select (combobox): type to narrow the list, pick with mouse or keyboard. */
export const ProductPicker: React.FC<Props> = ({ options, isLoading, value, onChange, className = '' }) => {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((option) => option.id === value) ?? null;
  // A product id from the URL may not be in the list yet (still loading, or since removed).
  const selectedLabel = selected?.title ?? (value ? `Product #${value}` : '');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? options.filter((option) => option.title.toLowerCase().includes(q)) : options;
    return filtered.slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, query]);

  const open = () => {
    setQuery('');
    setActiveIndex(0);
    setIsOpen(true);
  };

  const choose = (option: ReviewProductOption | null) => {
    onChange(option ? option.id : null);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) open();
      else setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault();
      if (matches[activeIndex]) choose(matches[activeIndex]);
    } else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="Filter by product"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={isOpen && matches[activeIndex] ? `${listId}-${matches[activeIndex].id}` : undefined}
        placeholder={isLoading ? 'Loading products…' : 'All products'}
        value={isOpen ? query : selectedLabel}
        onFocus={open}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        // Delay so a click on an option lands before the list closes.
        onBlur={() => setTimeout(() => setIsOpen(false), 120)}
        onKeyDown={handleKeyDown}
        className="w-full pl-3 pr-14 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {value && (
          <button
            type="button"
            aria-label="Clear product filter"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(null)}
            className="p-1 rounded-md text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none" aria-hidden="true" />
      </div>

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Products"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] shadow-lg py-1 text-xs"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-gray-400">{isLoading ? 'Loading products…' : 'No matching products'}</li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option.id}
                id={`${listId}-${option.id}`}
                role="option"
                aria-selected={option.id === value}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`px-3 py-2 cursor-pointer truncate ${
                  index === activeIndex ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-black dark:text-white'
                } ${option.id === value ? 'font-semibold' : ''}`}
              >
                {option.title}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
