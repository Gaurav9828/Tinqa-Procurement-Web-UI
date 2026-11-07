import type { ModalTab } from '../../../components/ui/TabbedModal';
import type { OrderStatus } from '../../../types/common.types';
import { RETURN_STAGES } from '../types/supplierReturn.types';

/** The parts of the create and edit order form, one tab each, in the order an order is usually filled in. */
export type OrderFormTab = 'item' | 'gst' | 'payment' | 'delivery';

export const ORDER_FORM_ID = 'order-form';

const FORM_TABS: readonly ModalTab<OrderFormTab>[] = [
  { id: 'item', label: 'Item & supplier', hint: 'Item, supplier, quantity, price and shipment' },
  { id: 'gst', label: 'GST', hint: 'Optional GST on the quotation' },
  { id: 'payment', label: 'Payment plan', hint: 'Advance and midterm shares, the rest after testing' },
  { id: 'delivery', label: 'Delivery', hint: 'When the supplier is expected to deliver' },
];

/** A new order has no delivery date yet (it is agreed once the order is approved); an edit can set it. */
export const orderFormTabs = (mode: 'create' | 'edit'): readonly ModalTab<OrderFormTab>[] =>
  mode === 'create' ? FORM_TABS.filter((tab) => tab.id !== 'delivery') : FORM_TABS;

/** The parts of an order's preview, one tab per responsibility: each hint says who acts there. */
export type OrderViewTab = 'overview' | 'pricing' | 'payments' | 'invoice' | 'returns' | 'history';

export const ORDER_VIEW_ID = 'order-view';

// From shipping on, an order may have the supplier's invoice
export const INVOICE_STAGES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKED_UP',
  'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_FAILED', 'REFUND_COMPLETED',
]);

const VIEW_TABS: readonly ModalTab<OrderViewTab>[] = [
  { id: 'overview', label: 'Overview', hint: 'Status, supplier, item and delivery dates' },
  { id: 'pricing', label: 'Price & GST', hint: 'Quoted price, totals and GST: what approvers check' },
  { id: 'payments', label: 'Payments', hint: 'Payment plan and payments: the Finance Manager requests, the Super Admin approves' },
  { id: 'invoice', label: 'Supplier invoice', hint: "The supplier's invoice, checked against the quotation" },
  { id: 'returns', label: 'Returns', hint: 'Pieces that failed testing: the Supplier Manager raises and dispatches returns' },
  { id: 'history', label: 'Flow history', hint: 'Every step, payment, change request and return' },
];

// Tabs shown only from a stage on; the others are always there
const TAB_STAGES: Partial<Record<OrderViewTab, ReadonlySet<OrderStatus>>> = { invoice: INVOICE_STAGES, returns: RETURN_STAGES };

/** The preview's tabs for an order at this stage: the invoice from shipping on, returns only once there can be any. */
export const orderViewTabs = (status: OrderStatus): readonly ModalTab<OrderViewTab>[] =>
  VIEW_TABS.filter((tab) => TAB_STAGES[tab.id]?.has(status) ?? true);
