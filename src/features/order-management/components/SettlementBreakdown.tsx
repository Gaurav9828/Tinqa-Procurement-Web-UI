import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { MILESTONE_LABELS, type PaymentSettlement, type PaymentSummary } from '../types/supplierPayment.types';

const units = (value: number, unitType: string) => `${Number(value)} ${unitType}`;
const minus = (value: number) => `− ${formatCurrency(Math.abs(value))}`;
const round2 = (value: number) => Math.round(value * 100) / 100;

type Tone = 'normal' | 'less' | 'total' | 'final';

const ROW_TONE: Record<Tone, string> = {
  normal: 'text-gray-600 dark:text-gray-300',
  less: 'text-rose-600 dark:text-rose-400',
  total: 'font-semibold text-black dark:text-white border-t border-black/10 dark:border-white/10',
  final: 'font-bold text-sm text-black dark:text-white border-t-2 border-black/20 dark:border-white/20',
};

/** One line of the calculation: what it is, how it is worked out (e.g. "2 PCS × ₹100.00") and the amount. */
const Row: React.FC<{ label: string; how?: string; amount: string; tone?: Tone; testId?: string }> = ({ label, how, amount, tone = 'normal', testId }) => (
  <tr className={ROW_TONE[tone]}>
    <td className="py-1 pr-2">{label}</td>
    <td className="py-1 pr-2 text-gray-400 font-normal">{how}</td>
    <td className="py-1 text-right tabular-nums whitespace-nowrap" data-testid={testId}>{amount}</td>
  </tr>
);

