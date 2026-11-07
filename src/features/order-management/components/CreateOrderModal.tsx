import React, { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import type { ItemResponse } from '../../item-management/types/item.types';
import type { SupplierResponse } from '../../supplier-management/types/supplier.types';
import type { CreateOrderRequest } from '../types/order.types';
import { ORDER_LIMITS, todayLocalIsoDate } from '../validator/orderValidator';
import { useAccess } from '../../../hooks/useAccess';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs'; // Adjust import path as needed
import { unitSelectOptions } from '../../../constants/unitsOfMeasure';
import { QuotationTaxFields } from './QuotationTaxFields';
import { QuotedPriceFields } from './QuotedPriceFields';
import { isPriceChanged } from '../utils/quotedPrice';
import { emptyTaxForm, taxPayload, validateTaxForm, type TaxForm } from '../utils/quotationTax';
import { PaymentPlanFields } from './PaymentPlanFields';
import { DEFAULT_PAYMENT_PLAN, planPayload, quotedTotal, shownPlanErrors, validatePlanForm, type PaymentPlanForm } from '../utils/paymentPlan';

interface CreateOrderModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  items: ItemResponse[];
  suppliers: SupplierResponse[];
  onClose: () => void;
  onSubmit: (formData: CreateOrderRequest) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  isSubmitting,
  items,
  suppliers,
  onClose,
  onSubmit,
}) => {
  const { can } = useAccess();
  // How the supplier wants to be paid: advance and midterm percentages, the rest after testing
  const [plan, setPlan] = useState<PaymentPlanForm>(DEFAULT_PAYMENT_PLAN);
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  // Optional: left empty, the quotation uses the item's existing price (MRP).
  const [newPrice, setNewPrice] = useState('');
  const [priceReason, setPriceReason] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>('PCS');
  const [shipmentPrice, setShipmentPrice] = useState<number | ''>(0);
  const [isUnitDisabled, setIsUnitDisabled] = useState<boolean>(false);
  const [tax, setTax] = useState<TaxForm>(emptyTaxForm);

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

  if (!isOpen) return null;

  const itemMrp = selectedItem?.mrp || 0;
  const hasNewPrice = newPrice.trim() !== '';
  const currentPrice = hasNewPrice ? Number(newPrice) : itemMrp;
  const priceChanged = isPriceChanged(itemMrp, newPrice);
  const isFormComplete =
    selectedItemId !== '' &&
    selectedSupplierId !== '' &&
    Number(quantity) >= 1 &&
    currentPrice > 0 &&
    currentPrice <= ORDER_LIMITS.MAX_UNIT_PRICE &&
    (!priceChanged || !!priceReason.trim()) &&
    !!unitOfMeasure.trim() &&
    shipmentPrice !== '' &&
    Number(shipmentPrice) >= 0;
  const taxable = isFormComplete ? Number(quantity) * currentPrice + Number(shipmentPrice) : null;
  const taxErrors = validateTaxForm(tax, taxable === null ? null : Math.round(taxable * 100));
  const taxValid = Object.keys(taxErrors).length === 0;
  const planErrors = validatePlanForm(plan);
  const planValid = Object.keys(planErrors).length === 0;
  const selectedSupplier = suppliers.find((supplier) => supplier.id === Number(selectedSupplierId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete || !taxValid || !planValid) return;
    onSubmit({
      itemId: Number(selectedItemId),
      supplierId: Number(selectedSupplierId),
      orderQuantity: Number(quantity),
      unitPrice: currentPrice,
      unitType: unitOfMeasure.trim(),
      shipmentPrice: Number(shipmentPrice),
      orderDate: todayLocalIsoDate(),
      taxBreakup: taxPayload(tax),
      ...planPayload(plan),
      // Approvers see the existing price and why it was changed.
      additionalInfo: priceChanged ? { mrp: itemMrp, priceChangeReason: priceReason.trim() } : {},
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/10 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white">Create Procurement Order</h2>
            <p className="text-xs text-gray-500 dark:text-neutral-400">Initiate a new stock procurement request</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!can('PROCUREMENT_ORDER_APPROVE') && (
          <div className="mx-5 mt-5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-700 dark:text-amber-400">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Notice:</strong> Orders you create need final review and approval by an order approver.
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <CommonSelect
            label="Select Item"
            required
            placeholder="-- Choose Item --"
            value={selectedItemId}
            options={itemOptions}
            onChange={(e) => {
              setSelectedItemId(Number(e.target.value));
              // A new item starts again from its own existing price.
              setNewPrice('');
              setPriceReason('');
            }}
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
              placeholder="e.g. 50"
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

          <QuotedPriceFields
            hasItem={!!selectedItem}
            existingPrice={itemMrp}
            newPrice={newPrice}
            reason={priceReason}
            priceChanged={priceChanged}
            onNewPriceChange={setNewPrice}
            onReasonChange={setPriceReason}
          />

          <div className="grid grid-cols-2 gap-3">
            <CommonInput
              label="Shipment Price (₹)"
              type="number"
              step="0.01"
              max={ORDER_LIMITS.MAX_SHIPMENT_PRICE}
              min="0"
              required
              placeholder="0.00"
              value={shipmentPrice}
              onChange={(e) => setShipmentPrice(Number(e.target.value))}
            />
          </div>

          <QuotationTaxFields value={tax} onChange={setTax} taxable={taxable} errors={taxErrors} disabled={isSubmitting}
            supplierState={selectedSupplier?.state} />

          <PaymentPlanFields value={plan} onChange={setPlan} total={quotedTotal(taxable, tax)} errors={shownPlanErrors(planErrors)} disabled={isSubmitting} />

          {/* Actions */}
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
              disabled={isSubmitting || !isFormComplete || !taxValid || !planValid}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0071e3]/90 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};