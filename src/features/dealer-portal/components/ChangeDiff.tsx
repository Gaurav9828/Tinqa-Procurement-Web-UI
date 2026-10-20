import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { QuotationTerms } from '../types/dealerPortal.types';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { formatDate } from '../../finance/utils/period';
import { formatUnit } from '../../../constants/unitsOfMeasure';
import { describeTax, readTaxBreakup } from '../../order-management/utils/quotationTax';

type Field = keyof QuotationTerms;

const ROWS: { field: Field; label: string; format: (terms: QuotationTerms) => string }[] = [
  { field: 'itemId', label: 'Item', format: (t) => t.itemName ?? (t.itemId != null ? `#${t.itemId}` : '—') },
  { field: 'orderQuantity', label: 'Quantity', format: (t) => (t.orderQuantity != null ? String(t.orderQuantity) : '—') },
  { field: 'unitType', label: 'Unit', format: (t) => (t.unitType ? formatUnit(t.unitType) : '—') },
  { field: 'unitPrice', label: 'Unit price', format: (t) => formatCurrency(t.unitPrice) },
  { field: 'shipmentPrice', label: 'Shipment price', format: (t) => formatCurrency(t.shipmentPrice) },
  {
    field: 'taxBreakup',
    label: 'GST',
    format: (t) => {
      const gst = readTaxBreakup(t.taxBreakup);
      return gst ? `${describeTax(t.taxBreakup)} · ${formatCurrency(gst.totalTax)} tax · ${formatCurrency(gst.grandTotal)} in all` : 'No GST breakup';
    },
  },
  { field: 'expectedDelivery', label: 'Expected delivery', format: (t) => formatDate(t.expectedDelivery) },
  { field: 'note', label: 'Remarks', format: (t) => t.note?.trim() || '—' },
];

/** Each proposed field next to its value when the change was made. */
export const ChangeDiff: React.FC<{ changes: QuotationTerms; previous: QuotationTerms }> = ({ changes, previous }) => {
  const rows = ROWS.filter(({ field }) => changes[field] !== undefined && changes[field] !== null);
  if (rows.length === 0) return <p className="text-xs text-gray-500">No fields changed.</p>;
  return (
    <dl className="divide-y divide-black/5 dark:divide-white/10 rounded-xl border border-black/10 dark:border-white/10 text-sm">
      {rows.map(({ field, label, format }) => (
        <div key={field} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2 items-center">
          <dt className="text-xs text-gray-500 dark:text-neutral-400">{label}</dt>
          <dd className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="line-through text-gray-400 break-words">{format(previous)}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
            <span className="font-semibold break-words" data-testid={`change-${field}`}>
              {format(changes)}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
};
