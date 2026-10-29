import React, { useMemo, useState } from 'react';
import { Barcode, ChevronDown, ChevronUp, Loader2, Package, Search, Trash2, X } from 'lucide-react';
import { ICON_DANGER, SOLID_TONE } from '../../../components/ui/actionTones';
import { useNotify } from '../../../hooks/useNotify';
import type { ProductResponse } from '../../products-management/types/product.types';
import { clientDemoApi } from '../api/clientDemoApi';
import { useDemoUnitOptions } from '../hooks/useClientDemoData';
import { MAX_PRODUCTS, MAX_PRODUCT_UNITS } from '../utils/clientDemo';
import { unitsOf, type PlanErrors, type ProductPick } from '../utils/planForm';

/** The days the units are picked for, and the demo being changed (its own units don't count as taken). */
export interface UnitWindow {
  startDate: string;
  days: number;
  demoId: number | null;
}

const normalize = (code: string) => code.trim().toUpperCase();

/** The product's units in stock: tick the ones taken. Loaded when the list is opened. */
const UnitList: React.FC<{ product: ProductPick; unitWindow: UnitWindow; onToggle: (barcode: string) => void }> = ({ product, unitWindow, onToggle }) => {
  const units = useDemoUnitOptions(product.productId, unitWindow.startDate, unitWindow.days, unitWindow.demoId, true);
  const picked = new Set(product.barcodes);
  if (units.isLoading) {
    return <p className="p-2 text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading units…</p>;
  }
  // Units picked earlier that are no longer in stock still show, so they can be unticked
  const listed = units.data ?? [];
  const missing = product.barcodes.filter((code) => !listed.some((unit) => unit.barcode === code));
  if (listed.length === 0 && missing.length === 0) return <p className="p-2 text-xs text-gray-400">No unit of this product is in stock.</p>;
  return (
    <ul aria-label={`Units of ${product.productName}`} className="max-h-48 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
      {missing.map((code) => (
        <li key={code} className="flex items-center gap-2 px-2 py-1.5 text-xs">
          <input type="checkbox" checked aria-label={`Unit ${code}`} onChange={() => onToggle(code)} className="cursor-pointer" />
          <span className="font-mono">{code}</span>
          <span className="text-gray-400">picked before</span>
        </li>
      ))}
      {listed.map((unit) => {
        const checked = picked.has(unit.barcode);
        return (
          <li key={unit.barcode} className="flex items-center gap-2 px-2 py-1.5 text-xs">
            <input type="checkbox" checked={checked} disabled={!checked && !unit.available} aria-label={`Unit ${unit.barcode}`}
              onChange={() => onToggle(unit.barcode)} className="cursor-pointer disabled:cursor-not-allowed" />
            <span className={`font-mono ${unit.available || checked ? '' : 'text-gray-400 line-through'}`}>{unit.barcode}</span>
            <span className={unit.available || checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              {checked || unit.available ? unit.statusLabel : unit.note}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * Picks the storefront products shown on the demo and, for accountability, each unit taken by its barcode: tick units
 * from a product's list, or scan / type a barcode, which adds its product too. Units already taken by another demo on
 * these days can't be picked. The products on sale are loaded once (shared lookup) and filtered here.
 */
export const ProductPicker: React.FC<{
  options: ProductResponse[];
  isLoading: boolean;
  selected: ProductPick[];
  errors: PlanErrors;
  unitWindow: UnitWindow;
  onChange: (products: ProductPick[]) => void;
}> = ({ options, isLoading, selected, errors, unitWindow, onChange }) => {
  const notify = useNotify();
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const chosen = useMemo(() => new Set(selected.map((product) => product.productId)), [selected]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((product) => !chosen.has(product.id)
      && (!q || [product.title, product.category?.name].some((value) => value?.toLowerCase().includes(q))));
  }, [options, query, chosen]);
  const datesSet = unitWindow.startDate !== '';

  const add = (product: ProductResponse) => {
    onChange([...selected, { productId: product.id, productName: product.title, quantity: '0', barcodes: [] }]);
    setOpen(product.id);
  };
  const toggle = (productId: number, barcode: string) =>
    onChange(selected.map((product) => {
      if (product.productId !== productId) return product;
      const barcodes = product.barcodes.includes(barcode) ? product.barcodes.filter((c) => c !== barcode) : [...product.barcodes, barcode];
      return { ...product, barcodes };
    }));
  const remove = (productId: number) => onChange(selected.filter((product) => product.productId !== productId));

  // A scanned or typed barcode adds its unit, and its product when it isn't listed yet
  const addByBarcode = async () => {
    const wanted = normalize(code);
    if (!wanted) return;
    if (selected.some((product) => product.barcodes.includes(wanted))) {
      setCodeError(`${wanted} is already picked.`);
      return;
    }
    setLookingUp(true);
    setCodeError('');
    try {
      const res = await clientDemoApi.unitLookup(wanted, unitWindow.startDate, unitWindow.days, unitWindow.demoId);
      const unit = res.data;
      if (!res.success || !unit) {
        setCodeError(res.message || `No unit carries ${wanted}.`);
        return;
      }
      if (!unit.available) {
        const label = unit.productTitle ? `${unit.barcode} (${unit.productTitle})` : unit.barcode;
        setCodeError(`${label} can't be picked: ${unit.note ?? unit.statusLabel}.`);
        return;
      }
      const listed = selected.find((product) => product.productId === unit.productId);
      if (!listed && selected.length >= MAX_PRODUCTS) {
        setCodeError(`At most ${MAX_PRODUCTS} products.`);
        return;
      }
      const name = unit.productTitle ?? options.find((product) => product.id === unit.productId)?.title ?? `Product ${unit.productId}`;
      onChange(listed
        ? selected.map((product) => (product.productId === unit.productId ? { ...product, barcodes: [...product.barcodes, unit.barcode] } : product))
        : [...selected, { productId: unit.productId, productName: name, quantity: '0', barcodes: [unit.barcode] }]);
      setCode('');
    } catch (err: unknown) {
      notify.error(err, `${wanted} could not be looked up.`);
    } finally {
      setLookingUp(false);
    }
  };

  let list: React.ReactNode;
  if (isLoading) {
    list = <p className="p-3 text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading products…</p>;
  } else if (matches.length === 0) {
    list = <p className="p-3 text-xs text-gray-400">{query || options.length === 0 ? 'No product matches.' : 'Every product is added.'}</p>;
  } else {
    list = matches.slice(0, 50).map((product) => (
      <button key={product.id} type="button" disabled={selected.length >= MAX_PRODUCTS || !datesSet} onClick={() => add(product)}
        className="w-full text-left px-3 py-2 text-xs hover:bg-[#0071e3]/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        <span className="font-semibold text-gray-800 dark:text-gray-200">{product.title}</span>
        {product.category && <span className="text-gray-400"> · {product.category.name}</span>}
      </button>
    ));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5 text-[#0071e3]" /> Products to demo
        <span className="font-normal text-gray-400">· pick each unit you take by its barcode; it leaves stock when handed out on the day</span>
      </p>
      {!datesSet && <p className="text-xs text-amber-600 dark:text-amber-400">Set the demo’s date first: units are picked for its days.</p>}

      <form className="flex items-start gap-2" onSubmit={(e) => { e.preventDefault(); void addByBarcode(); }}>
        <div className="relative flex-1">
          <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input aria-label="Scan or type a barcode" value={code} disabled={!datesSet} maxLength={32}
            onChange={(e) => { setCode(e.target.value); setCodeError(''); }} placeholder="Scan or type a unit’s barcode"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/20 dark:border-white/20 bg-transparent text-sm font-mono focus:outline-none focus:border-[#0071e3] disabled:opacity-50" />
        </div>
        <button type="submit" disabled={!datesSet || lookingUp || !code.trim()}
          className={`px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE.primary}`}>
          {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add unit'}
        </button>
      </form>
      {codeError && <p role="alert" className="text-xs text-rose-500">{codeError}</p>}

      {selected.length === 0 ? (
        <p className="text-xs text-gray-400">No products chosen yet.</p>
      ) : (
        <ul aria-label="Products to demo" className="space-y-2">
          {selected.map((product) => {
            const units = unitsOf(product);
            const legacy = product.barcodes.length === 0 && units > 0;
            const isOpen = open === product.productId;
            const error = errors[`product-${product.productId}`];
            return (
              <li key={product.productId} className="rounded-xl border border-black/10 dark:border-white/10 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200 truncate" title={product.productName}>{product.productName}</p>
                  <span className="text-xs text-gray-500 shrink-0">{units} {units === 1 ? 'unit' : 'units'}</span>
                  <button type="button" aria-expanded={isOpen} disabled={!datesSet || product.barcodes.length >= MAX_PRODUCT_UNITS && !isOpen}
                    onClick={() => setOpen(isOpen ? null : product.productId)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0071e3] hover:underline cursor-pointer disabled:opacity-50">
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Pick units
                  </button>
                  <button type="button" aria-label={`Remove ${product.productName}`} onClick={() => remove(product.productId)}
                    className={`p-1.5 rounded-lg cursor-pointer ${ICON_DANGER}`}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {legacy && <p className="text-xs text-amber-600 dark:text-amber-400">Listed before units were picked by barcode. Pick its units to track them.</p>}
                {product.barcodes.length > 0 && (
                  <ul aria-label={`Barcodes of ${product.productName}`} className="flex flex-wrap gap-1.5">
                    {product.barcodes.map((barcode) => (
                      <li key={barcode} className="inline-flex items-center gap-1 rounded-lg bg-[#0071e3]/10 px-2 py-0.5 text-xs font-mono text-[#0071e3] dark:text-blue-300">
                        {barcode}
                        <button type="button" aria-label={`Drop unit ${barcode}`} onClick={() => toggle(product.productId, barcode)} className="cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {isOpen && datesSet && (
                  <div className="rounded-lg border border-black/10 dark:border-white/10">
                    <UnitList product={product} unitWindow={unitWindow} onToggle={(barcode) => toggle(product.productId, barcode)} />
                  </div>
                )}
                {error && <p className="text-xs text-rose-500">{error}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          aria-label="Find products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or find a product by name or category, then pick its units"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/20 dark:border-white/20 bg-transparent text-sm focus:outline-none focus:border-[#0071e3]"
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
        {list}
      </div>
    </div>
  );
};