const Section: React.FC<{ title: string; label: string; children: React.ReactNode }> = ({ title, label, children }) => (
  <div className="space-y-1">
    <h4 className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">{title}</h4>
    <table className="w-full text-left" aria-label={label}>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const gstLabel = (s: PaymentSettlement) => (s.gstRate == null ? 'GST' : `GST (${Number(s.gstRate)}%)`);

/** Quoted → taken off → worth after testing → paid so far → the final payment (or the refund the supplier owes). */
const FullBreakdown: React.FC<{ s: PaymentSettlement; summary: PaymentSummary }> = ({ s, summary }) => {
  const price = formatCurrency(s.unitPrice);
  const shortLabel = s.shortUnits > 0 ? 'Not delivered' : 'Delivered beyond the order';
  const paidParts = summary.milestones.filter((m) => m.paid !== 0);
  const netPaid = round2(summary.paid - summary.refunded);
  const overpaid = round2(Math.max(0, netPaid - s.payable));
  const claim = summary.claim;
  return (
    <div className="space-y-3 pt-2" data-testid="settlement-breakdown">
      <Section title="1. Quoted order" label="Quoted order">
        <Row label="Units ordered" how={`${units(s.orderedUnits, s.unitType)} × ${price}`} amount={formatCurrency(s.quotedGoods)} />
        {s.shipment > 0 && <Row label="Shipment" amount={formatCurrency(s.shipment)} />}
        {s.gstRate != null && <Row label="Taxable value" amount={formatCurrency(s.quotedTaxable)} />}
        {s.quotedGst !== 0 && <Row label={gstLabel(s)} amount={formatCurrency(s.quotedGst)} />}
        <Row label="Quoted order value" amount={formatCurrency(s.orderValue)} tone="total" />
      </Section>

      <Section title="2. Taken off after testing" label="Taken off after testing">
        {s.failedUnits > 0 && (
          <Row label="Failed testing" how={`${units(s.failedUnits, s.unitType)} × ${price}`} amount={minus(s.failedValue)} tone="less" testId="settlement-failed-value" />
        )}
        {s.shortUnits !== 0 && (
          <Row label={shortLabel} how={`${units(Math.abs(s.shortUnits), s.unitType)} × ${price}`} amount={s.shortValue >= 0 ? minus(s.shortValue) : `+ ${formatCurrency(-s.shortValue)}`} tone="less" />
        )}
        {s.shipmentDropped > 0 && <Row label="Shipment (no unit passed)" amount={minus(s.shipmentDropped)} tone="less" />}
        {s.gstReduction !== 0 && <Row label={`${gstLabel(s)} on the value taken off`} amount={minus(s.gstReduction)} tone="less" />}
        {s.reduction === 0 ? (
          <Row label="Nothing taken off: every unit passed" amount={formatCurrency(0)} tone="total" />
        ) : (
          <Row label="Total reduction" amount={minus(s.reduction)} tone="total" testId="settlement-reduction-total" />
        )}
      </Section>

      <Section title="3. Worth after testing" label="Worth after testing">
        <Row label="Units passed" how={`${units(s.passedUnits, s.unitType)} × ${price}`} amount={formatCurrency(s.passedGoods)} />
        {s.shipment - s.shipmentDropped > 0 && <Row label="Shipment" amount={formatCurrency(s.shipment - s.shipmentDropped)} />}
        {s.gstRate != null && <Row label="Taxable value" amount={formatCurrency(s.passedTaxable)} />}
        {s.passedGst !== 0 && <Row label={gstLabel(s)} amount={formatCurrency(s.passedGst)} />}
        <Row label="Worth after testing" how={`${formatCurrency(s.orderValue)} ${minus(s.reduction)}`} amount={formatCurrency(s.payable)} tone="total" />
      </Section>

      <Section title="4. Final payment" label="Final payment">
        <Row label="Worth after testing" amount={formatCurrency(s.payable)} />
        {paidParts.map((m) => (
          <Row key={m.milestone} label={`${MILESTONE_LABELS[m.milestone]} paid (confirmed)`} how={m.percent == null ? undefined : `${Number(m.percent)}% part`} amount={minus(m.paid)} tone="less" />
        ))}
        {summary.refunded > 0 && <Row label="Refunded by the supplier" amount={`+ ${formatCurrency(summary.refunded)}`} />}
        {overpaid > 0 ? (
          <Row label="Overpaid: the supplier owes this back" amount={formatCurrency(overpaid)} tone="final" testId="settlement-overpaid" />
        ) : (
          <Row label="Final payment to the supplier" amount={formatCurrency(summary.outstanding)} tone="final" testId="settlement-final-payment" />
        )}
      </Section>
      {summary.pendingPayments > 0 && overpaid === 0 && (
        <p className="text-amber-700 dark:text-amber-400">
          {formatCurrency(summary.pendingPayments)} of it is already requested or on its way to the supplier (not yet confirmed).
        </p>
      )}
      {overpaid > 0 && claim && (
        <p className="text-rose-700 dark:text-rose-400">
          The supplier was paid {formatCurrency(netPaid)} for an order now worth {formatCurrency(s.payable)}. Refund to be paid back:{' '}
          {formatCurrency(claim.agreedAmount)}{claim.agreedAmount !== claim.claimedAmount ? ' (changed by Level 2)' : ''}; see the refund box above.
        </p>
      )}
    </div>
  );
};

/**
 * The final settlement after testing: what was quoted, how many units failed (or never arrived) and what they were
 * worth, the worth after testing, what was paid already and so what the final payment is. A short summary; "Show full
 * breakdown" lays out every line of the calculation. All figures come from the server (PaymentSettlement).
 */
export const SettlementBreakdown: React.FC<{ summary: PaymentSummary }> = ({ summary }) => {
  const [open, setOpen] = useState(false);
  const s = summary.settlement;
  if (!s) return null;
  const reduced = s.reduction > 0;
  const facts = [
    `${units(s.orderedUnits, s.unitType)} ordered`,
    `${Number(s.passedUnits)} passed`,
    s.failedUnits > 0 && `${Number(s.failedUnits)} failed testing`,
    s.shortUnits > 0 && `${Number(s.shortUnits)} not delivered`,
  ].filter(Boolean).join(' · ');
  const netPaid = round2(summary.paid - summary.refunded);
  const overpaid = round2(Math.max(0, netPaid - s.payable));
  return (
    <section aria-label="Final settlement after testing" className={`p-3 rounded-xl border space-y-2 ${reduced ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-emerald-500/30 bg-emerald-500/[0.04]'}`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 font-semibold text-black dark:text-white">
          <Calculator className="w-3.5 h-3.5" /> Final settlement after testing
        </h4>
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-[11px] font-medium text-[#0071e3] cursor-pointer">
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {open ? 'Hide breakdown' : 'Show full breakdown'}
        </button>
      </div>
      <p className="text-gray-600 dark:text-gray-300" data-testid="settlement-facts">{facts}</p>
      <div className="grid grid-cols-4 gap-2 items-end">
        <div>
          <span className="block text-gray-400">Quoted order value</span>
          <span className="font-bold text-sm" data-testid="settlement-order-value">{formatCurrency(s.orderValue)}</span>
        </div>
        <div>
          <span className="block text-gray-400">{reduced ? 'Reduced after testing' : 'Reduction'}</span>
          <span className={`font-bold text-sm ${reduced ? 'text-rose-600 dark:text-rose-400' : ''}`} data-testid="settlement-reduction">
            {reduced ? minus(s.reduction) : formatCurrency(0)}
          </span>
        </div>
        <div>
          <span className="block text-gray-400">Worth after testing</span>
          <span className="font-bold text-sm" data-testid="settlement-payable">{formatCurrency(s.payable)}</span>
        </div>
        <div>
          <span className="block text-gray-400">{overpaid > 0 ? 'Supplier owes back' : 'Final payment'}</span>
          <span className={`font-bold text-sm ${overpaid > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} data-testid="settlement-final">
            {formatCurrency(overpaid > 0 ? overpaid : summary.outstanding)}
          </span>
        </div>
      </div>
      {reduced && !open && (
        <p className="text-gray-500">
          {s.failedUnits > 0 && `${units(s.failedUnits, s.unitType)} failed testing, worth ${formatCurrency(s.failedValue)} before GST`}
          {s.failedUnits > 0 && s.shortUnits > 0 && '; '}
          {s.shortUnits > 0 && `${units(s.shortUnits, s.unitType)} not delivered, worth ${formatCurrency(s.shortValue)} before GST`}
          {s.gstReduction !== 0 && `, plus ${formatCurrency(s.gstReduction)} GST on them`}. Show the full breakdown for every line.
        </p>
      )}
      {open && <FullBreakdown s={s} summary={summary} />}
    </section>
  );
};
