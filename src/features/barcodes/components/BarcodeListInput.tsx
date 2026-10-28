import React, { useState } from 'react';
import { ScanBarcode, X } from 'lucide-react';
import { ICON_DANGER } from '../../../components/ui/actionTones';
import { BARCODE_RULE, isValidBarcode, splitBarcodes } from '../utils/barcode';

// e.g. "1 barcode", "3 barcodes"
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

interface Props {
  id: string;
  label: string;
  codes: string[];
  onChange: (codes: string[]) => void;
  /** How many codes are needed; more are not taken. */
  expected: number;
  /** Names one piece in messages, e.g. "passed unit". */
  what?: string;
  disabled?: boolean;
  /** Codes that can be picked instead of scanned (e.g. an item's pieces in stock), already used ones left out. */
  suggestions?: string[];
  /** Codes entered elsewhere in the same form: refused here, every piece is unique. */
  usedElsewhere?: ReadonlySet<string>;
  /** Shown under the field, e.g. a server error for it. */
  error?: string;
}

/**
 * Barcodes scanned or typed one by one (a scanner types the code and presses Enter), or pasted many at once. Codes
 * are kept upper-case, as the backends compare them. Malformed and repeated codes are refused with a hint.
 */
export const BarcodeListInput: React.FC<Props> = ({
  id,
  label,
  codes,
  onChange,
  expected,
  what = 'unit',
  disabled,
  suggestions,
  usedElsewhere,
  error,
}) => {
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const missing = Math.max(0, expected - codes.length);
  const available = (suggestions ?? []).filter((code) => !codes.includes(code) && !usedElsewhere?.has(code));

  const add = (incoming: string[]) => {
    const next = [...codes];
    let problem: string | null = null;
    for (const code of incoming) {
      if (!isValidBarcode(code)) problem = `${code} is not a valid barcode: use ${BARCODE_RULE}.`;
      else if (next.includes(code) || usedElsewhere?.has(code)) problem = `${code} is already entered.`;
      else if (next.length >= expected) problem = `Only ${plural(expected, what)} need a barcode here.`;
      else next.push(code);
    }
    setHint(problem);
    if (next.length !== codes.length) onChange(next);
  };

  const submitDraft = () => {
    const incoming = splitBarcodes(draft);
    if (incoming.length) add(incoming);
    setDraft('');
  };

  const isProblem = Boolean(error ?? hint);
  const progress = missing === 0 ? `All ${plural(expected, 'barcode')} entered.` : `${codes.length} of ${expected} scanned: ${missing} more needed.`;
  const statusText = error ?? hint ?? progress;
  let statusTone = 'text-gray-500';
  if (isProblem) statusTone = 'text-rose-500';
  else if (missing === 0) statusTone = 'text-emerald-600';

  return (
    <div className="space-y-1.5" data-testid={`${id}-barcodes`}>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
        {label} <span className="text-rose-500">*</span>
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <ScanBarcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id={id}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            disabled={disabled || missing === 0}
            placeholder={missing === 0 ? 'All barcodes entered' : 'Scan or type a barcode, then Enter'}
            aria-invalid={isProblem}
            aria-describedby={`${id}-status`}
            data-missing={missing}
            onChange={(e) => {
              setDraft(e.target.value);
              setHint(null);
            }}
            onKeyDown={(e) => {
              // A scanner ends each code with Enter: add it, don't submit the form
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                submitDraft();
              }
            }}
            onBlur={submitDraft}
            onPaste={(e) => {
              const pasted = splitBarcodes(e.clipboardData.getData('text'));
              if (pasted.length > 1) {
                e.preventDefault();
                add(pasted);
              }
            }}
            className={`w-full pl-9 pr-3 py-2 rounded-xl border bg-transparent text-xs font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-60 ${
              isProblem ? 'border-rose-500/80' : 'border-black/10 dark:border-white/10'
            }`}
          />
        </div>
        {available.length > 0 && missing > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => add(available.slice(0, missing))}
            className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border border-[#0071e3]/40 bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/20 cursor-pointer disabled:opacity-50"
            title="Fill with pieces in stock, oldest first; replace any you don't actually use"
          >
            Pick {Math.min(missing, available.length)} from stock
          </button>
        )}
      </div>

      {codes.length > 0 && (
        <ul aria-label={`${label}: entered barcodes`} className="flex flex-wrap gap-1.5">
          {codes.map((code) => (
            <li key={code} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 font-mono text-[11px]">
              {code}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove barcode ${code}`}
                onClick={() => onChange(codes.filter((entered) => entered !== code))}
                className={`p-0.5 rounded cursor-pointer ${ICON_DANGER}`}
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p id={`${id}-status`} role={isProblem ? 'alert' : undefined} className={`text-[11px] ${statusTone}`}>
        {statusText}
      </p>
    </div>
  );
};
