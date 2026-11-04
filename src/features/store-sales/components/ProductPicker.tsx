import React, { useMemo, useState } from 'react';
import { Barcode, Loader2, Minus, PackageSearch, Plus } from 'lucide-react';
import { CommonInput } from '../../../components/ui/FormInputs';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import type { StoreProduct, StoreUnit } from '../types/storeSale.types';
import { MAX_QUANTITY_PER_PRODUCT } from '../utils/storeSale.constants';
import { useUnitLookup } from '../hooks/useUnitLookup';

interface Props {
  products: StoreProduct[];
  isLoading: boolean;
  quantities: Record<number, number>;
  onQuantity: (productId: number, quantity: number) => void;
}

/** Which product the scanned unit is, and why it isn't on the shelf when it isn't. */
const ScannedUnit: React.FC<{ unit: StoreUnit; product: StoreProduct | undefined }> = ({ unit, product }) => (
  <p role="status" className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
    <Barcode className="w-3.5 h-3.5 text-[#0071e3]" />
    <span>
      <span className="font-mono">{unit.barcode}</span> is a unit of{' '}
      <span className="font-semibold">{product?.title ?? unit.productTitle ?? `product ${unit.productId}`}</span>
      {!product && ', which is not on sale now'}.
      {unit.note && <span className="text-amber-600"> {unit.note}</span>}
    </span>
  </p>
);

const emptyMessage = (onSale: number, scanned: boolean) => {
  if (onSale === 0) return 'No products are on sale.';
  return scanned ? 'Nothing to add for this barcode.' : 'No products match the search.';
};

/**
 * Step 2: what they buy. Searching filters the loaded list by name; a unit's barcode (scanned or typed) that matches no
 * name shows the product it belongs to. Out-of-stock products are booked as pre-orders.
 */
export const ProductPicker: React.FC<Props> = ({ products, isLoading, quantities, onQuantity }) => {
  const [search, setSearch] = useState('');
  const byName = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? products.filter((product) => product.title.toLowerCase().includes(needle)) : products;
  }, [products, search]);
  const barcode = useUnitLookup(search, products.length > 0 && byName.length === 0);
  const scanned = barcode.unit ? products.find((product) => product.id === barcode.unit?.productId) : undefined;
  let shown = byName;
  if (barcode.unit) shown = scanned ? [scanned] : [];

  return (
    <section aria-label="Products" className="apple-card p-5 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <PackageSearch className="w-4 h-4 text-[#0071e3]" /> 2. Products
      </h2>
      <CommonInput label="Search products" type="search" value={search} placeholder="Product name, or scan a barcode" maxLength={100}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); barcode.flush(); } }} />
      {barcode.unit && <ScannedUnit unit={barcode.unit} product={scanned} />}
      {barcode.isLookingUp && (
        <p className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up the barcode…</p>
      )}
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      ) : shown.length === 0 ? (
        !barcode.isLookingUp && <p className="text-xs text-gray-500">{emptyMessage(products.length, !!barcode.unit)}</p>
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
