import React, { useCallback, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { PromoCustomerRef } from '../types/promoCode.types';
import { productUnitsError, type PromoFormProduct, type UnitsChoice } from '../utils/promoCodeForm';
import { RemovableChip } from './PromoUi';
import { customersApi } from '../../customer-management/api/customersApi';
import { usePagedSearch } from '../../careers/hooks/useCareerLoaders';
import { useAccess } from '../../../hooks/useAccess';
import { useSearchTerm } from '../../../hooks/useSearchTerm';
import { useActiveProductOptions } from '../../../hooks/useLookupOptions';
import { CHOICE_TONE } from '../../../components/ui/actionTones';

const CUSTOMER_RESULTS = 10;
const PRODUCT_RESULTS = 20;

const searchBox = 'w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] focus:outline-none focus:ring-2 focus:ring-[#0071e3]';
const addButton = `inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${CHOICE_TONE.approve.idle}`;

/**
 * Chosen customers as removable chips, and a server search to add more: GET /admin/customers?search= (CUSTOMER_VIEW),
 * settled through useSearchTerm and answered from the search cache. Nothing is asked until something is typed.
 */
export const CustomerPicker: React.FC<{ chosen: PromoCustomerRef[]; onChange: (customers: PromoCustomerRef[]) => void; error?: string }> = ({
  chosen,
  onChange,
  error,
}) => {
  const allowed = useAccess().can('CUSTOMER_VIEW');
  const [text, setText] = useState('');
  const { term, pending, flush } = useSearchTerm(text);
  const load = useCallback(
    (searchTerm: string, page: number) => customersApi.list({ search: searchTerm, withCart: false, page, size: CUSTOMER_RESULTS }),
    []
  );
  const results = usePagedSearch(load, {
    scope: 'promo-customer-picker',
    term,
    pending,
    page: 0,
    enabled: allowed && text.trim() !== '',
    failure: 'Failed to search customers.',
  });
  const chosenIds = useMemo(() => new Set(chosen.map((c) => c.id)), [chosen]);
  const found = text.trim() ? (results.data?.content ?? []).filter((c) => !chosenIds.has(c.id)) : [];

  return (
    <div className="space-y-2">
      {chosen.length > 0 && (
        <ul aria-label="Chosen customers" className="flex flex-wrap gap-1.5">
          {chosen.map((customer) => (
            <RemovableChip key={customer.id} label={customer.name} detail={customer.email} onRemove={() => onChange(chosen.filter((c) => c.id !== customer.id))} />
          ))}
        </ul>
      )}
      {allowed ? (
        <>
          <label className="relative block">
            <span className="sr-only">Search customers to add</span>
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={text}
              maxLength={100}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  flush();
                }
              }}
              placeholder="Search customers by name, email or phone"
              className={searchBox}
            />
          </label>
          {text.trim() && (
            <ul aria-label="Customers found" aria-busy={results.isLoading} className="max-h-48 overflow-y-auto divide-y divide-black/5 dark:divide-white/10 rounded-xl border border-black/10 dark:border-white/10">
              {results.isLoading && <li role="status" className="p-2 text-gray-500">Searching...</li>}
              {!results.isLoading && found.length === 0 && <li className="p-2 text-gray-500">No customers match.</li>}
              {!results.isLoading &&
                found.map((customer) => (
                  <li key={customer.id} className="p-2 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {customer.name} <span className="text-gray-500">{customer.email}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Add ${customer.name}`}
                      onClick={() => onChange([...chosen, { id: customer.id, name: customer.name, email: customer.email }])}
                      className={addButton}
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-amber-700 dark:text-amber-400">You can't search customers (Customer Management is not open to you), so customers can only be removed here.</p>
      )}
      {error && <p role="alert" className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  );
};

const UNIT_CHOICES: { value: UnitsChoice; label: string }[] = [
  { value: 'ALL', label: 'All units' },
  { value: 'LIMITED', label: 'Number' },
];

/** One chosen product: on all its units in an order, or on a number typed in (RudraX, 1 → one RudraX per order). */
const ChosenProduct: React.FC<{
  product: PromoFormProduct;
  showErrors: boolean;
  onChange: (product: PromoFormProduct) => void;
  onRemove: () => void;
}> = ({ product, showErrors, onChange, onRemove }) => {
  // The message itself shows under the list (the form's products error); the box is marked here
  const error = showErrors ? productUnitsError(product) : undefined;
  return (
    <li className="p-2 flex flex-wrap items-center gap-2">
      <span className="flex-1 min-w-[120px] truncate font-medium text-black dark:text-white">{product.title}</span>
      <fieldset className="flex items-center gap-1.5">
        <legend className="sr-only">Units of {product.title}</legend>
        {UNIT_CHOICES.map((choice) => (
          <label
            key={choice.value}
            className={`inline-flex items-center px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${
              product.units === choice.value ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle
            }`}
          >
            <input
              type="radio"
              name={`units-${product.id}`}
              value={choice.value}
              checked={product.units === choice.value}
              onChange={() => onChange({ ...product, units: choice.value })}
              className="sr-only"
            />
            {choice.label}
          </label>
        ))}
        {product.units === 'LIMITED' && (
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            aria-label={`Units of ${product.title}`}
            aria-invalid={!!error}
            value={product.maxUnits}
            onChange={(e) => onChange({ ...product, maxUnits: e.target.value })}
            placeholder="e.g. 1"
            className={`w-20 px-2 py-1 text-xs rounded-lg border bg-white dark:bg-[#1c1c1e] focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
              error ? 'border-red-500' : 'border-black/10 dark:border-white/10'
            }`}
          />
        )}
        <span className="text-[11px] text-gray-500">per order</span>
      </fieldset>
      <button
        type="button"
        aria-label={`Remove ${product.title}`}
        onClick={onRemove}
        className="p-1 rounded-full text-rose-600 hover:bg-rose-500/15 dark:text-rose-400 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
};

/**
 * Chosen products, each with on how many of its units the promo works (all, or a number), picked from the shared
 * list of products on sale (useActiveProductOptions, GET /products/active, cached app-wide) and narrowed in the
 * browser. A product is added on all its units.
 */
export const ProductPicker: React.FC<{
  chosen: PromoFormProduct[];
  onChange: (products: PromoFormProduct[]) => void;
  showErrors: boolean;
  error?: string;
}> = ({ chosen, onChange, showErrors, error }) => {
  const { options, isLoading } = useActiveProductOptions(true);
  const [text, setText] = useState('');
  const chosenIds = useMemo(() => new Set(chosen.map((p) => p.id)), [chosen]);
  const needle = text.trim().toLowerCase();
  const found = options
    .filter((p) => !chosenIds.has(p.id) && (!needle || p.title.toLowerCase().includes(needle) || (p.modelName ?? '').toLowerCase().includes(needle)))
    .slice(0, PRODUCT_RESULTS);

  return (
    <div className="space-y-2">
      {chosen.length > 0 && (
        <ul aria-label="Chosen products" className="divide-y divide-black/5 dark:divide-white/10 rounded-xl border border-black/10 dark:border-white/10">
          {chosen.map((product) => (
            <ChosenProduct
              key={product.id}
              product={product}
              showErrors={showErrors}
              onChange={(changed) => onChange(chosen.map((p) => (p.id === product.id ? changed : p)))}
              onRemove={() => onChange(chosen.filter((p) => p.id !== product.id))}
            />
          ))}
        </ul>
      )}
      <label className="relative block">
        <span className="sr-only">Find products to add</span>
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="search" value={text} maxLength={100} onChange={(e) => setText(e.target.value)} placeholder="Find a product on sale by name or model" className={searchBox} />
      </label>
      <ul aria-label="Products on sale" className="max-h-48 overflow-y-auto divide-y divide-black/5 dark:divide-white/10 rounded-xl border border-black/10 dark:border-white/10">
        {isLoading && <li role="status" className="p-2 text-gray-500">Loading products...</li>}
        {!isLoading && found.length === 0 && <li className="p-2 text-gray-500">No products match.</li>}
        {found.map((product) => (
          <li key={product.id} className="p-2 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">
              {product.title} {product.modelName && <span className="text-gray-500">{product.modelName}</span>}
            </span>
            <button type="button" aria-label={`Add ${product.title}`} onClick={() => onChange([...chosen, { id: product.id, title: product.title, units: 'ALL', maxUnits: '' }])} className={addButton}>
              <Plus className="w-3 h-3" /> Add
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  );
};
