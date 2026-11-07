import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { pieceOptions } from '../utils/stockEntryGrid';

/** Most suggestions listed at once; typing narrows the rest. */
const MAX_SHOWN = 50;

interface Props {
  value: string;
  /** A code typed or picked. */
  onChange: (code: string) => void;
  /** Enter: go to the next cell (after picking the highlighted piece, if any). */
  onCommit: () => void;
  onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  inputRef: (element: HTMLInputElement | null) => void;
  /** Pieces of this component in stock with a barcode (null: not known). */
  inStock: string[] | null;
  /** Codes entered in the other cells, never offered again. */
  used: Set<string>;
  itemName: string;
  ariaLabel: string;
  problem: string | undefined;
  disabled?: boolean;
  className: string;
}

/**
 * A component piece's cell: typed or scanned, or picked from the pieces in stock that drop down when the cell is
 * clicked (pieces already entered in another cell are left out). Arrow keys move through the list, Enter picks; a
 * scanner's Enter with nothing highlighted keeps what was scanned.
 */
export const StockEntryPieceInput: React.FC<Props> = ({
  value,
  onChange,
  onCommit,
  onPaste,
  inputRef,
  inStock,
  used,
  itemName,
  ariaLabel,
  problem,
  disabled,
  className,
}) => {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const anchor = useRef<HTMLInputElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const options = open ? pieceOptions(inStock ?? [], used, value) : [];
  const shown = options.slice(0, MAX_SHOWN);

  // The list floats over the grid (which scrolls), right under the cell
  useLayoutEffect(() => {
    const input = anchor.current;
    if (!open || !input) return;
    const place = () => {
      const rect = input.getBoundingClientRect();
      setPosition({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 176) });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlight((current) => Math.max(-1, Math.min(shown.length - 1, current + step)));
    } else if (event.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (open && highlight >= 0 && shown[highlight]) pick(shown[highlight]);
      setOpen(false);
      setHighlight(-1);
      onCommit();
    }
  };

  let empty: string | null = null;
  if (inStock === null) empty = `The ${itemName} pieces in stock aren't known: scan or type the barcode.`;
  else if (options.length === 0) empty = value ? `No ${itemName} piece in stock matches ${value}.` : `No more ${itemName} pieces in stock with a barcode.`;

  return (
    <>
      <input
        ref={(element) => {
          anchor.current = element;
          inputRef(element);
        }}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && highlight >= 0 ? `${listId}-${highlight}` : undefined}
        aria-label={ariaLabel}
        aria-invalid={problem ? true : undefined}
        title={problem}
        value={value}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setHighlight(-1);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className={className}
      />
      {open && position && (
        <div
          className="fixed z-50 max-h-56 overflow-y-auto rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-xl text-xs"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <ul id={listId} role="listbox" aria-label={`${itemName} pieces in stock`}>
            {shown.map((code, i) => (
              <li
                key={code}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === highlight}
                // Keep the focus in the cell, so picking doesn't close the list first
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(code)}
                className={`px-2 py-1 font-mono cursor-pointer ${i === highlight ? 'bg-[#0071e3] text-white' : 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}
              >
                {code}
              </li>
            ))}
          </ul>
          {empty && <p className="px-2 py-1.5 text-gray-500">{empty}</p>}
          {options.length > MAX_SHOWN && (
            <p className="px-2 py-1.5 text-gray-500">{options.length - MAX_SHOWN} more: type to narrow the list.</p>
          )}
        </div>
      )}
    </>
  );
};
