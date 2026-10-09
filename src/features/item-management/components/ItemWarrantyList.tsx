import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import type { ItemWarrantyResponse } from '../types/item.types';
import { describeWarrantyAudit, formatWarrantyDuration } from '../utils/itemWarranty';
import { WarrantyBadge } from './WarrantyBadge';

const DETAIL_SECTIONS = [
  ['coverage', 'Coverage'],
  ['exclusions', 'Exclusions'],
  ['termsAndConditions', 'Terms & Conditions'],
] as const;

const WarrantyRow: React.FC<{ warranty: ItemWarrantyResponse }> = ({ warranty }) => {
  const [expanded, setExpanded] = useState(false);
  const details = DETAIL_SECTIONS.filter(([field]) => warranty[field]?.trim());
  const audit = describeWarrantyAudit(warranty);
  const active = warranty.isActive !== false;

  return (
    <li
      data-inactive={!active}
      className={`p-3 rounded-xl border border-black/5 dark:border-white/5 space-y-1.5 ${
        active ? 'bg-black/[0.02] dark:bg-white/[0.02]' : 'bg-black/[0.04] dark:bg-white/[0.04] opacity-70'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <WarrantyBadge type={warranty.warrantyType} />
        <span className="font-semibold text-black dark:text-white min-w-0 break-words">{warranty.title}</span>
        <span
          className={`ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
            active
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
          }`}
        >
          {active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <div className="flex gap-1">
          <dt className="text-gray-500">Duration:</dt>
          <dd className="font-medium text-black dark:text-white">{formatWarrantyDuration(warranty.durationValue, warranty.durationUnit)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-gray-500">Provider:</dt>
          <dd className="font-medium text-black dark:text-white">{warranty.provider?.trim() || '—'}</dd>
        </div>
      </dl>

      {details.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex items-center gap-1 text-[11px] font-medium text-[#0071e3] hover:underline cursor-pointer"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {expanded ? 'Hide details' : `Show ${details.map(([, label]) => label.toLowerCase()).join(', ')}`}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {details.map(([field, label]) => (
                <div key={field}>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
                  <p className="text-[11px] text-gray-700 dark:text-neutral-300 whitespace-pre-line break-words">{warranty[field]}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {audit && <p className="text-[10px] text-gray-400">{audit}</p>}
    </li>
  );
};

/** Read-only warranties of an item (detail view). */
export const ItemWarrantyList: React.FC<{ warranties: ItemWarrantyResponse[] | null | undefined }> = ({ warranties }) => {
  const list = warranties ?? [];
  return (
    <section aria-label="Warranties" className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
      <span className="font-semibold text-gray-500 flex items-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Warranties ({list.length})
      </span>
      {list.length === 0 ? (
        <p className="text-gray-400 italic">No warranties for this item.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((warranty) => (
            <WarrantyRow key={warranty.id} warranty={warranty} />
          ))}
        </ul>
      )}
    </section>
  );
};
