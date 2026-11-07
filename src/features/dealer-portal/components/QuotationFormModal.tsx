import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { TabbedModal, modalTabPanelProps, statusOfTab, useModalTab, type ModalTab } from '../../../components/ui/TabbedModal';
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
import { QuotedPriceFields } from '../../order-management/components/QuotedPriceFields';
import { isPriceChanged } from '../../order-management/utils/quotedPrice';
import { PaymentPlanFields } from '../../order-management/components/PaymentPlanFields';
import {
  planChanges,
  planFormFrom,
  planPayload,
  quotedTotal,
  shownPlanErrors,
  validatePlanForm,
  type PaymentPlanForm,
} from '../../order-management/utils/paymentPlan';

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

type QuotationTab = 'item' | 'gst' | 'payment' | 'delivery';

const QUOTATION_ID = 'quotation-form';

/** The parts of a quotation, one tab each, in the order a dealer fills it in. */
export const QUOTATION_TABS: readonly ModalTab<QuotationTab>[] = [
  { id: 'item', label: 'Item & price', hint: 'Item, quantity, your price and shipment' },
  { id: 'gst', label: 'GST', hint: 'Optional GST on the quotation' },
  { id: 'payment', label: 'Payment plan', hint: 'Advance and midterm shares, the rest after testing' },
  { id: 'delivery', label: 'Delivery & remarks', hint: 'Expected delivery and notes for the team' },
];

const QUOTATION_CHANGE_TABS: readonly ModalTab<QuotationTab>[] = QUOTATION_TABS.map((tab) =>
  tab.id === 'delivery' ? { ...tab, label: 'Delivery & reason', hint: 'Expected delivery, remarks and why you change it' } : tab
);

const sameNumber = (a: string, b: number) => a.trim() !== '' && Number(a) === Number(b);

