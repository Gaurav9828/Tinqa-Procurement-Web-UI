import React, { useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';
import { CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { unitSelectOptions } from '../../../constants/unitsOfMeasure';
import { ORDER_LIMITS, todayLocalIsoDate } from '../../order-management/validator/orderValidator';
import type {
  CreateQuotationRequest,
  DealerItem,
  DealerOrder,
  QuotationChangeRequest,
} from '../types/dealerPortal.types';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { QuotationTaxFields } from '../../order-management/components/QuotationTaxFields';
import {
  taxFormChanged,
  taxFormFrom,
  taxPayload,
  validateTaxForm,
  type TaxForm,
} from '../../order-management/utils/quotationTax';

interface QuotationFormModalProps {
  /** Without an order the form creates a quotation; with one it proposes a change to it. */
  order?: DealerOrder | null;
  items: DealerItem[];
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (payload: CreateQuotationRequest) => Promise<boolean>;
  onRequestChange: (orderId: number, payload: QuotationChangeRequest) => Promise<boolean>;
}

interface FormState {
  itemId: number | '';
  orderQuantity: string;
  unitType: string;
  unitPrice: string;
  shipmentPrice: string;
  expectedDelivery: string;
  note: string;
}

const fromOrder = (order?: DealerOrder | null): FormState => ({
  itemId: order?.itemId ?? '',
  orderQuantity: order ? String(order.orderQuantity) : '',
  unitType: order?.unitType ?? 'PCS',
  unitPrice: order ? String(order.unitPrice) : '',
  shipmentPrice: order ? String(order.shipmentPrice) : '0',
  expectedDelivery: order?.expectedDelivery ?? '',
  note: order?.note ?? '',
});

const sameNumber = (a: string, b: number) => a.trim() !== '' && Number(a) === Number(b);

/** Only what differs from the quotation as it stands, so the approver sees exactly what would change. */
const changedFields = (form: FormState, tax: TaxForm, order: DealerOrder): QuotationChangeRequest => {
  const change: QuotationChangeRequest = {};
  if (form.itemId !== '' && form.itemId !== order.itemId) change.itemId = form.itemId;
  if (!sameNumber(form.orderQuantity, order.orderQuantity)) change.orderQuantity = Number(form.orderQuantity);
  if (form.unitType.trim() && form.unitType.trim() !== order.unitType) change.unitType = form.unitType.trim();
  if (!sameNumber(form.unitPrice, order.unitPrice)) change.unitPrice = Number(form.unitPrice);
  if (!sameNumber(form.shipmentPrice, order.shipmentPrice)) change.shipmentPrice = Number(form.shipmentPrice);
  if (form.expectedDelivery && form.expectedDelivery !== (order.expectedDelivery ?? '')) change.expectedDelivery = form.expectedDelivery;
  if (form.note.trim() !== (order.note ?? '')) change.note = form.note.trim();
  if (taxFormChanged(tax, order.taxBreakup)) change.taxBreakup = taxPayload(tax);
  return change;
};

export const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  order,
  items,
  isSubmitting,
  onClose,
  onCreate,
  onRequestChange,
}) => {
  const isChange = !!order;
  const [form, setForm] = useState<FormState>(() => fromOrder(order));
  const [reason, setReason] = useState('');
  const [tax, setTax] = useState<TaxForm>(() => taxFormFrom(order?.taxBreakup));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const quantity = Number(form.orderQuantity);
  const unitPrice = Number(form.unitPrice);
  const shipmentPrice = Number(form.shipmentPrice);
  const isValid =
    form.itemId !== '' &&
    quantity > 0 &&
    quantity <= ORDER_LIMITS.MAX_QUANTITY &&
    form.unitPrice.trim() !== '' &&
    unitPrice >= 0 &&
    unitPrice <= ORDER_LIMITS.MAX_UNIT_PRICE &&
    form.shipmentPrice.trim() !== '' &&
    shipmentPrice >= 0 &&
    shipmentPrice <= ORDER_LIMITS.MAX_SHIPMENT_PRICE &&
    !!form.unitType.trim();
  const total = isValid ? quantity * unitPrice + shipmentPrice : null;
  const taxErrors = validateTaxForm(tax, total === null ? null : Math.round(total * 100));
  const taxValid = Object.keys(taxErrors).length === 0;

  const change = useMemo(() => (order ? changedFields(form, tax, order) : null), [form, tax, order]);
  const hasChange = !change || Object.keys(change).length > 0;

  // The current item stays listed even if it is no longer offered, so a change form never loses it.
  const itemOptions = useMemo(() => {
    const options = items.map((item) => ({
      label: `${item.name}${item.brand ? ` (${item.brand})` : ''} · ${item.sku}`,
      value: item.id,
    }));
    if (order && !items.some((item) => item.id === order.itemId)) {
      options.unshift({ label: order.itemName, value: order.itemId });
    }
    return options;
  }, [items, order]);

  const chooseItem = (itemId: number) => {
    const item = items.find((candidate) => candidate.id === itemId);
    setForm((current) => ({ ...current, itemId, unitType: item?.unitOfMeasure || current.unitType }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || !taxValid || !hasChange || form.itemId === '') return;
    const ok = order
      ? await onRequestChange(order.id, { ...change, reason: reason.trim() || undefined })
      : await onCreate({
          itemId: form.itemId,
          orderQuantity: quantity,
          unitType: form.unitType.trim(),
          unitPrice,
          shipmentPrice,
          ...(tax.enabled ? { taxBreakup: taxPayload(tax) } : {}),
          expectedDelivery: form.expectedDelivery || undefined,
          note: form.note.trim() || undefined,
        });
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quotation-form-title"
        className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-black/10 dark:border-white/10">
          <div>
            <h2 id="quotation-form-title" className="text-lg font-bold text-black dark:text-white">
              {isChange ? `Change quotation ${order.orderNumber}` : 'New quotation'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {isChange ? 'Propose new terms for this quotation' : 'Quote your price for an item'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mx-5 mt-5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-700 dark:text-amber-400">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {isChange
              ? 'A dealer manager has to approve this change. Until then your quotation stays exactly as it is, and you can withdraw the change.'
              : 'Your quotation is reviewed by the procurement team before it becomes an order. You can request changes until then.'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <CommonSelect
            label="Item"
            required
            placeholder="-- Choose item --"
            value={form.itemId}
            options={itemOptions}
            onChange={(event) => chooseItem(Number(event.target.value))}
          />

          <div className="grid grid-cols-2 gap-3">
            <CommonInput
            label="Quantity"
            aria-label="Quantity"
              type="number"
              min="0.001"
              step="any"
              max={ORDER_LIMITS.MAX_QUANTITY}
              required
              placeholder="e.g. 50"
              value={form.orderQuantity}
              onChange={(event) => set('orderQuantity', event.target.value)}
            />
            <CommonSelect
              label="Unit"
              required
              placeholder="Select unit"
              options={unitSelectOptions(form.unitType)}
              value={form.unitType}
              onChange={(event) => set('unitType', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CommonInput
            label="Unit price (₹)"
            aria-label="Unit price (₹)"
              type="number"
              min="0"
              step="0.01"
              max={ORDER_LIMITS.MAX_UNIT_PRICE}
              required
              placeholder="0.00"
              value={form.unitPrice}
              onChange={(event) => set('unitPrice', event.target.value)}
            />
            <CommonInput
            label="Shipment price (₹)"
            aria-label="Shipment price (₹)"
              type="number"
              min="0"
              step="0.01"
              max={ORDER_LIMITS.MAX_SHIPMENT_PRICE}
              required
              placeholder="0.00"
              value={form.shipmentPrice}
              onChange={(event) => set('shipmentPrice', event.target.value)}
            />
          </div>

          <QuotationTaxFields value={tax} onChange={setTax} taxable={total} errors={taxErrors} disabled={isSubmitting} />

          <CommonInput
            label="Expected delivery"
            aria-label="Expected delivery"
            type="date"
            min={todayLocalIsoDate()}
            value={form.expectedDelivery}
            onChange={(event) => set('expectedDelivery', event.target.value)}
          />

          <CommonTextArea
            label="Remarks"
            aria-label="Remarks"
            rows={2}
            maxLength={500}
            placeholder="Delivery terms, packaging, validity of the offer…"
            value={form.note}
            onChange={(event) => set('note', event.target.value)}
          />

          {isChange && (
            <CommonTextArea
            label="Reason for the change"
            aria-label="Reason for the change"
              rows={2}
              maxLength={500}
              placeholder="Shown to the dealer manager who approves it"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          )}

          <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-3 text-sm">
            <span className="text-gray-500 dark:text-neutral-400">Total before GST (incl. shipment)</span>
            <span className="font-semibold font-mono" data-testid="quotation-total">
              {total === null ? '—' : formatCurrency(total)}
            </span>
          </div>
          {isChange && !hasChange && (
            <p className="text-xs text-gray-500 dark:text-neutral-400">Change at least one value to send a change.</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid || !taxValid || !hasChange}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE.primary}`}
            >
              {isSubmitting ? 'Sending…' : isChange ? 'Send for approval' : 'Create quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
