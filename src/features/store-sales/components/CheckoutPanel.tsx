import React, { useState } from 'react';
import { Banknote, Calculator, Loader2, ReceiptText, Smartphone } from 'lucide-react';
import { CommonInput, CommonTextArea } from '../../../components/ui/FormInputs';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import type { StorePaymentMethod, StoreQuote } from '../types/storeSale.types';
import { NOTES_MAX, RECEIPT_MAX } from '../utils/storeSale.utils';

interface Props {
  hasItems: boolean;
  quote: StoreQuote | null;
  isQuoting: boolean;
  isBooking: boolean;
  /** Customer and delivery address chosen. */
  ready: boolean;
  onQuote: () => void;
  onBook: (details: { paymentMethod: StorePaymentMethod; notes: string; receiptNumber: string }) => Promise<boolean>;
}

const METHODS: { id: StorePaymentMethod; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'CASH', label: 'Cash received', hint: 'You have the full total in hand. The order is paid and confirmed at once.', icon: <Banknote className="w-4 h-4" /> },
  { id: 'UPI', label: 'Online', hint: 'The customer pays from their account on the storefront (UPI, card or net banking).', icon: <Smartphone className="w-4 h-4" /> },
];

/** Step 3: the server's total, how the customer pays, and booking the sale. */
export const CheckoutPanel: React.FC<Props> = ({ hasItems, quote, isQuoting, isBooking, ready, onQuote, onBook }) => {
  const [method, setMethod] = useState<StorePaymentMethod>('CASH');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  const book = async () => {
    const ok = await onBook({ paymentMethod: method, notes, receiptNumber });
    setConfirming(false);
    if (ok) {
      setReceiptNumber('');
      setNotes('');
    }
  };

  return (
    <section aria-label="Payment" className="apple-card p-5 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <ReceiptText className="w-4 h-4 text-[#0071e3]" /> 3. Total and payment
      </h2>

      {!quote ? (
        <button type="button" disabled={!hasItems || isQuoting} onClick={onQuote}
          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.primary}`}>
          {isQuoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
          {hasItems ? 'Get the total' : 'Add products first'}
        </button>
      ) : (
        <table className="w-full text-xs" aria-label="Order total">
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {quote.lines.map((line) => (
              <tr key={line.productId}>
                <td className="py-1.5 pr-2">
                  {line.title} × {line.quantity}
                  {line.preOrder && <span className="ml-1 text-amber-600">(pre-order)</span>}
                  {Number(line.bundleDiscount) > 0 && (
                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                      Bundle discount with its product: −{formatCurrency(Number(line.bundleDiscount))}
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-right font-mono">{formatCurrency(line.lineTotal)}</td>
              </tr>
            ))}
            <tr><td className="py-1.5 text-gray-500">Shipping</td><td className="py-1.5 text-right font-mono">{formatCurrency(quote.shippingFee)}</td></tr>
            <tr className="font-semibold text-sm"><td className="py-2">Total (GST included)</td><td className="py-2 text-right font-mono">{formatCurrency(quote.totalAmount)}</td></tr>
          </tbody>
        </table>
      )}

      <div role="radiogroup" aria-label="How the customer pays" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {METHODS.map((option) => (
          <button key={option.id} type="button" role="radio" aria-checked={method === option.id} onClick={() => setMethod(option.id)}
            className={`text-left p-3 rounded-xl border text-xs cursor-pointer ${method === option.id ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
            <span className="flex items-center gap-1.5 font-semibold">{option.icon} {option.label}</span>
            <span className="block mt-1 opacity-90">{option.hint}</span>
          </button>
        ))}
      </div>

      {method === 'CASH' && (
        <CommonInput label="Receipt number (optional)" value={receiptNumber} onChange={(event) => setReceiptNumber(event.target.value)} maxLength={RECEIPT_MAX} />
      )}
      <CommonTextArea label="Notes (optional)" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={NOTES_MAX} />

      <button type="button" disabled={!ready || !quote || isBooking} onClick={() => setConfirming(true)}
        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.approve}`}>
        {isBooking && <Loader2 className="w-4 h-4 animate-spin" />} Book the sale
      </button>
      {!ready && <p className="text-[11px] text-gray-500">Choose the customer and a delivery address first.</p>}

      <ConfirmationModal
        isOpen={confirming}
        actionType="CONFIRM"
        tone="approve"
        title={method === 'CASH' ? 'Received the cash?' : 'Book this online sale?'}
        description={
          method === 'CASH'
            ? `Book only once you hold ${quote ? formatCurrency(quote.totalAmount) : 'the full total'} in cash. The order is marked paid and confirmed, credited to you, and the customer is emailed the receipt.`
            : 'The order is credited to you. The customer is emailed how to sign in and completes the payment from their account.'
        }
        confirmLabel="Book the sale"
        isSubmitting={isBooking}
        onClose={() => setConfirming(false)}
        onConfirm={book}
      />
    </section>
  );
};
