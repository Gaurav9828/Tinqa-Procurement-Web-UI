import React, { useId, useMemo, useState } from 'react';
import { Link2, Plus, Puzzle, Search, Trash2 } from 'lucide-react';
import {
  ACCESSORY_BENEFIT_MAX,
  ACCESSORY_BENEFITS_MAX,
  ACCESSORY_PURPOSE_MAX,
  BUNDLE_DISCOUNT_MAX,
  type AccessoryLinkResponse,
  type ProductResponse,
} from '../types/product.types';
import { parentCandidates, type AccessoryForm } from '../utils/accessoryForm';

interface Props {
  value: AccessoryForm;
  onChange: (next: AccessoryForm) => void;
  /** Every product (the parents are picked from these). */
  products: ProductResponse[];
  /** The product being edited (never offered as its own parent); undefined on create. */
  selfId?: number;
  /** Accessories already offered with this product: such a product can't become an accessory. */
  ownAccessories?: AccessoryLinkResponse[];
  /** The form's price and discount, for the bundle price preview. */
  price: number | '' | undefined;
  discountPercentage: number | '' | undefined;
  /** Keyed like the backend: `accessoryParents[i].bundleDiscountPercentage`, `accessoryPurpose`, … */
  errors: Record<string, string>;
  onClearErrors: () => void;
  disabled?: boolean;
}

const MAX_SUGGESTIONS = 8;

const inputClass = (hasError = false) =>
  `w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white ${
    hasError ? 'border-rose-500' : 'border-black/10 dark:border-white/10'
  }`;

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Accessory settings: a product can also be offered with other products ("parents"). Customers see it next to each
 * parent and get the extra discount set per parent on the accessory units bought together with it; bought alone it
 * sells at its own price.
 */
