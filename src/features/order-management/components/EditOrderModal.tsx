import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { TabbedModal, modalTabPanelProps, statusOfTab, useModalTab } from '../../../components/ui/TabbedModal';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import type { OrderResponse, UpdateOrderRequest } from '../types/order.types';
import { ORDER_LIMITS } from '../validator/orderValidator';
import type { ItemResponse } from '../../item-management/types/item.types';
import type { SupplierResponse } from '../../supplier-management/types/supplier.types';
import { useAccess } from '../../../hooks/useAccess';
import { CommonInput, CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { unitSelectOptions } from '../../../constants/unitsOfMeasure';
import { QuotationTaxFields } from './QuotationTaxFields';
import { emptyTaxForm, taxFormChanged, taxFormFrom, taxPayload, validateTaxForm, type TaxForm } from '../utils/quotationTax';
import { PaymentPlanFields } from './PaymentPlanFields';
import { OrderTotal } from './OrderTotal';
import { ORDER_FORM_ID, orderFormTabs, type OrderFormTab } from '../utils/orderTabs';
import { DEFAULT_PAYMENT_PLAN, planChanged, planChanges, planFormFrom, quotedTotal, shownPlanErrors, validatePlanForm, type PaymentPlanForm } from '../utils/paymentPlan';

interface EditOrderModalProps {
  order: OrderResponse | null;
  isOpen: boolean;
  isSubmitting: boolean;
  items: ItemResponse[];
  suppliers: SupplierResponse[];
  onClose: () => void;
  onSubmit: (orderId: number, formData: UpdateOrderRequest) => void;
}

const calculatePriceVariance = (
  mrp: number,
  currentUnitPrice: number
): { percent: string; isIncrease: boolean } | null => {
  if (!mrp || !currentUnitPrice || mrp === 0) return null;
  const diff = currentUnitPrice - mrp;
  const percent = ((diff / mrp) * 100).toFixed(2);
  return {
    percent: Math.abs(Number(percent)).toFixed(2),
    isIncrease: diff >= 0,
  };
};

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  isSubmitting,
  items,
  suppliers,
  onClose,
  onSubmit,
}) => {
  const { can } = useAccess();
  // Back on the first tab whenever another order is opened
  const [activeTab, setActiveTab] = useModalTab<OrderFormTab>('item', order?.id);
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>('PCS');
  const [shipmentPrice, setShipmentPrice] = useState<number | ''>(0);
  const [expectedDelivery, setExpectedDelivery] = useState<string>('');
  const [isUnitDisabled, setIsUnitDisabled] = useState<boolean>(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [tax, setTax] = useState<TaxForm>(emptyTaxForm);
  const [plan, setPlan] = useState<PaymentPlanForm>(DEFAULT_PAYMENT_PLAN);
  const [priceReason, setPriceReason] = useState('');

  useEffect(() => {
    if (order) {
      setSelectedItemId(order.itemId || '');
      setSelectedSupplierId(order.supplierId || '');
      setQuantity(order.orderQuantity || '');
      setUnitPrice(order.unitPrice || '');
      setUnitOfMeasure(order.unitType || 'PCS');
      setShipmentPrice(order.shipmentPrice || 0);
      setExpectedDelivery(order.expectedDelivery || '');
      setTax(taxFormFrom(order.taxBreakup));
      setPlan(planFormFrom(order));
      setPriceReason('');
    }
  }, [order]);

  const selectedItem = items.find((item) => item.id === Number(selectedItemId));

  useEffect(() => {
    if (selectedItem) {
      if (selectedItem.unitOfMeasure) {
        setUnitOfMeasure(selectedItem.unitOfMeasure);
        setIsUnitDisabled(true);
      } else {
        setIsUnitDisabled(false);
      }
    } else {
      setIsUnitDisabled(false);
    }
  }, [selectedItemId, items]);

  if (!isOpen || !order) return null;

  // Check if any field differs from the original order values
  const hasChanges =
    selectedItemId !== (order.itemId || '') ||
    selectedSupplierId !== (order.supplierId || '') ||
    quantity !== (order.orderQuantity || '') ||
    unitPrice !== (order.unitPrice || '') ||
    unitOfMeasure !== (order.unitType || 'PCS') ||
    shipmentPrice !== (order.shipmentPrice || 0) ||
    expectedDelivery !== (order.expectedDelivery || '') ||
    taxFormChanged(tax, order.taxBreakup) ||
    planChanged(plan, order);

  const itemMrp = selectedItem?.mrp || 0;
  const currentPrice = Number(unitPrice) || 0;
  const priceVariance = calculatePriceVariance(itemMrp, currentPrice);
  // A new price (or another item) away from the item's MRP needs a fresh reason; the server enforces the same rule
  const priceTermsChanged = currentPrice !== Number(order.unitPrice) || Number(selectedItemId) !== order.itemId;
  const needsPriceReason = priceTermsChanged && itemMrp > 0 && currentPrice > 0 && currentPrice !== itemMrp;
  const priceJustified = !needsPriceReason || !!priceReason.trim();
  const isFormComplete =
    selectedItemId !== '' &&
    selectedSupplierId !== '' &&
    Number(quantity) >= 1 &&
    currentPrice > 0 &&
    !!unitOfMeasure.trim() &&
    shipmentPrice !== '' &&
    Number(shipmentPrice) >= 0;
  const taxable = isFormComplete ? Number(quantity) * currentPrice + Number(shipmentPrice) : null;
  const taxErrors = validateTaxForm(tax, taxable === null ? null : Math.round(taxable * 100));
  const taxValid = Object.keys(taxErrors).length === 0;
  const planErrors = validatePlanForm(plan, order);
  const planValid = Object.keys(planErrors).length === 0;
  // Only the parts of the plan that changed are sent (an order made before plans existed gets its first one)
  const changedPlan = planValid ? planChanges(plan, order) : {};
  const minDeliveryDate = order.orderDate
    ? (() => {
        const d = new Date(order.orderDate);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })()
    : undefined;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete || !taxValid || !planValid || !priceJustified) return;
    setIsConfirmOpen(true);
  };

  const executeSubmit = () => {
    setIsConfirmOpen(false);
    onSubmit(order.id, {
      itemId: Number(selectedItemId),
      supplierId: Number(selectedSupplierId),
      orderQuantity: Number(quantity),
      unitPrice: Number(unitPrice),
      unitType: unitOfMeasure.trim(),
      shipmentPrice: Number(shipmentPrice),
      orderDate: order.orderDate,
      expectedDelivery: expectedDelivery || null,
      // Sent only when changed; otherwise the server keeps the GST and follows a new total at the same rate
      ...(taxFormChanged(tax, order.taxBreakup) ? { taxBreakup: taxPayload(tax) } : {}),
      ...changedPlan,
      additionalInfo: needsPriceReason
        ? { ...(order.additionalInfo || {}), priceChangeReason: priceReason.trim() }
        : order.additionalInfo || {},
    });
  };

  const itemOptions = items.map((item) => ({
    label: `${item.name} ${item.brand ? `(${item.brand})` : ''} - MRP: ₹${item.mrp}`,
    value: item.id,
  }));

  const supplierOptions = suppliers.map((supplier) => ({
    label: `${supplier.name} ${supplier.tradeName ? `(${supplier.tradeName})` : ''}`,
    value: supplier.id,
  }));

  const tabs = orderFormTabs('edit');
  const errorTabs = new Set<OrderFormTab>([
    ...(taxValid ? [] : (['gst'] as const)),
    ...(Object.keys(shownPlanErrors(planErrors)).length > 0 ? (['payment'] as const) : []),
  ]);
  const panel = (id: OrderFormTab) => modalTabPanelProps(ORDER_FORM_ID, id, activeTab);

  return (
    <>
      <TabbedModal
        idPrefix={ORDER_FORM_ID}
        tabsLabel="Order sections"
        heading={`Edit Order (${order.orderNumber})`}
        subheading="Update details for existing procurement request"
        size="lg"
        onClose={onClose}
        onSubmit={handleFormSubmit}
        closeDisabled={isSubmitting}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        statusOf={(id) => statusOfTab(id, errorTabs, { item: isFormComplete && priceJustified, payment: planValid })}
        notes={
          !can('PROCUREMENT_ORDER_APPROVE') && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-700 dark:text-amber-400">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Notice:</strong> Order modifications will require re-validation by an order approver if pending review.
              </span>
            </div>
          )
        }
        footer={
          <>
            <OrderTotal total={taxable} />
            {!hasChanges && <p className="text-gray-500 dark:text-neutral-400">Change at least one value to save.</p>}
            {!priceJustified && (
              <p className="text-amber-700 dark:text-amber-400" data-testid="order-price-reason-needed">
                Give the reason for the new price in the Item &amp; supplier tab.
              </p>
            )}
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
              disabled={isSubmitting || !hasChanges || !isFormComplete || !taxValid || !planValid || !priceJustified}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE.primary}`}
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <section {...panel('item')}>
          <CommonSelect
            label="Select Item"
            required
            placeholder="-- Choose Item --"
            value={selectedItemId}
            options={itemOptions}
            onChange={(e) => setSelectedItemId(Number(e.target.value))}
          />

          <CommonSelect
            label="Select Supplier"
            required
            placeholder="-- Choose Supplier --"
            value={selectedSupplierId}
            options={supplierOptions}
            onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
          />

          <div className="grid grid-cols-2 gap-3">
            <CommonInput
              label="Quantity"
              type="number"
              min="1"
              max={ORDER_LIMITS.MAX_QUANTITY}
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />

            <CommonSelect
              label="Unit Type"
              required
              // Follows the selected item's unit; chosen from the fixed list only when the item has none.
              disabled={isUnitDisabled}
              placeholder="Select unit"
              options={unitSelectOptions(unitOfMeasure)}
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
              data-testid="order-unit-type"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <CommonInput
                label="Unit Price (₹)"
                type="number"
                step="0.01"
                min="0.01"
                max={ORDER_LIMITS.MAX_UNIT_PRICE}
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
              />

              {selectedItem && priceVariance && Number(priceVariance.percent) !== 0 && (
                <div className="mt-1.5 text-[11px] flex items-center gap-1.5 font-mono">
                  <span className="text-gray-500 dark:text-neutral-400">MRP: ₹{itemMrp.toFixed(2)}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md font-semibold ${
                      priceVariance.isIncrease
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {priceVariance.isIncrease ? `+${priceVariance.percent}%` : `-${priceVariance.percent}%`} vs MRP
                  </span>
                </div>
              )}
            </div>

            <CommonInput
              label="Shipment Price (₹)"
              type="number"
              step="0.01"
              max={ORDER_LIMITS.MAX_SHIPMENT_PRICE}
              min="0"
              required
              value={shipmentPrice}
              onChange={(e) => setShipmentPrice(Number(e.target.value))}
            />
          </div>

          {needsPriceReason && (
            <CommonTextArea
              label={`Reason for the new price (was ₹${Number(order.unitPrice).toFixed(2)}, MRP ₹${itemMrp.toFixed(2)})`}
              aria-label="Reason for the new price"
              required
              rows={2}
              maxLength={500}
              placeholder="Shown to everyone who approves this order"
              value={priceReason}
              onChange={(e) => setPriceReason(e.target.value)}
            />
          )}
        </section>

        <section {...panel('gst')}>
          <QuotationTaxFields value={tax} onChange={setTax} taxable={taxable} errors={taxErrors} disabled={isSubmitting}
            supplierState={suppliers.find((supplier) => supplier.id === Number(selectedSupplierId))?.state} />
        </section>

        <section {...panel('payment')}>
          <PaymentPlanFields value={plan} onChange={setPlan} total={quotedTotal(taxable, tax)} errors={shownPlanErrors(planErrors)} disabled={isSubmitting} />
        </section>

        <section {...panel('delivery')}>
          <CommonInput
            label="Expected Delivery Date"
            type="date"
            value={expectedDelivery}
            min={minDeliveryDate}
            disabled={!order.orderDate}
            onChange={(e) => setExpectedDelivery(e.target.value)}
          />
        </section>
      </TabbedModal>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-65 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">Confirm Changes</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Are you sure you want to update this order?</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-neutral-300">
              Saving these modifications will overwrite the existing order records and may trigger re-verification flows.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0071e3]/90 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};