import React from 'react';
import { EyeOff, Power, RotateCcw, Store, Trash2 } from 'lucide-react';
import type { PromoCodeSummary } from '../types/promoCode.types';
import { discountLabel, formatDay, scopeLabel } from '../utils/promoCodeForm';
import { PromoStatusChip } from './PromoUi';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { CHOICE_TONE } from '../../../components/ui/actionTones';

const rowButton = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer';

/** A Super Admin's row actions: restore a deleted code; switch off or on, or delete, a live one. */
const RowActions: React.FC<{
  code: PromoCodeSummary;
  onToggle: (code: PromoCodeSummary) => void;
  onDelete: (code: PromoCodeSummary) => void;
  onRestore: (code: PromoCodeSummary) => void;
}> = ({ code, onToggle, onDelete, onRestore }) =>
  code.status === 'DELETED' ? (
    <button type="button" onClick={() => onRestore(code)} aria-label={`Restore ${code.code}`} className={`${rowButton} ${CHOICE_TONE.approve.idle}`}>
      <RotateCcw className="w-3 h-3" /> Restore
    </button>
  ) : (
    <span className="inline-flex gap-1.5">
      <button
        type="button"
        onClick={() => onToggle(code)}
        aria-label={`${code.active ? 'Switch off' : 'Switch on'} ${code.code}`}
        className={`${rowButton} ${code.active ? CHOICE_TONE.warning.idle : CHOICE_TONE.approve.idle}`}
      >
        <Power className="w-3 h-3" /> {code.active ? 'Switch off' : 'Switch on'}
      </button>
      <button type="button" onClick={() => onDelete(code)} aria-label={`Delete ${code.code}`} className={`${rowButton} ${CHOICE_TONE.danger.idle}`}>
        <Trash2 className="w-3 h-3" /> Delete
      </button>
    </span>
  );

/**
 * The list of codes. Each row opens its detail; a Super Admin also switches, deletes or restores it from here. A code
 * for chosen customers shows as TINQA*** to everyone but the Super Admin.
 */
export const PromoCodeTable: React.FC<{
  codes: PromoCodeSummary[];
  isLoading: boolean;
  canManage: boolean;
  onOpen: (code: PromoCodeSummary) => void;
  onToggle: (code: PromoCodeSummary) => void;
  onDelete: (code: PromoCodeSummary) => void;
  onRestore: (code: PromoCodeSummary) => void;
}> = ({ codes, isLoading, canManage, onOpen, onToggle, onDelete, onRestore }) => (
  <div className={`apple-card overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
    <table aria-label="Promo codes" aria-busy={isLoading} className="w-full text-xs min-w-[760px]">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500 dark:text-neutral-400 border-b border-black/10 dark:border-white/10">
          <th scope="col" className="p-3 font-semibold">Code</th>
          <th scope="col" className="p-3 font-semibold">Status</th>
          <th scope="col" className="p-3 font-semibold text-right">Off</th>
          <th scope="col" className="p-3 font-semibold">For</th>
          <th scope="col" className="p-3 font-semibold">Valid</th>
          <th scope="col" className="p-3 font-semibold text-right">Uses</th>
          <th scope="col" className="p-3 font-semibold text-right">Discount given</th>
          {canManage && <th scope="col" className="p-3 font-semibold"><span className="sr-only">Actions</span></th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5 dark:divide-white/10">
        {codes.map((code) => (
          <tr key={code.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
            <td className="p-3">
              <button
                type="button"
                onClick={() => onOpen(code)}
                className="font-mono font-semibold text-sm text-[#0071e3] dark:text-blue-300 hover:underline cursor-pointer"
              >
                {code.code}
              </button>
              {code.codeHidden && (
                <EyeOff role="img" aria-label="Only the Super Admin sees this code" className="inline w-3 h-3 ml-1 text-gray-400" />
              )}
              {code.shownOnStorefront && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-300">
                  <Store className="w-2.5 h-2.5" /> On storefront
                </span>
              )}
              {code.description && <p className="text-[11px] text-gray-500 truncate max-w-[220px]">{code.description}</p>}
            </td>
            <td className="p-3"><PromoStatusChip status={code.status} /></td>
            <td className="p-3 text-right font-semibold text-black dark:text-white">{discountLabel(code)}</td>
            <td className="p-3 text-gray-600 dark:text-neutral-300">
              {scopeLabel(code.customerScope, code.customerCount, 'customer')}
              <br />
              {scopeLabel(code.productScope, code.productCount, 'product')}
            </td>
            <td className="p-3 whitespace-nowrap text-gray-600 dark:text-neutral-300">
              {formatDay(code.startsOn)} – {formatDay(code.expiresOn)}
            </td>
            <td className="p-3 text-right text-black dark:text-white">
              {code.timesUsed}
              <span className="text-gray-500"> / {code.totalUsageLimit ?? '∞'}</span>
            </td>
            <td className="p-3 text-right text-black dark:text-white">{formatCurrency(code.totalDiscountGiven)}</td>
            {canManage && (
              <td className="p-3 text-right whitespace-nowrap">
                <RowActions code={code} onToggle={onToggle} onDelete={onDelete} onRestore={onRestore} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
