import React, { useMemo } from 'react';
import { ScanBarcode } from 'lucide-react';
import type { NewProductUnit } from '../types/barcode.types';
import { useItemPieces } from '../hooks/useItemPieces';
import { codesIn, unitsProblem, type UnitComponent } from '../utils/productUnits';
import { BarcodeListInput } from './BarcodeListInput';

interface Props {
  /** Prefix for field ids, e.g. "new-product". */
  id: string;
  units: NewProductUnit[];
  onChange: (units: NewProductUnit[]) => void;
  components: UnitComponent[];
  disabled?: boolean;
}

/**
 * The barcodes of the product units being built: each unit's own barcode, and for every component one barcode per
 * piece fitted into it. Pieces in stock can be picked instead of scanned (for those who can see barcodes).
 */
export const ProductUnitsInput: React.FC<Props> = ({ id, units, onChange, components, disabled }) => {
  const pieces = useItemPieces(
    useMemo(() => components.map((component) => component.itemId), [components]),
    components.length > 0
  );
  const problem = unitsProblem(units, units.length, components);

  // Codes entered in every other field of the form: each unit and piece is unique
  const usedOutside = (unitIndex: number, field: 'unit' | number): Set<string> => {
    const others = units.map((unit, i) =>
      i !== unitIndex
        ? unit
        : {
            barcode: field === 'unit' ? '' : unit.barcode,
            parts: unit.parts.map((part) => (part.itemId === field ? { ...part, barcodes: [] } : part)),
          }
    );
    return new Set(codesIn(others));
  };

  const setUnit = (index: number, next: NewProductUnit) => onChange(units.map((unit, i) => (i === index ? next : unit)));

  return (
    <div className="space-y-3" data-testid={`${id}-units`}>
      <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <ScanBarcode className="w-3.5 h-3.5 text-[#0071e3]" />
        Every unit carries its own barcode, and so does every component piece fitted into it. Barcodes are locked once the
        product is approved; after that only a Super Admin can change them.
      </p>
      {units.map((unit, i) => (
        <fieldset key={i} className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-3">
          <legend className="px-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
            {units.length === 1 ? 'Product unit' : `Unit ${i + 1} of ${units.length}`}
          </legend>
          <BarcodeListInput
            id={`${id}-unit-${i}`}
            label="Unit barcode"
            what="product unit"
            expected={1}
            disabled={disabled}
            codes={unit.barcode ? [unit.barcode] : []}
            usedElsewhere={usedOutside(i, 'unit')}
            onChange={(codes) => setUnit(i, { ...unit, barcode: codes[0] ?? '' })}
          />
          {components.map((component) => {
            const part = unit.parts.find((entry) => entry.itemId === component.itemId);
            return (
              <BarcodeListInput
                key={component.itemId}
                id={`${id}-unit-${i}-item-${component.itemId}`}
                label={`${component.itemName} × ${component.quantity}`}
                what={`${component.itemName} piece`}
                expected={component.quantity}
                disabled={disabled}
                codes={part?.barcodes ?? []}
                suggestions={pieces[component.itemId]}
                usedElsewhere={usedOutside(i, component.itemId)}
                onChange={(codes) =>
                  setUnit(i, {
                    ...unit,
                    parts: unit.parts.map((entry) => (entry.itemId === component.itemId ? { ...entry, barcodes: codes } : entry)),
                  })
                }
              />
            );
          })}
        </fieldset>
      ))}
      {problem && units.length > 0 && <p className="text-[11px] text-amber-600 dark:text-amber-400" data-testid={`${id}-units-problem`}>{problem}</p>}
    </div>
  );
};
