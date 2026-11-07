import React, { useMemo, useState } from 'react';
import { ClipboardList, Loader2, PackagePlus, PencilLine } from 'lucide-react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useGatedLoad } from '../../../hooks/useGatedLoad';
import { stockDraftsApi } from '../api/stockDraftsApi';
import type { ProductResponse } from '../types/product.types';
import type { StockDraftSummary } from '../types/stockDraft.types';
import type { StockEntryTarget } from '../hooks/useStockEntryEditor';
import { StockEntryEditor } from './StockEntryEditor';

interface Props {
  products: ProductResponse[];
  /** Whether stock can be added to the product now (approved, not a draft). */
  canAddStockTo: (product: ProductResponse) => boolean;
  /** A product to open at once (Add stock on the Products tab); forgotten when its entry closes. */
  openProductId: number | null;
  onOpenedProduct: () => void;
  /** Stock was added: the product list reloads. */
  onStockAdded: () => void;
}

const loadDrafts = () => stockDraftsApi.list();

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
};

/**
 * The Stock entry tab: drafts waiting to be finished, and the grid of the one being worked on. Shown only to
 * STOREFRONT_STOCK_UPDATE holders, and rendered (so loaded) only while the tab is open.
 */
export const StockEntryPanel: React.FC<Props> = ({ products, canAddStockTo, openProductId, onOpenedProduct, onStockAdded }) => {
  const drafts = useGatedLoad(loadDrafts, true, "Couldn't load the stock entry drafts.");
  const list = useMemo<StockDraftSummary[]>(() => drafts.data ?? [], [drafts.data]);
  const [target, setTarget] = useState<StockEntryTarget | null>(null);
  const [chosenId, setChosenId] = useState('');
  const eligible = useMemo(() => products.filter((product) => !product.draft && canAddStockTo(product)), [products, canAddStockTo]);

  // A saved draft for the product is continued; otherwise a new entry starts
  const open = (product: ProductResponse) => {
    const existing = list.find((draft) => draft.productId === product.id);
    setTarget(existing ? { draftId: existing.id, product } : { product });
  };

  // Add stock on the Products tab names a product: its entry opens once the drafts are known (the URL keeps it until closed)
  const [openedProductId, setOpenedProductId] = useState<number | null>(null);
  const requested = openProductId !== null && openProductId !== openedProductId && !drafts.isLoading
    ? products.find((candidate) => candidate.id === openProductId)
    : undefined;
  if (requested) {
    setOpenedProductId(requested.id);
    open(requested);
  }

  const close = () => {
    setTarget(null);
    if (openProductId !== null) onOpenedProduct();
  };

  if (target) {
    return (
      <StockEntryEditor
        key={target.draftId ?? `new-${target.product?.id}`}
        target={target}
        onClose={close}
        onSubmitted={onStockAdded}
        onDraftsChanged={drafts.refresh}
      />
    );
  }

  const chosen = eligible.find((product) => String(product.id) === chosenId);

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl border border-black/10 dark:border-white/10 space-y-3">
        <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
          <PackagePlus className="w-4 h-4 text-emerald-600" /> New stock entry
        </h2>
        <p className="text-[11px] text-gray-500">
          Choose the product, set how many units you are adding, then scan each unit and the pieces fitted into it on its
          own row. Only approved products can take stock.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label htmlFor="stock-entry-product" className="sr-only">
            Product
          </label>
          <select
            id="stock-entry-product"
            value={chosenId}
            onChange={(event) => setChosenId(event.target.value)}
            className="min-w-[16rem] px-2 py-1.5 rounded-lg border border-black/10 dark:border-white/15 bg-transparent text-black dark:text-white"
          >
            <option value="">Choose a product…</option>
            {eligible.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
                {product.modelName ? ` (${product.modelName})` : ''} · {product.stockQuantity} in stock
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!chosen || drafts.isLoading}
            onClick={() => chosen && open(chosen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${SOLID_TONE.primary}`}
          >
            {chosen && list.some((draft) => draft.productId === chosen.id) ? 'Continue its draft' : 'Start'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#0071e3]" /> Drafts
          {drafts.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" aria-label="Loading drafts" />}
        </h2>
        {!drafts.isLoading && list.length === 0 && !drafts.loadFailed && (
          <p className="text-xs text-gray-500">No drafts. Save a stock entry as a draft to finish scanning it later.</p>
        )}
        {list.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
            <table className="min-w-full text-xs">
              <thead className="bg-black/[0.02] dark:bg-white/[0.02] text-left text-gray-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Product</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Units complete</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Last saved</th>
                  <th scope="col" className="px-3 py-2 font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((draft) => (
                  <tr key={draft.id} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-3 py-2 font-medium text-black dark:text-white">
                      {draft.productTitle}
                      {draft.note && <span className="block text-[11px] font-normal text-gray-500">{draft.note}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {draft.completeUnits} of {draft.quantity}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {formatDate(draft.updatedAt)}
                      {draft.updatedBy ? ` by ${draft.updatedBy}` : ''}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setTarget({ draftId: draft.id, product: products.find((product) => product.id === draft.productId) })}
                        aria-label={`Continue the stock entry for ${draft.productTitle}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[#0071e3] bg-[#0071e3]/10 hover:bg-[#0071e3]/20 cursor-pointer"
                      >
                        <PencilLine className="w-3.5 h-3.5" /> Continue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
