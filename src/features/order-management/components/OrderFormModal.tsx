import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useItemList } from '../../item-management/hooks/useItemList';
import { useDealerList } from '../../dealer-management/hooks/useDealerList';
import { Validator } from '../../../utils/validator'; // Update path based on your folder setup
import type { CreateOrderRequest } from '../types/order.types';

interface OrderFormModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  apiError: string | null;
  onClose: () => void;
  onSubmit: (data: CreateOrderRequest) => Promise<boolean>;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  isSubmitting,
  apiError,
  onClose,
  onSubmit,
}) => {
  const { items, isLoading: itemsLoading } = useItemList();
  const { dealers, isLoading: dealersLoading } = useDealerList();

  const [formData, setFormData] = useState({
    dealerId: '',
    itemId: '',
    orderQuantity: '',
    unitType: 'PCS',
    unitPrice: '',
    shipmentPrice: '0',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    cgst: '0',
    sgst: '0',
    igst: '0',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto populate unit type & unit price when an item is selected
  const handleItemSelect = (itemIdStr: string) => {
    const selectedItem = items.find((i) => i.id === Number(itemIdStr));
    setFormData((prev) => ({
      ...prev,
      itemId: itemIdStr,
      unitType: selectedItem?.unitOfMeasure || prev.unitType,
      unitPrice: selectedItem?.mrp ? String(selectedItem.mrp) : prev.unitPrice,
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    const dealerErr = Validator.validateField(formData.dealerId, { required: true, customMessage: 'Please select a dealer.' });
    if (dealerErr) errs.dealerId = dealerErr;

    const itemErr = Validator.validateField(formData.itemId, { required: true, customMessage: 'Please select an item.' });
    if (itemErr) errs.itemId = itemErr;

    const qtyErr = Validator.validateField(formData.orderQuantity, { required: true, type: 'number', min: 0.001, customMessage: 'Quantity must be greater than 0.' });
    if (qtyErr) errs.orderQuantity = qtyErr;

    const unitPriceErr = Validator.validateField(formData.unitPrice, { required: true, type: 'number', min: 0, customMessage: 'Unit price must be positive.' });
    if (unitPriceErr) errs.unitPrice = unitPriceErr;

    const shipErr = Validator.validateField(formData.shipmentPrice, { required: true, type: 'number', min: 0, customMessage: 'Shipment price must be valid.' });
    if (shipErr) errs.shipmentPrice = shipErr;

    const dateErr = Validator.validateField(formData.orderDate, { required: true, customMessage: 'Order date is required.' });
    if (dateErr) errs.orderDate = dateErr;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: CreateOrderRequest = {
      dealerId: Number(formData.dealerId),
      itemId: Number(formData.itemId),
      orderQuantity: Number(formData.orderQuantity),
      unitType: formData.unitType,
      unitPrice: Number(formData.unitPrice),
      shipmentPrice: Number(formData.shipmentPrice),
      orderDate: formData.orderDate,
      expectedDelivery: formData.expectedDelivery || undefined,
      taxBreakup: {
        cgst: Number(formData.cgst) || 0,
        sgst: Number(formData.sgst) || 0,
        igst: Number(formData.igst) || 0,
      },
    };

    const success = await onSubmit(payload);
    if (success) onClose();
  };

  if (!isOpen) return null;

  const calculatedTotal =
    (Number(formData.orderQuantity) || 0) * (Number(formData.unitPrice) || 0) +
    (Number(formData.shipmentPrice) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-sm font-semibold text-black dark:white">Create New Order</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {apiError && (
          <div className="m-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {apiError}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dealer Selection */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Select Dealer *</label>
              <select
                value={formData.dealerId}
                onChange={(e) => setFormData({ ...formData, dealerId: e.target.value })}
                disabled={dealersLoading}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="">{dealersLoading ? 'Loading dealers...' : 'Select Dealer'}</option>
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.city || 'N/A'})
                  </option>
                ))}
              </select>
              {errors.dealerId && <p className="text-rose-500 text-[10px] mt-0.5">{errors.dealerId}</p>}
            </div>

            {/* Item Selection */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Select Item *</label>
              <select
                value={formData.itemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                disabled={itemsLoading}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="">{itemsLoading ? 'Loading items...' : 'Select Item'}</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.sku})
                  </option>
                ))}
              </select>
              {errors.itemId && <p className="text-rose-500 text-[10px] mt-0.5">{errors.itemId}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Order Quantity *</label>
              <input
                type="number"
                step="any"
                value={formData.orderQuantity}
                onChange={(e) => setFormData({ ...formData, orderQuantity: e.target.value })}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
              {errors.orderQuantity && <p className="text-rose-500 text-[10px] mt-0.5">{errors.orderQuantity}</p>}
            </div>

            {/* Unit Type */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Unit Type *</label>
              <input
                type="text"
                value={formData.unitType}
                onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                placeholder="PCS, KG, LTR..."
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Unit Price (₹) *</label>
              <input
                type="number"
                step="any"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
              {errors.unitPrice && <p className="text-rose-500 text-[10px] mt-0.5">{errors.unitPrice}</p>}
            </div>

            {/* Shipment Price */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Shipment Price (₹) *</label>
              <input
                type="number"
                step="any"
                value={formData.shipmentPrice}
                onChange={(e) => setFormData({ ...formData, shipmentPrice: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
              {errors.shipmentPrice && <p className="text-rose-500 text-[10px] mt-0.5">{errors.shipmentPrice}</p>}
            </div>

            {/* Order Date */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Order Date *</label>
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
              {errors.orderDate && <p className="text-rose-500 text-[10px] mt-0.5">{errors.orderDate}</p>}
            </div>

            {/* Expected Delivery */}
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Expected Delivery Date</label>
              <input
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

          {/* Computed Summary */}
          <div className="p-3 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl flex justify-between items-center text-xs font-semibold">
            <span className="text-gray-500">Estimated Total Price:</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-sm">
              ₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Submit Controls */}
          <div className="flex justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Submitting...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};