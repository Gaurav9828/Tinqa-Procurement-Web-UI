import React, { useCallback, useState } from 'react';
import { Loader2, PackageMinus, X } from 'lucide-react';
import type { ProductResponse, UpdateProductRequest } from '../types/product.types';
import { useStockAdjustment } from '../hooks/useStockAdjustment';
import { STOCK_NOTE_MAX_LENGTH, calculateNewStock } from '../utils/stockAdjustment';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import type { ProductUnitBarcodes } from '../../barcodes/types/barcode.types';
import { barcodeApi } from '../../barcodes/api/barcodeApi';
import { useBarcodeList } from '../../barcodes/hooks/useBarcodeList';
import { BarcodeListInput } from '../../barcodes/components/BarcodeListInput';

interface Props {
  product: ProductResponse;
  updateProduct: (id: number, payload: UpdateProductRequest) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Pop-up to take units of a product out of stock, naming each unit's barcode. Saves through the normal product update.
 * Units are added in Product Management's Stock entry tab instead, one row per unit and the pieces fitted into it.
 */
export const StockAdjustModal: React.FC<Props> = ({ product, updateProduct, onClose }) => {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  // Units taken out are named by barcode
  const [removed, setRemoved] = useState<string[]>([]);

  const { product: latest, isLoading, loadFailed, isSaving, reduce } = useStockAdjustment(product.id, updateProduct);
  const loadUnits = useCallback((id: number) => barcodeApi.forProduct(id), []);
  const productUnits = useBarcodeList<ProductUnitBarcodes>(product.id, loadUnits, 'product unit barcodes');
  const currentStock = latest?.stockQuantity ?? product.stockQuantity;

  const calculation = quantity ? calculateNewStock(currentStock, 'reduce', quantity) : null;
  const inlineError = serverError ?? (calculation && !calculation.ok ? calculation.error : null);
  const changed = calculation?.ok ? Math.abs(calculation.newStock - currentStock) : 0;

  // Units in stock with a barcode; units built before barcodes existed are the only ones that can go unnamed
  const heldCodes = productUnits.data.filter(({ unit }) => unit.status === 'IN_STOCK' || unit.status === 'PENDING').map(({ unit }) => unit.code);
  const unnamedAllowed = productUnits.allowed ? Math.max(0, currentStock - heldCodes.length) : 0;
  const namedNeeded = Math.max(0, changed - unnamedAllowed);
  const removedReady = removed.length >= namedNeeded && removed.length <= changed;
  const canSave = !isLoading && !loadFailed && !isSaving && !!calculation?.ok && removedReady;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const result = await reduce(quantity, note, removed.slice(0, changed));
    if (result.ok) onClose();
    else if (result.quantityError) setServerError(result.quantityError);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Reduce stock for ${product.title}`}
        className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl text-xs max-h-[92vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 font-bold text-black dark:text-white text-sm">
            <PackageMinus className="w-4 h-4 text-rose-600" /> Reduce stock
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-3 p-3 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl">
            <span className="font-semibold text-black dark:text-white truncate">{product.title}</span>
            <span className="shrink-0 text-gray-500">
              Current stock:{' '}
              {isLoading ? (
                <Loader2 className="inline w-3 h-3 animate-spin" aria-label="Loading current stock" />
              ) : (
                <strong className="text-black dark:text-white" data-testid="current-stock">
                  {currentStock}
                </strong>
              )}
            </span>
          </div>

          {loadFailed && (
            <p role="alert" className="text-[11px] text-red-500">
              Couldn't load the latest stock for this product. Close and try again.
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="stock-quantity" className="block font-semibold text-gray-700 dark:text-gray-300">
              Quantity to remove
            </label>
            <input
              id="stock-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={currentStock}
              step={1}
              autoFocus
              value={quantity}
              disabled={isSaving}
              aria-invalid={!!inlineError}
              aria-describedby="stock-quantity-help"
              onChange={(e) => {
                setQuantity(e.target.value);
                setServerError(null);
              }}
              className={`w-full px-3 py-2 rounded-xl border bg-transparent text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
                inlineError ? 'border-red-500/80' : 'border-black/10 dark:border-white/10'
              }`}
            />
            <p id="stock-quantity-help" className={`text-[11px] ${inlineError ? 'text-red-500' : 'text-gray-500'}`}>
              {inlineError ??
                (calculation?.ok ? (
                  <>
                    New stock: {currentStock} → <strong data-testid="new-stock">{calculation.newStock}</strong>
                  </>
                ) : (
                  `Up to ${currentStock} can be removed.`
                ))}
            </p>
          </div>

          {changed > 0 && (
            <div className="space-y-1">
              <BarcodeListInput
                id="stock-remove"
                label={`Barcodes of the ${changed} unit${changed === 1 ? '' : 's'} taken out`}
                what="unit taken out"
                expected={changed}
                disabled={isSaving}
                codes={removed}
                onChange={setRemoved}
                suggestions={heldCodes}
              />
              <p className="text-[11px] text-gray-400">
                {namedNeeded < changed
                  ? `${changed - namedNeeded} of them may go unnamed: units built before barcodes were recorded have none. `
                  : ''}
                Their component pieces go back to item stock.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="stock-note" className="block font-semibold text-gray-700 dark:text-gray-300">
              Reason <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="stock-note"
              type="text"
              maxLength={STOCK_NOTE_MAX_LENGTH}
              value={note}
              disabled={isSaving}
              placeholder="e.g. Damaged units"
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
            <p className="text-[11px] text-gray-400">Saved as the product's last update note.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 text-black dark:text-white rounded-xl font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${SOLID_TONE.danger}`}
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSaving ? 'Saving…' : 'Reduce stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
