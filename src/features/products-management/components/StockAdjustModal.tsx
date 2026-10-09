import React, { useState } from 'react';
import { Loader2, PackageMinus, PackagePlus, X } from 'lucide-react';
import type { ProductResponse, UpdateProductRequest } from '../types/product.types';
import { useStockAdjustment } from '../hooks/useStockAdjustment';
import { MAX_STOCK_ADJUSTMENT, STOCK_NOTE_MAX_LENGTH, calculateNewStock, type StockAdjustMode } from '../utils/stockAdjustment';
import { describeLimitingComponent, quantityOptions } from '../utils/componentStock';

interface Props {
  product: ProductResponse;
  initialMode: StockAdjustMode;
  updateProduct: (id: number, payload: UpdateProductRequest) => Promise<boolean>;
  onClose: () => void;
}

const MODES: Record<StockAdjustMode, { label: string; icon: React.ElementType; verb: string }> = {
  add: { label: 'Add stock', icon: PackagePlus, verb: 'add' },
  reduce: { label: 'Reduce stock', icon: PackageMinus, verb: 'remove' },
};

/** Pop-up to add or reduce a product's stock by a quantity. Saves through the normal product update. */
export const StockAdjustModal: React.FC<Props> = ({ product, initialMode, updateProduct, onClose }) => {
  const [mode, setMode] = useState<StockAdjustMode>(initialMode);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const { product: latest, isLoading, loadFailed, isSaving, adjust, capacity, capacityError } = useStockAdjustment(product.id, updateProduct);
  const currentStock = latest?.stockQuantity ?? product.stockQuantity;
  // Products built from components can only grow as far as their items' stock allows.
  const usesComponents = (latest?.components ?? product.components ?? []).length > 0;
  const maxAdd = mode === 'add' && usesComponents ? capacity?.maxAddable ?? null : null;
  const capacityBlocked = mode === 'add' && usesComponents && (!capacity || !!capacityError);

  const calculation = quantity ? calculateNewStock(currentStock, mode, quantity, maxAdd) : null;
  const inlineError = serverError ?? (calculation && !calculation.ok ? calculation.error : null);
  const canSave = !isLoading && !loadFailed && !isSaving && !capacityBlocked && !!calculation?.ok;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const result = await adjust(mode, quantity, note);
    if (result.ok) onClose();
    else if (result.quantityError) setServerError(result.quantityError);
  };

  const ModeIcon = MODES[mode].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Adjust stock for ${product.title}`}
        className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-md flex flex-col shadow-2xl text-xs"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 font-bold text-black dark:text-white text-sm">
            <ModeIcon className="w-4 h-4 text-[#0071e3]" /> {MODES[mode].label}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
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

          <div role="radiogroup" aria-label="Adjustment type" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5">
            {(Object.keys(MODES) as StockAdjustMode[]).map((key) => {
              const { label, icon: Icon } = MODES[key];
              const active = key === mode;
              const disabled = isSaving || (key === 'reduce' && currentStock <= 0);
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => {
                    setMode(key);
                    setQuantity('');
                    setServerError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    active ? 'bg-white dark:bg-neutral-800 text-[#0071e3] shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              );
            })}
          </div>

          <div className="space-y-1">
            <label htmlFor="stock-quantity" className="block font-semibold text-gray-700 dark:text-gray-300">
              Quantity to {MODES[mode].verb}
            </label>
            {mode === 'add' && usesComponents ? (
              // Built from components: the quantity is calculated from item stock, so it's chosen, not typed.
              <select
                id="stock-quantity"
                value={quantity}
                disabled={isSaving || capacityBlocked || (maxAdd ?? 0) < 1}
                aria-invalid={!!inlineError}
                aria-describedby="stock-quantity-help"
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setServerError(null);
                }}
                className={`w-full px-3 py-2 rounded-xl border bg-transparent text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-60 ${
                  inlineError ? 'border-red-500/80' : 'border-black/10 dark:border-white/10'
                }`}
              >
                <option value="">
                  {capacityBlocked ? 'Checking item stock…' : (maxAdd ?? 0) < 1 ? 'Not enough item stock' : 'Select quantity'}
                </option>
                {quantityOptions(Math.max(0, maxAdd ?? 0)).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="stock-quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={mode === 'reduce' ? currentStock : maxAdd ?? MAX_STOCK_ADJUSTMENT}
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
            )}
            <p id="stock-quantity-help" className={`text-[11px] ${inlineError ? 'text-red-500' : 'text-gray-500'}`}>
              {inlineError ??
                (calculation?.ok ? (
                  <>
                    New stock: {currentStock} → <strong data-testid="new-stock">{calculation.newStock}</strong>
                  </>
                ) : mode === 'reduce' ? (
                  `Up to ${currentStock} can be removed.`
                ) : maxAdd !== null ? (
                  `Up to ${maxAdd} can be added with the current item stock.`
                ) : (
                  'Whole numbers only.'
                ))}
            </p>
          </div>

          {mode === 'add' && usesComponents && (
            <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-1" data-testid="component-capacity">
              <p className="font-semibold text-gray-700 dark:text-gray-300">Item stock used per product unit</p>
              {capacityError ? (
                <p role="alert" className="text-red-500">{capacityError}</p>
              ) : !capacity ? (
                <p className="text-gray-500">
                  <Loader2 className="inline w-3 h-3 animate-spin" /> Checking item stock…
                </p>
              ) : (
                <>
                  <ul className="space-y-0.5 text-gray-600 dark:text-gray-400">
                    {capacity.lines.map((line) => (
                      <li key={line.itemId}>
                        {line.itemName} × {line.perUnit} — {line.available} in stock
                      </li>
                    ))}
                  </ul>
                  {capacity.maxAddable !== null && capacity.lines.length > 1 && (
                    <p className="text-[11px] text-gray-500">Limited by {describeLimitingComponent(capacity.lines)}.</p>
                  )}
                </>
              )}
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
              placeholder={mode === 'add' ? 'e.g. Supplier delivery' : 'e.g. Damaged units'}
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
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-semibold transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSaving ? 'Saving…' : mode === 'add' ? 'Add stock' : 'Reduce stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
