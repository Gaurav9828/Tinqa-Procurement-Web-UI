export const ORDER_TRACKING_LIST_PATH = '/order-tracking';

export const orderDetailPath = (orderNumber: string) => `${ORDER_TRACKING_LIST_PATH}/${encodeURIComponent(orderNumber)}`;

/** Navigation state set by the list when it opens an order, so Back can return to it exactly. */
export interface OrderDetailLocationState {
  fromList?: boolean;
}
