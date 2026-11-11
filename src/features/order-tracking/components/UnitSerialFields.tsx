import React from 'react';
import { ScanBarcode } from 'lucide-react';
import { CommonInput } from '../../../components/ui/FormInputs';
import type { SerialSlot } from '../utils/unitSerials';

interface Props {
  slots: SerialSlot[];
  values: Record<string, string>;
  errors: Record<string, string>;
  /** A server error about the serials as a whole (e.g. "is a unit of another product"). */
  error?: string;
  disabled?: boolean;
  onChange: (key: string, value: string) => void;
}

/**
 * One box per unit shipped: scan the unit's barcode (a scanner types it and presses Enter) or type it. The serial ties
 * the unit to this order line, and its warranty starts when the order is delivered.
 */
export const UnitSerialFields: React.FC<Props> = ({ slots, values, errors, error, disabled = false, onChange }) => (
  <div className="space-y-2 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]" role="group" aria-label="Unit serials">
    <p className="flex items-start gap-1.5 text-[11px] text-gray-700 dark:text-gray-300">
      <ScanBarcode className="w-3.5 h-3.5 mt-px shrink-0" />
      <span>Scan the barcode of every unit you pack. Each serial is the unit&rsquo;s warranty record.</span>
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {slots.map((slot) => {
        const label = slot.quantity > 1 ? `${slot.title} — unit ${slot.position} of ${slot.quantity}` : slot.title;
        return (
          <CommonInput
            key={slot.key}
            label={label}
            aria-label={`Serial of ${label}`}
            maxLength={40}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="font-mono uppercase"
            placeholder="Scan or type"
            value={values[slot.key] ?? ''}
            error={errors[slot.key]}
            disabled={disabled}
            onKeyDown={(e) => {
              // A scanner ends with Enter: go to the next box instead of submitting the form
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const inputs = [...(e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[aria-label^="Serial of"]') ?? [])];
              inputs[inputs.indexOf(e.currentTarget) + 1]?.focus();
            }}
            onChange={(e) => onChange(slot.key, e.target.value)}
          />
        );
      })}
    </div>
    {error && (
      <p role="alert" className="text-[11px] text-red-600 dark:text-red-400 px-1">
        {error}
      </p>
    )}
  </div>
);
