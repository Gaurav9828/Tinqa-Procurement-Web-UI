import React, { useCallback, useState } from 'react';
import { Calendar, Truck, User, Package, IndianRupee } from 'lucide-react';
import { TabbedModal, modalTabPanelProps, useModalTab } from '../../../components/ui/TabbedModal';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderProgress } from './OrderProgress';
import type { OrderResponse } from '../types/order.types';
import { PrintMenu } from '../../printing/components/PrintMenu';
import { SUPPLIER_CHANGE_BLOCK_REASON, isFrozenBySupplierChange } from '../utils/orderWorkflow';
import { TaxBreakupSummary } from './TaxBreakupSummary';
import { InvoiceVerificationPanel } from './InvoiceVerificationPanel';
import { useOrderInvoice } from '../hooks/useOrderInvoice';
import { OrderPaymentsPanel } from './OrderPaymentsPanel';
import { PAYMENT_STAGES, describePlan } from '../utils/paymentPlan';
import { PaymentPlanBreakup } from './PaymentPlanBreakup';
import { QuotedPriceCheck } from './QuotedPriceCheck';
import { readPriceNote } from '../utils/quotedPrice';
import { OrderTimeline } from './OrderTimeline';
import { SupplierReturnsPanel } from './SupplierReturnsPanel';
import { INVOICE_STAGES, ORDER_VIEW_ID, orderViewTabs, type OrderViewTab } from '../utils/orderTabs';

interface OrderPreviewModalProps {
  order: OrderResponse | null;
  onClose: () => void;
}

const card = 'p-3 border border-black/10 dark:border-white/10 rounded-xl space-y-1';
const cardTitle = 'flex items-center gap-1.5 text-gray-400 font-medium';

/**
 * An order, one tab per responsibility (overview, price, payments, invoice, returns, history). A tab's data (payments,
 * invoice, returns, flow history) loads only while that tab is open, and again each time it is opened.
 */
export const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({ order, onClose }) => {
  const [activeTab, setActiveTab] = useModalTab<OrderViewTab>('overview', order?.id);
  const invoiceState = useOrderInvoice(order?.id ?? null, !!order && INVOICE_STAGES.has(order.orderStatus) && activeTab === 'invoice');
  // A payment or return step taken here shows in the flow history once it is opened
  const [historyRound, setHistoryRound] = useState(0);
  const bumpHistory = useCallback(() => setHistoryRound((n) => n + 1), []);
  if (!order) return null;
  const priceNote = readPriceNote(order.additionalInfo, order.unitPrice);
  const panel = (id: OrderViewTab) => modalTabPanelProps(ORDER_VIEW_ID, id, activeTab);
  const tabs = orderViewTabs(order.orderStatus);
  const shows = (id: OrderViewTab) => activeTab === id && tabs.some((tab) => tab.id === id);

  return (
    <TabbedModal
      idPrefix={ORDER_VIEW_ID}
      tabsLabel="Order sections"
      ariaLabel={`Order ${order.orderNumber}`}
      heading={
        <span className="flex flex-wrap items-center gap-2">
          {order.orderNumber} <OrderStatusBadge status={order.orderStatus} />
        </span>
      }
      subheading={`${order.itemName} from ${order.supplierName} · created on ${new Date(order.createdAt).toLocaleDateString()}`}
      size="lg"
      onClose={onClose}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      notes={
        isFrozenBySupplierChange(order) && (
          <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
            {SUPPLIER_CHANGE_BLOCK_REASON}
          </p>
        )
      }
      actions={
        <>
          <PrintMenu orderId={order.id} status={order.orderStatus} compact />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </>
      }
    >
      <section {...panel('overview')}>
        <OrderProgress status={order.orderStatus} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={card}>
            <div className={cardTitle}>
              <User className="w-3.5 h-3.5" /> Supplier
            </div>
            <p className="font-semibold text-black dark:text-white">{order.supplierName}</p>
            {order.raisedBySupplier && <p className="text-[10px] font-semibold text-[#0071e3] dark:text-blue-400">Raised by the supplier</p>}
          </div>

          <div className={card}>
            <div className={cardTitle}>
              <Package className="w-3.5 h-3.5" /> Item
            </div>
            <p className="font-semibold text-black dark:text-white">{order.itemName}</p>
            <p className="text-gray-500">
              {order.orderQuantity} {order.unitType} @ ₹{order.unitPrice}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Expected: {order.expectedDelivery || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-gray-400" />
            <span>Delivered: {order.actualDelivery || 'N/A'}</span>
          </div>
        </div>

        {typeof order.additionalInfo?.supplierNote === 'string' && (
          <p className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] text-gray-600 dark:text-gray-300">
            <span className="block text-[10px] text-gray-400">Supplier's note</span>
            {order.additionalInfo.supplierNote}
          </p>
        )}
      </section>

      <section {...panel('pricing')}>
        {priceNote && (
          <QuotedPriceCheck
            quotedPrice={order.unitPrice}
            itemPrice={priceNote.itemPrice}
            previousPrice={priceNote.previousPrice}
            reason={priceNote.reason}
            unitType={order.unitType}
          />
        )}

        <div className={`${card} space-y-2`}>
          <div className={cardTitle}>
            <IndianRupee className="w-3.5 h-3.5" /> Financial breakdown
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
        </div>
      </section>

      <section {...panel('payments')}>
        <div className={`${card} space-y-2`}>
          <p className="text-gray-500" data-testid="order-payment-plan">
            Payment plan: {describePlan(order) ?? 'none (paid after testing)'}
          </p>
          <PaymentPlanBreakup plan={order} totalPrice={order.totalPrice} taxBreakup={order.taxBreakup} />
        </div>
        {PAYMENT_STAGES.has(order.orderStatus) ? (
          <OrderPaymentsPanel orderId={order.id} enabled={activeTab === 'payments'} onChanged={bumpHistory} />
        ) : (
          <p className="text-gray-400 italic">Payments start once the order is approved.</p>
        )}
      </section>

      <section {...panel('invoice')}>
        {shows('invoice') && (
          <InvoiceVerificationPanel
            invoice={invoiceState.invoice}
            loading={invoiceState.loading}
            onDownload={() => void invoiceState.download()}
          />
        )}
      </section>

      <section {...panel('returns')}>
        {shows('returns') && <SupplierReturnsPanel key={`returns-${order.id}`} orderId={order.id} defaultOpen onChanged={bumpHistory} />}
      </section>

      <section {...panel('history')}>
        {shows('history') && <OrderTimeline key={order.id} orderId={order.id} defaultOpen round={historyRound} />}
      </section>
    </TabbedModal>
  );
};
