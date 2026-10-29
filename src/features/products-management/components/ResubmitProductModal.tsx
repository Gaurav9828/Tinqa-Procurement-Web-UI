import React, { useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import type { ProductResponse } from '../types/product.types';
import type { NewProductUnit } from '../../barcodes/types/barcode.types';
import { ProductUnitsInput } from '../../barcodes/components/ProductUnitsInput';
import { resizeUnits, toUnitComponents, unitsProblem } from '../../barcodes/utils/productUnits';
import { fitToComponents, rememberedUnits } from '../../barcodes/utils/rememberedUnits';
import { SOLID_TONE } from '../../../components/ui/actionTones';

interface Props {
  product: ProductResponse;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (units: NewProductUnit[]) => Promise<boolean>;
}

/**
 * Resubmitting a rejected product rebuilds its units in stock: the rejection put their pieces back into item stock and
 * withdrew their barcodes, so each unit is sent again with the pieces fitted into it. The codes sent last time (kept in
 * this browser) are filled in; the withdrawal freed them, so they can be sent again unchanged.
 */
export const ResubmitProductModal: React.FC<Props> = ({ product, isSubmitting, onClose, onSubmit }) => {
  const count = Math.max(0, product.stockQuantity);
  const components = toUnitComponents(product.components ?? []);
  const [units, setUnits] = useState<NewProductUnit[]>(() => fitToComponents(rememberedUnits(product.id), components));
  const prefilled = units.some((unit) => unit.barcode);
  const shown = resizeUnits(units, count, components);
  const problem = unitsProblem(shown, count, components);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Resubmit ${product.title} for approval`}
        className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 text-xs"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-sm font-bold">Resubmit {product.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form
          noValidate
          className="p-6 space-y-4 overflow-y-auto"
          onSubmit={async (e) => {
            e.preventDefault();
            if (problem || isSubmitting) return;
            if (await onSubmit(shown)) onClose();
          }}
        >
          <p className="text-gray-500">
            The rejection returned this product's component pieces to stock and withdrew its unit barcodes. Confirm the{' '}
            {count === 1 ? 'unit' : `${count} units`} in stock with the pieces fitted into each; they are taken from stock again and wait for
            approval with the product.
          </p>
          {prefilled && (
            <p role="note" className="text-[11px] text-[#0071e3]" data-testid="resubmit-prefilled">
              The barcodes entered last time are filled in. Change only those that differ; scan any still missing.
            </p>
          )}
          <ProductUnitsInput id="resubmit" units={shown} onChange={setUnits} components={components} disabled={isSubmitting} />
          <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 font-medium cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!problem || isSubmitting}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${SOLID_TONE.primary}`}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Resubmit for approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
