import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { OrderResponse, OrderStatus, UpdateOrderStatusRequest } from '../types/order.types';
import { CommonInput, CommonSelect } from '../../../components/ui/FormInputs';

interface Props {
  isOpen: boolean;
  order: OrderResponse | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (id: number, data: UpdateOrderStatusRequest) => Promise<boolean>;
}

const STATUS_OPTIONS = [
  { label: 'CONFIRMED', value: 'CONFIRMED' },
  { label: 'SHIPPED', value: 'SHIPPED' },
  { label: 'DELIVERED', value: 'DELIVERED' },
  { label: 'CANCELLED', value: 'CANCELLED' },
];

export const OrderStatusModal: React.FC<Props> = ({
  isOpen,
  order,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [status, setStatus] = useState<OrderStatus>('CONFIRMED');
  const [actualDelivery, setActualDelivery] = useState('');

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(order.id, {
      status,
      actualDelivery: status === 'DELIVERED' ? actualDelivery : undefined,
    });
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-3">
          <h2 className="text-base font-bold text-black dark:text-white">
            Update Status: {order.orderNumber}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <CommonSelect
            label="Target Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
          />

          {status === 'DELIVERED' && (
            <CommonInput
              label="Actual Delivery Date"
              type="date"
              required
              value={actualDelivery}
              onChange={(e) => setActualDelivery(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0071e3] text-white rounded-xl font-semibold hover:bg-[#0071e3]/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};