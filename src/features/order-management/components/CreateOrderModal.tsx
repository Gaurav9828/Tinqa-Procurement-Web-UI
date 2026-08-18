import React, { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import type { ItemResponse } from '../../item-management/types/item.types';
import type { DealerResponse } from '../../dealer-management/types/dealer.types';
import { HasAccess } from '../../../auth/HasAccess';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs'; // Adjust import path as needed

interface CreateOrderModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  items: ItemResponse[];
  dealers: DealerResponse[];
  onClose: () => void;
  onSubmit: (formData: any) => void;
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

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  isSubmitting,
  items,
  dealers,
  onClose,
  onSubmit,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [selectedDealerId, setSelectedDealerId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>('PCS');
  const [shipmentPrice, setShipmentPrice] = useState<number | ''>(0);
  const [isUnitDisabled, setIsUnitDisabled] = useState<boolean>(false);

  const selectedItem = items.find((item) => item.id === Number(selectedItemId));

  useEffect(() => {
    if (selectedItem) {
      if (selectedItem.mrp) {
        setUnitPrice(selectedItem.mrp);
      }
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
  const currentPrice = Number(unitPrice) || 0;
  const priceVariance = calculatePriceVariance(itemMrp, currentPrice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      itemId: selectedItemId,
      dealerId: selectedDealerId,
      orderQuantity: Number(quantity),
      unitPrice: Number(unitPrice),
      unitType: unitOfMeasure,
      shipmentPrice: Number(shipmentPrice),
      orderDate: new Date().toISOString().split('T')[0],
      taxBreakup: {},
      additionalInfo: {},
    });
  };

  const itemOptions = items.map((item) => ({
    label: `${item.name} ${item.brand ? `(${item.brand})` : ''} - MRP: ₹${item.mrp}`,
    value: item.id,
  }));

  const dealerOptions = dealers.map((dealer) => ({
    label: `${dealer.name} ${dealer.tradeName ? `(${dealer.tradeName})` : ''}`,
    value: dealer.id,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
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

        <HasAccess roles="ADMIN_L1">
          <div className="mx-5 mt-5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-700 dark:text-amber-400">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Notice:</strong> Orders created by Admin Level 1 require final review and approval from an Admin Level 2 authorization officer.
            </span>
          </div>
        </HasAccess>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <CommonSelect
            label="Select Item"
            required
            placeholder="-- Choose Item --"
            value={selectedItemId}
            options={itemOptions}
            onChange={(e) => setSelectedItemId(Number(e.target.value))}
          />

          <CommonSelect
            label="Select Dealer"
            required
            placeholder="-- Choose Dealer --"
            value={selectedDealerId}
            options={dealerOptions}
            onChange={(e) => setSelectedDealerId(Number(e.target.value))}
          />

          <div className="grid grid-cols-2 gap-3">
            <CommonInput
              label="Quantity"
              type="number"
              min="1"
              required
              placeholder="e.g. 50"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />

            <CommonInput
              label="Unit Type"
              type="text"
              required
              disabled={isUnitDisabled}
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value.toUpperCase())}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <CommonInput
                label="Unit Price (₹)"
                type="number"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
              />

              {/* Price Variance Badge */}
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
              min="0"
              required
              placeholder="0.00"
              value={shipmentPrice}
              onChange={(e) => setShipmentPrice(Number(e.target.value))}
            />
          </div>

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
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0071e3]/90 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};