import React, { useCallback } from 'react';
import { Boxes, Loader2 } from 'lucide-react';
import { barcodeApi } from '../api/barcodeApi';
import { useBarcodeList } from '../hooks/useBarcodeList';
import type { ProductUnitBarcodes } from '../types/barcode.types';
import { BarcodeStatusBadge } from './BarcodeStatusBadge';
import { BarcodeCode } from './BarcodeCode';

/** Every unit of a product with its barcode and the barcodes of the pieces inside it. */
export const ProductUnitsPanel: React.FC<{ productId: number }> = ({ productId }) => {
  const load = useCallback((id: number) => barcodeApi.forProduct(id), []);
  const { allowed, data: units, isLoading } = useBarcodeList<ProductUnitBarcodes>(productId, load, 'product unit barcodes');
  if (!allowed) return null;

  return (
    <section aria-label="Product unit barcodes" className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Boxes className="w-4 h-4 text-[#0071e3]" /> Unit barcodes ({units.length})
      </h3>
      {isLoading && <p className="text-xs text-gray-400"><Loader2 className="inline w-3 h-3 animate-spin" /> Loading barcodes…</p>}
      {!isLoading && units.length === 0 && <p className="text-xs text-gray-400">No unit of this product has a barcode yet.</p>}
      {!isLoading && units.length > 0 && (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {units.map(({ unit, parts }) => (
            <li key={unit.id} className="p-3 rounded-xl border border-black/5 dark:border-white/10 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  Unit <BarcodeCode code={unit.code} />
                </span>
                <BarcodeStatusBadge status={unit.status} locked={unit.locked} />
              </div>
              {parts.length > 0 ? (
                <ul aria-label={`Parts of ${unit.code}`} className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                  {parts.map((part) => (
                    <li key={part.id}>
                      {part.itemName}: <BarcodeCode code={part.code} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-gray-400">No component pieces recorded.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
