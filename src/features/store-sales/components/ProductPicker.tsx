import React, { useMemo, useState } from 'react';
import { Loader2, Minus, PackageSearch, Plus } from 'lucide-react';
import { CommonInput } from '../../../components/ui/FormInputs';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import type { StoreProduct } from '../types/storeSale.types';
import { MAX_QUANTITY_PER_PRODUCT } from '../utils/storeSale.constants';

interface Props {
  products: StoreProduct[];
  isLoading: boolean;
  quantities: Record<number, number>;
  onQuantity: (productId: number, quantity: number) => void;
}

/** Step 2: what they buy. Searching filters the loaded list; out-of-stock products are booked as pre-orders. */
export const ProductPicker: React.FC<Props> = ({ products, isLoading, quantities, onQuantity }) => {
  const [search, setSearch] = useState('');
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? products.filter((product) => product.title.toLowerCase().includes(needle)) : products;
  }, [products, search]);

  return (
    <section aria-label="Products" className="apple-card p-5 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <PackageSearch className="w-4 h-4 text-[#0071e3]" /> 2. Products
      </h2>
      <CommonInput label="Search products" type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} />
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      ) : shown.length === 0 ? (
        <p className="text-xs text-gray-500">{products.length === 0 ? 'No products are on sale.' : 'No products match the search.'}</p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/5 max-h-[420px] overflow-y-auto" aria-label="Products on sale">
          {shown.map((product) => {
            const quantity = quantities[product.id] ?? 0;
            return (
              <li key={product.id} className="flex items-center gap-3 py-2.5 text-xs">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-black/5 shrink-0" />
                ) : (
                  <span className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/10 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-black dark:text-white truncate">{product.title}</p>
                  <p className="text-gray-500">
                    {formatCurrency(product.unitPrice)} incl. GST ·{' '}
                    {product.stock > 0 ? `${product.stock} in stock` : <span className="text-amber-600">out of stock (pre-order)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5" role="group" aria-label={`Quantity of ${product.title}`}>
                  <button type="button" aria-label={`One less ${product.title}`} disabled={quantity === 0} onClick={() => onQuantity(product.id, quantity - 1)}
                    className="p-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 disabled:opacity-40 cursor-pointer">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-mono font-semibold" aria-live="polite">{quantity}</span>
                  <button type="button" aria-label={`One more ${product.title}`} disabled={quantity >= MAX_QUANTITY_PER_PRODUCT} onClick={() => onQuantity(product.id, quantity + 1)}
                    className="p-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 disabled:opacity-40 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
