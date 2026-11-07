import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { useComponentLimit } from '../hooks/useComponentLimit';

type Limit = ReturnType<typeof useComponentLimit>;

const unitWord = (count: number) => (count === 1 ? 'unit' : 'units');

const FIELD = 'px-2 py-1.5 rounded-lg border border-black/10 dark:border-white/15 bg-transparent text-black dark:text-white disabled:opacity-50';

interface UnitsProps {
  limit: Limit;
  rows: number;
  /** Rows up to here hold barcodes: fewer units can't be chosen. */
  minimum: number;
  onChange: (units: number) => void;
  disabled: boolean;
}

/**
 * Units to add. With components it is a list of 1 to the number of complete sets of pieces in stock (5 motherboards
 * and 10 touch panels used twice per unit: 1 to 5), so no more units can be chosen than can be built.
 */
export const UnitsToAdd: React.FC<UnitsProps> = ({ limit, rows, minimum, onChange, disabled }) => {
  const max = limit.maxUnits;
  const options = Array.from({ length: Math.max(0, max ?? 0) }, (_, i) => i + 1);
  // A draft saved with more units than are in stock now still shows its count, to be lowered
  if (max !== null && max >= 1 && rows > max) options.push(rows);
  let placeholder: string | null = null;
  if (max === null) placeholder = limit.error || !limit.permitted ? 'Unknown' : 'Checking…';
  else if (max < 1) placeholder = '0';

  return (
    <div className="space-y-1">
      <label htmlFor="stock-entry-quantity" className="block font-semibold text-gray-700 dark:text-gray-300">
        Units to add
      </label>
      <select
        id="stock-entry-quantity"
        value={placeholder === null ? String(rows) : ''}
        disabled={disabled || placeholder !== null}
        aria-describedby="stock-entry-capacity-text"
        onChange={(event) => onChange(Number(event.target.value))}
        className={`min-w-[7rem] ${FIELD}`}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {placeholder === null &&
          options.map((value) => (
            <option key={value} value={value} disabled={value < minimum}>
              {value}
              {value > (max ?? 0) ? ' (more than the components allow)' : ''}
            </option>
          ))}
      </select>
      {placeholder === null && minimum > 1 && <p className="text-[11px] text-gray-400">Units 1 to {minimum} hold barcodes, so fewer can't be chosen.</p>}
    </div>
  );
};

/** What the components in stock allow, and why. */
export const LimitNote: React.FC<{ limit: Limit; rows: number }> = ({ limit, rows }) => {
  if (limit.noComponents) {
    return (
      <p role="alert" id="stock-entry-capacity-text" data-testid="stock-entry-capacity" className="text-[11px] text-rose-600">
        No component available: this product has no components, so no unit can be built. Add its components in Edit Product first.
      </p>
    );
  }
  if (!limit.permitted) {
    return (
      <p role="alert" className="text-[11px] text-rose-600">
        Adding units needs the item stock and barcodes of the components, which your role can't see. Ask a Super Admin.
      </p>
    );
  }
  if (limit.error) {
    return (
      <p role="alert" className="flex items-center gap-2 text-[11px] text-rose-600">
        {limit.error} Units can be chosen once the components in stock are known.
        <button type="button" onClick={limit.retry} className="inline-flex items-center gap-1 underline cursor-pointer">
          <RefreshCw className="w-3 h-3" /> Try again
        </button>
      </p>
    );
  }
  if (!limit.limit) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Checking the components in stock…
      </p>
    );
  }
  const { max, limiting } = limit.limit;
  const why = limiting
    ? `${limiting.itemName}: ${Math.min(limiting.available, limiting.withBarcode)} in stock with a barcode, ${limiting.perUnit} per unit`
    : '';
  return (
    <div data-testid="stock-entry-capacity" id="stock-entry-capacity-text" className="text-[11px] space-y-0.5">
      {max < 1 ? (
        <p role="alert" className="text-rose-600">
          No component available to add this product: not one complete set of its components is in stock{why ? ` (${why})` : ''}.
        </p>
      ) : (
        <p className="text-gray-500">
          Up to {max} {unitWord(max)} can be built from the components in stock{why ? ` (${why}).` : '.'}
        </p>
      )}
      {max >= 1 && rows > max && (
        <p role="alert" className="text-rose-600">
          This entry has {rows} units, but the components in stock allow only {max}. Lower Units to add before saving.
        </p>
      )}
    </div>
  );
};
