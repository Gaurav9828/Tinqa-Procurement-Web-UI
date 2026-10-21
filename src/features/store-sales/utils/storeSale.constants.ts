/** Most units of one product per order line (Ecommerce BE OrderPricing.MAX_QUANTITY_PER_PRODUCT). */
export const MAX_QUANTITY_PER_PRODUCT = 10;

export const STORE_SALES_PAGE_SIZE = 20;

/** Payment statuses the sales lists can be filtered by (server: StoreSaleServiceImpl.SALE_PAYMENT_STATUSES). */
export const STORE_SALE_PAYMENT_FILTERS: readonly string[] = ['PAID', 'PENDING', 'FAILED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'];