export const ProductAccessorySection: React.FC<Props> = ({
  value,
  onChange,
  products,
  selfId,
  ownAccessories = [],
  price,
  discountPercentage,
  errors,
  onClearErrors,
  disabled,
}) => {
  const baseId = useId();
  const [query, setQuery] = useState('');
  // Extra discount given to each newly added parent
  const [defaultDiscount, setDefaultDiscount] = useState('5');

  const update = (patch: Partial<AccessoryForm>) => {
    onClearErrors();
    onChange({ ...value, ...patch });
  };

  const byId = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const chosen = new Set(value.parents.map((row) => row.productId));
  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return parentCandidates(products, selfId)
      .filter((product) => !chosen.has(product.id) && (!needle || product.title.toLowerCase().includes(needle)))
      .slice(0, MAX_SUGGESTIONS);
    // `chosen` is derived from value.parents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, selfId, query, value.parents]);

  // Price per unit after the product's own discount, as the store charges it
  const listPrice = Number(price) || 0;
  const ownDiscount = Number(discountPercentage) || 0;
  const unitPrice = ownDiscount > 0 && ownDiscount < 100 ? round2(listPrice - (listPrice * ownDiscount) / 100) : listPrice;

  const isParent = ownAccessories.length > 0;

  if (isParent) {
    return (
      <section className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2" aria-label="Accessories">
        <h3 className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
          <Puzzle className="w-3.5 h-3.5 text-[#0071e3]" /> Accessories offered with this product
        </h3>
        <ul className="flex flex-wrap gap-1.5" data-testid="own-accessories">
          {ownAccessories.map((link) => (
            <li key={link.productId} className="px-2 py-1 rounded-lg bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400">
              {link.title}
              {link.bundleDiscountPercentage > 0 && <span className="opacity-75"> · +{link.bundleDiscountPercentage}% off together</span>}
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-gray-400">
          A product other accessories are offered with can't be an accessory itself. Change these from each accessory's own form.
        </p>
      </section>
    );
  }

  const addParent = (product: ProductResponse) => {
    setQuery('');
    update({ parents: [...value.parents, { productId: product.id, title: product.title, discount: defaultDiscount.trim() || '0' }] });
  };

  const setBenefit = (index: number, text: string) =>
    update({ benefits: value.benefits.map((benefit, i) => (i === index ? text : benefit)) });
  const removeBenefit = (index: number) => {
    const next = value.benefits.filter((_, i) => i !== index);
    update({ benefits: next.length > 0 ? next : [''] });
  };

  return (
    <section className="pt-2 border-t border-black/10 dark:border-white/10 space-y-3" aria-label="Accessory">
      <div className="flex items-start gap-2">
        <input
          id={`${baseId}-accessory`}
          type="checkbox"
          checked={value.isAccessory}
          disabled={disabled}
          onChange={(e) => update({ isAccessory: e.target.checked })}
          className="mt-0.5 rounded border-black/10 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer"
        />
        <label htmlFor={`${baseId}-accessory`} className="cursor-pointer">
          <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
            <Puzzle className="w-3.5 h-3.5 text-[#0071e3]" /> This product is also an accessory
          </span>
          <span className="block text-[10px] text-gray-400">
            Customers see it with the products below and can add it at checkout. It still sells on its own at its own price.
          </span>
        </label>
      </div>

      {value.isAccessory && (
        <div className="space-y-3 pl-6">
          {/* Parents */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label htmlFor={`${baseId}-search`} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Offered with *
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    id={`${baseId}-search`}
                    type="search"
                    value={query}
                    disabled={disabled}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products to add…"
                    className={`${inputClass(!!errors.accessoryParents)} pl-8`}
                  />
                </div>
              </div>
              <div className="w-36">
                <label htmlFor={`${baseId}-default`} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Extra discount for new
                </label>
                <div className="relative">
                  <input
                    id={`${baseId}-default`}
                    type="number"
                    min={0}
                    max={BUNDLE_DISCOUNT_MAX}
                    step="0.01"
                    value={defaultDiscount}
                    disabled={disabled}
                    onChange={(e) => setDefaultDiscount(e.target.value)}
                    className={`${inputClass()} pr-7`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                </div>
              </div>
            </div>
            {suggestions.length > 0 && (query.trim() || value.parents.length === 0) && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Products to add">
                {suggestions.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => addParent(product)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#0071e3]/40 bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/20 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" /> {product.title}
                      {!product.enabled && <span className="text-[10px] opacity-70">(inactive)</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim() && suggestions.length === 0 && <p className="text-[10px] text-gray-400">No matching product. Accessories can't be parents.</p>}
            {errors.accessoryParents && <p className="text-rose-500 text-[11px]">{errors.accessoryParents}</p>}

            {value.parents.length > 0 && (
              <ul className="border border-black/10 dark:border-white/10 rounded-xl divide-y divide-black/5 dark:divide-white/5" aria-label="Parent products">
                {value.parents.map((row, index) => {
                  const error = errors[`accessoryParents[${index}].bundleDiscountPercentage`];
                  const percent = Number(row.discount);
                  const saving = Number.isFinite(percent) ? round2((unitPrice * percent) / 100) : 0;
                  const parent = byId.get(row.productId);
                  return (
                    <li key={row.productId} className="flex flex-wrap items-center gap-3 px-3 py-2">
                      <Link2 className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-[140px]">
                        <p className="font-medium text-black dark:text-white">
                          {row.title}
                          {parent && !parent.enabled && <span className="ml-1 text-[10px] text-amber-600">inactive</span>}
                        </p>
                        {unitPrice > 0 && saving > 0 && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            Together: {rupees(round2(unitPrice - saving))} per accessory (saves {rupees(saving)})
                          </p>
                        )}
                      </div>
                      <div className="w-28">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={BUNDLE_DISCOUNT_MAX}
                            step="0.01"
                            aria-label={`Extra discount with ${row.title}`}
                            value={row.discount}
                            disabled={disabled}
                            onChange={(e) =>
                              update({ parents: value.parents.map((r) => (r.productId === row.productId ? { ...r, discount: e.target.value } : r)) })
                            }
                            className={`${inputClass(!!error)} pr-7`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => update({ parents: value.parents.filter((r) => r.productId !== row.productId) })}
                        aria-label={`Remove ${row.title}`}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {error && <p className="basis-full text-rose-500 text-[11px]">{error}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[10px] text-gray-400">
              The extra discount applies to one accessory per unit of that product in the same order, on top of the accessory's own discount
              (0% = shown together, no extra discount).
            </p>
          </div>

          {/* Details shown to customers */}
          <div>
            <label htmlFor={`${baseId}-purpose`} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Why customers need it
            </label>
            <textarea
              id={`${baseId}-purpose`}
              rows={2}
              value={value.purpose}
              disabled={disabled}
              maxLength={ACCESSORY_PURPOSE_MAX}
              onChange={(e) => update({ purpose: e.target.value })}
              placeholder="e.g. Protects the diorama from dust and keeps the colours bright for years."
              className={`${inputClass(!!errors.accessoryPurpose)} resize-none`}
            />
            <p className="mt-0.5 text-[10px] text-gray-400 text-right">
              {value.purpose.length}/{ACCESSORY_PURPOSE_MAX}
            </p>
            {errors.accessoryPurpose && <p className="text-rose-500 text-[11px]">{errors.accessoryPurpose}</p>}
          </div>

          <div className="space-y-2">
            <span className="block font-medium text-gray-700 dark:text-gray-300">Benefits (up to {ACCESSORY_BENEFITS_MAX})</span>
            {value.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={benefit}
                  disabled={disabled}
                  maxLength={ACCESSORY_BENEFIT_MAX}
                  aria-label={`Benefit ${index + 1}`}
                  onChange={(e) => setBenefit(index, e.target.value)}
                  placeholder="e.g. Anti-glare acrylic"
                  className={inputClass(!!errors.accessoryBenefits)}
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeBenefit(index)}
                  aria-label={`Remove benefit ${index + 1}`}
                  className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {value.benefits.length < ACCESSORY_BENEFITS_MAX && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => update({ benefits: [...value.benefits, ''] })}
                className="flex items-center gap-1.5 text-[#0071e3] hover:underline font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add benefit
              </button>
            )}
            {errors.accessoryBenefits && <p className="text-rose-500 text-[11px]">{errors.accessoryBenefits}</p>}
            <p className="text-[10px] text-gray-400">The store also shows this product's warranties and what's included (its components).</p>
          </div>
        </div>
      )}
    </section>
  );
};
