import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { AuditEntry, FieldChange } from '../types/companyProfile.types';
import { IMAGE_FIELDS, STATUS_LABELS, TRADEMARK_SYMBOLS, fieldLabel, formatServerTime } from '../utils/companyProfile.utils';
import { InvoiceTermsList, ProfileImage } from './ProfileDisplay';

const asText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const ChangeValue: React.FC<{ field: string; value: unknown; side: 'live' | 'proposed' }> = ({ field, value, side }) => {
  if (IMAGE_FIELDS.has(field)) {
    const variant = field === 'faviconUrl' ? 'favicon' : field === 'logoDarkUrl' ? 'logoDark' : 'logo';
    const url = typeof value === 'string' ? value : null;
    return (
      <div className="space-y-1">
        <ProfileImage url={url} alt={`${side === 'live' ? 'Live' : 'Proposed'} ${fieldLabel(field).toLowerCase()}`} variant={variant} />
        {url && <span className="block text-[10px] text-gray-400 break-all">{url}</span>}
      </div>
    );
  }
  if (field === 'invoiceTerms') {
    return <InvoiceTermsList terms={Array.isArray(value) ? value.map(asText) : null} label={`${side === 'live' ? 'Live' : 'Proposed'} invoice terms`} />;
  }
  if (field === 'trademarkMark') {
    const mark = typeof value === 'string' ? value : '';
    return <>{mark ? `${TRADEMARK_SYMBOLS[mark as keyof typeof TRADEMARK_SYMBOLS] ?? ''} ${mark}` : 'None'}</>;
  }
  return <span className="break-words whitespace-pre-line">{asText(value)}</span>;
};

/** "Changes vs live": Field | Live value | Proposed value. */
export const ChangesTable: React.FC<{ changes: FieldChange[] | undefined }> = ({ changes }) => {
  if (!changes || changes.length === 0) {
    return <p className="text-xs text-gray-500 italic p-4">No differences from the live profile.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table aria-label="Changes vs live" className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10 text-gray-500">
            <th className="p-3 font-semibold w-40">Field</th>
            <th className="p-3 font-semibold">Live value</th>
            <th className="p-3 font-semibold">Proposed value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/10 align-top">
          {changes.map((change) => (
            <tr key={change.field} data-testid={`change-${change.field}`}>
              <th scope="row" className="p-3 font-semibold text-black dark:text-white">
                {fieldLabel(change.field)}
              </th>
              <td className="p-3 bg-rose-500/5 text-gray-600 dark:text-gray-300">
                <ChangeValue field={change.field} value={change.liveValue} side="live" />
              </td>
              <td className="p-3 bg-emerald-500/10 text-black dark:text-white font-medium">
                <ChangeValue field={change.field} value={change.value} side="proposed" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const statusLabel = (status: string | null) => (status ? (STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status) : null);

/** Audit trail timeline, oldest first. */
export const AuditTrail: React.FC<{ entries: AuditEntry[] | undefined }> = ({ entries }) => {
  if (!entries || entries.length === 0) return <p className="text-xs text-gray-500 italic">No activity recorded.</p>;
  return (
    <ol aria-label="Audit trail" className="relative border-l border-black/10 dark:border-white/10 ml-2 space-y-4 text-xs">
      {entries.map((entry, i) => {
        const from = statusLabel(entry.fromStatus);
        const to = statusLabel(entry.toStatus);
        return (
          <li key={i} className="pl-4 relative">
            <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-[#0071e3]" aria-hidden />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-black dark:text-white">{entry.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>
              {entry.actor && <span className="text-gray-500">by {entry.actor}</span>}
              <span className="text-gray-400">{formatServerTime(entry.createdAt)}</span>
            </div>
            {(from || to) && (
              <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                {from ?? '—'} <ArrowRight className="w-3 h-3" /> {to ?? '—'}
              </div>
            )}
            {entry.comment && <p className="mt-1 p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black dark:text-white break-words whitespace-pre-line">{entry.comment}</p>}
          </li>
        );
      })}
    </ol>
  );
};
