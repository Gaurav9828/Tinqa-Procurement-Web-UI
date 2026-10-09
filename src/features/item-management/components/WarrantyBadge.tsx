import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import type { ItemWarrantyResponse } from '../types/item.types';
import { formatWarrantyType, summarizeWarranty } from '../utils/itemWarranty';

const TYPE_TONES: Record<string, string> = {
  MANUFACTURER: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  EXTENDED: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  REPLACEMENT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  LIMITED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
};
const DEFAULT_TONE = 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20';

/** Warranty type pill, e.g. "Manufacturer". */
export const WarrantyBadge: React.FC<{ type: string | null | undefined }> = ({ type }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border whitespace-nowrap ${TYPE_TONES[type ?? ''] ?? DEFAULT_TONE}`}
  >
    {formatWarrantyType(type)}
  </span>
);

/**
 * Compact count for tables and pickers: "2 warranties" with a tooltip listing the titles,
 * or "—" when there are none. Reusable wherever an item's warranties need a one-glance summary.
 */
export const WarrantySummary: React.FC<{ warranties: ItemWarrantyResponse[] | null | undefined }> = ({ warranties }) => {
  const list = warranties ?? [];
  if (list.length === 0) return <span className="text-gray-400">—</span>;
  const label = `${list.length} ${list.length === 1 ? 'warranty' : 'warranties'}`;
  return (
    <Tooltip
      title="Warranties"
      content={
        <ul className="space-y-0.5">
          {list.map((w) => (
            <li key={w.id}>
              {w.title}
              <span className="text-neutral-400"> — {summarizeWarranty(w)}</span>
              {w.isActive === false && <span className="text-amber-400"> (inactive)</span>}
            </li>
          ))}
        </ul>
      }
    >
      <span tabIndex={0} className="inline-flex items-center gap-1 font-medium text-black dark:text-white cursor-help whitespace-nowrap">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> {label}
      </span>
    </Tooltip>
  );
};
