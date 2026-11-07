import type { OrderStatus } from '../../types/common.types';

/** Printable documents. A quotation always; the order once it is approved; the bill once the goods were delivered. */
export type PrintDocument = 'quotation' | 'order' | 'bill';

const ORDER_STATUSES = new Set<OrderStatus>([
  'SUPPLIER_LEVEL_PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED',
  'RETURN_PICKED_UP', 'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_FAILED', 'RETURN_REJECTED', 'REFUND_COMPLETED',
]);

const BILLED_STATUSES = new Set<OrderStatus>([
  'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_PICKED_UP', 'RETURN_RECEIVED', 'REFUND_INITIATED',
  'REFUND_FAILED', 'RETURN_REJECTED', 'REFUND_COMPLETED',
]);

export const printableDocuments = (status: OrderStatus): PrintDocument[] => {
  const documents: PrintDocument[] = ['quotation'];
  if (ORDER_STATUSES.has(status)) documents.push('order');
  if (BILLED_STATUSES.has(status)) documents.push('bill');
  return documents;
};

export const PRINT_DOCUMENT_LABEL: Record<PrintDocument, string> = {
  quotation: 'Quotation',
  order: 'Purchase order',
  bill: 'Bill',
};

/** Opens the print view in a new tab; it prints itself once loaded. */
export const openPrintView = (orderId: number, document: PrintDocument) => {
  window.open(`/print/orders/${orderId}/${document}`, '_blank', 'noopener');
};