/** Only what differs from the quotation as it stands, so the approver sees exactly what would change. */
const changedFields = (form: FormState, tax: TaxForm, plan: PaymentPlanForm, order: DealerOrder): QuotationChangeRequest => {
  const change: QuotationChangeRequest = {};
  if (form.itemId !== '' && form.itemId !== order.itemId) change.itemId = form.itemId;
  if (!sameNumber(form.orderQuantity, order.orderQuantity)) change.orderQuantity = Number(form.orderQuantity);
  if (form.unitType.trim() && form.unitType.trim() !== order.unitType) change.unitType = form.unitType.trim();
  if (!sameNumber(form.unitPrice, order.unitPrice)) change.unitPrice = Number(form.unitPrice);
  if (!sameNumber(form.shipmentPrice, order.shipmentPrice)) change.shipmentPrice = Number(form.shipmentPrice);
  if (form.expectedDelivery && form.expectedDelivery !== (order.expectedDelivery ?? '')) change.expectedDelivery = form.expectedDelivery;
  if (form.note.trim() !== (order.note ?? '')) change.note = form.note.trim();
  if (taxFormChanged(tax, order.taxBreakup)) change.taxBreakup = taxPayload(tax);
  if (Object.keys(validatePlanForm(plan)).length === 0) Object.assign(change, planChanges(plan, order));
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
  const [activeTab, setActiveTab] = useModalTab<QuotationTab>('item', order?.id);
  const [form, setForm] = useState<FormState>(() => fromOrder(order));
  const [reason, setReason] = useState('');
  const [priceReason, setPriceReason] = useState('');
  const [tax, setTax] = useState<TaxForm>(() => taxFormFrom(order?.taxBreakup));
  // How the dealer wants to be paid: advance and midterm percentages, the rest after testing
  const [plan, setPlan] = useState<PaymentPlanForm>(() => planFormFrom(order));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const selectedItem = items.find((item) => item.id === form.itemId);
  // A new quotation starts from the item's existing price: an empty price quotes it, any other price needs a reason.
  const existingPrice = isChange ? 0 : selectedItem?.mrp ?? 0;
  const priceChanged = isPriceChanged(existingPrice, form.unitPrice);
  const priceText = form.unitPrice.trim() === '' && existingPrice > 0 ? String(existingPrice) : form.unitPrice;
  const quantity = Number(form.orderQuantity);
  const unitPrice = Number(priceText);
  const shipmentPrice = Number(form.shipmentPrice);
  const isValid =
    form.itemId !== '' &&
    quantity > 0 &&
    quantity <= ORDER_LIMITS.MAX_QUANTITY &&
    priceText.trim() !== '' &&
    unitPrice >= 0 &&
    unitPrice <= ORDER_LIMITS.MAX_UNIT_PRICE &&
    form.shipmentPrice.trim() !== '' &&
    shipmentPrice >= 0 &&
    shipmentPrice <= ORDER_LIMITS.MAX_SHIPMENT_PRICE &&
    !!form.unitType.trim();
  const total = isValid ? quantity * unitPrice + shipmentPrice : null;
  const taxErrors = validateTaxForm(tax, total === null ? null : Math.round(total * 100));
  const taxValid = Object.keys(taxErrors).length === 0;
  const planErrors = validatePlanForm(plan);
  const planValid = Object.keys(planErrors).length === 0;

  const change = useMemo(() => (order ? changedFields(form, tax, plan, order) : null), [form, tax, plan, order]);
  const hasChange = !change || Object.keys(change).length > 0;
  const priceJustified = !priceChanged || !!priceReason.trim();

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
    setForm((current) => ({
      ...current,
      itemId,
      unitType: item?.unitOfMeasure || current.unitType,
      // A new quotation starts again from the new item's own existing price.
      ...(isChange ? {} : { unitPrice: '' }),
    }));
    if (!isChange) setPriceReason('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || !taxValid || !planValid || !hasChange || !priceJustified || form.itemId === '') return;
    const ok = order
      ? await onRequestChange(order.id, { ...change, reason: reason.trim() || undefined })
      : await onCreate({
          itemId: form.itemId,
          orderQuantity: quantity,
          unitType: form.unitType.trim(),
          unitPrice,
          shipmentPrice,
          ...(tax.enabled ? { taxBreakup: taxPayload(tax) } : {}),
          ...planPayload(plan),
          expectedDelivery: form.expectedDelivery || undefined,
          note: form.note.trim() || undefined,
          priceChangeReason: priceChanged ? priceReason.trim() : undefined,
        });
    if (ok) onClose();
  };

  const tabs = isChange ? QUOTATION_CHANGE_TABS : QUOTATION_TABS;
  const itemComplete = isValid && priceJustified;
  const errorTabs = new Set<QuotationTab>([
    ...(taxValid ? [] : (['gst'] as const)),
    ...(Object.keys(shownPlanErrors(planErrors)).length > 0 ? (['payment'] as const) : []),
  ]);
  const panel = (id: QuotationTab) => modalTabPanelProps(QUOTATION_ID, id, activeTab);

  return (
    <TabbedModal
      idPrefix={QUOTATION_ID}
      tabsLabel="Quotation sections"
      heading={isChange ? `Change quotation ${order.orderNumber}` : 'New quotation'}
      subheading={isChange ? 'Propose new terms for this quotation' : 'Quote your price for an item'}
      size="lg"
      onClose={onClose}
      onSubmit={handleSubmit}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      statusOf={(id) => statusOfTab(id, errorTabs, { item: itemComplete })}
      notes={
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-700 dark:text-amber-400">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {isChange
              ? 'A dealer manager has to approve this change. Until then your quotation stays exactly as it is, and you can withdraw the change.'
              : 'Your quotation is reviewed by the procurement team before it becomes an order. You can request changes until then.'}
          </span>
        </div>
      }
      footer={
        <>
          <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-3 text-sm">
            <span className="text-gray-500 dark:text-neutral-400">Total before GST (incl. shipment)</span>
            <span className="font-semibold font-mono" data-testid="quotation-total">
              {total === null ? '—' : formatCurrency(total)}
            </span>
          </div>
          {isChange && !hasChange && <p className="text-gray-500 dark:text-neutral-400">Change at least one value to send a change.</p>}
        </>
      }
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isValid || !taxValid || !planValid || !hasChange || !priceJustified}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE.primary}`}
          >
            {isSubmitting ? 'Sending…' : isChange ? 'Send for approval' : 'Create quotation'}
          </button>
        </>
      }
    >
      <section {...panel('item')}>
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

        {!isChange && (
          <QuotedPriceFields
            hasItem={!!selectedItem}
            existingPrice={existingPrice}
            newPrice={form.unitPrice}
            reason={priceReason}
            priceChanged={priceChanged}
            onNewPriceChange={(value) => set('unitPrice', value)}
            onReasonChange={setPriceReason}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          {isChange && (
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
          )}
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
      </section>

      <section {...panel('gst')}>
        <QuotationTaxFields value={tax} onChange={setTax} taxable={total} errors={taxErrors} disabled={isSubmitting} />
      </section>

      <section {...panel('payment')}>
        <PaymentPlanFields value={plan} onChange={setPlan} total={quotedTotal(total, tax)} errors={shownPlanErrors(planErrors)} disabled={isSubmitting} />
      </section>

      <section {...panel('delivery')}>
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
      </section>
    </TabbedModal>
  );
};
