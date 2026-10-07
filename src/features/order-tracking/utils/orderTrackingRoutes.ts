export const ORDER_TRACKING_LIST_PATH = '/order-tracking';

export const orderDetailPath = (orderNumber: string) => `${ORDER_TRACKING_LIST_PATH}/${encodeURIComponent(orderNumber)}`;

/**
 * Navigation state for the order detail page, so Back can return to wherever it was opened from:
 *  - `fromList`: opened from the order list (Back restores the exact list view)
 *  - `backLabel`: opened from another screen, e.g. a support ticket ("Back to ticket")
 */
export interface OrderDetailLocationState {
  fromList?: boolean;
  backLabel?: string;
}
