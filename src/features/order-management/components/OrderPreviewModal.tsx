import React from 'react';
import { X, Calendar, Truck, User, Package, IndianRupee } from 'lucide-react';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderProgress } from './OrderProgress';
import type { OrderResponse } from '../types/order.types';
import { PrintMenu } from '../../printing/components/PrintMenu';
import { SUPPLIER_CHANGE_BLOCK_REASON, isFrozenBySupplierChange } from '../utils/orderWorkflow';
import { TaxBreakupSummary } from './TaxBreakupSummary';
import { InvoiceVerificationPanel } from './InvoiceVerificationPanel';
import { useOrderInvoice } from '../hooks/useOrderInvoice';
import type { OrderStatus } from '../../../types/common.types';
import { OrderPaymentsPanel } from './OrderPaymentsPanel';
import { PAYMENT_STAGES, describePlan } from '../utils/paymentPlan';

interface OrderPreviewModalProps {
  order: OrderResponse | null;
  onClose: () => void;
}

// From shipping on, an order may have the supplier's invoice
const INVOICE_STAGES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKED_UP',
  'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_FAILED', 'REFUND_COMPLETED',
]);

export const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({ order, onClose }) => {
  const invoiceState = useOrderInvoice(order?.id ?? null, !!order && INVOICE_STAGES.has(order.orderStatus));
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
          <div>
            <h2 className="text-sm font-bold text-black dark:text-white">{order.orderNumber}</h2>
            <p className="text-[10px] text-gray-400">Created on {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-black dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div className="flex justify-between items-center p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl">
            <span className="text-gray-500 font-medium">Status</span>
            <OrderStatusBadge status={order.orderStatus} />
          </div>
          <OrderProgress status={order.orderStatus} />
          {isFrozenBySupplierChange(order) && (
            <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              {SUPPLIER_CHANGE_BLOCK_REASON}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border border-black/10 dark:border-white/10 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                <User className="w-3.5 h-3.5" /> Supplier Details
              </div>
              <p className="font-semibold text-black dark:text-white">{order.supplierName}</p>
              {order.raisedBySupplier && <p className="text-[10px] font-semibold text-[#0071e3] dark:text-blue-400">Raised by the supplier</p>}
            </div>

            <div className="p-3 border border-black/10 dark:border-white/10 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                <Package className="w-3.5 h-3.5" /> Item Details
              </div>
              <p className="font-semibold text-black dark:text-white">{order.itemName}</p>
              <p className="text-gray-500">
                {order.orderQuantity} {order.unitType} @ ₹{order.unitPrice}
              </p>
              {typeof order.additionalInfo?.priceChangeReason === 'string' && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  Existing price ₹{Number(order.additionalInfo.mrp ?? 0).toFixed(2)}. Reason: {order.additionalInfo.priceChangeReason}
                </p>
              )}
            </div>
          </div>

          <div className="p-3 border border-black/10 dark:border-white/10 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-gray-400 font-medium">
              <IndianRupee className="w-3.5 h-3.5" /> Financial Breakdown
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Subtotal:</span>
              <span>₹{(order.orderQuantity * order.unitPrice).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Shipment Price:</span>
              <span>₹{order.shipmentPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-black dark:text-white border-t border-black/10 dark:border-white/10 pt-1">
              <span>Total before GST:</span>
              <span className="text-emerald-600 dark:text-emerald-400">₹{order.totalPrice.toFixed(2)}</span>
            </div>
            <div className="pt-1 border-t border-black/10 dark:border-white/10">
              <TaxBreakupSummary taxBreakup={order.taxBreakup} totalPrice={order.totalPrice} />
            </div>
            <p className="pt-1 border-t border-black/10 dark:border-white/10 text-gray-500" data-testid="order-payment-plan">
              Payment plan: {describePlan(order) ?? 'none (paid after testing)'}
            </p>
          </div>

          <OrderPaymentsPanel orderId={order.id} enabled={PAYMENT_STAGES.has(order.orderStatus)} />

          {INVOICE_STAGES.has(order.orderStatus) && (
            <InvoiceVerificationPanel
              invoice={invoiceState.invoice}
              loading={invoiceState.loading}
              onDownload={() => void invoiceState.download()}
            />
          )}

          <div className="grid grid-cols-2 gap-3 text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>Expected: {order.expectedDelivery || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-gray-400" />
              <span>Delivered: {order.actualDelivery || 'N/A'}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-black/10 dark:border-white/10">
            <PrintMenu orderId={order.id} status={order.orderStatus} />
          </div>
        </div>
      </div>
    </div>
  );
};