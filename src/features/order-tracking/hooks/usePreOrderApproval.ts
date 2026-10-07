import { useCallback, useRef, useState } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode, getApiErrorMessage } from '../../../utils/apiError';
import { getApiErrorKind } from '../../../utils/apiErrorKind';

export const STOCK_NOT_READY_MESSAGE =
  'Not enough stock is available yet to approve this pre-order. It stays waiting — try again once stock has been added.';

/**
 * Approves a waiting pre-order through the dedicated endpoint (never the generic status form).
 * The UI never marks the order approved itself: after any outcome that may have changed the
 * order, it reloads the detail from the server (`refresh`).
 */
export const usePreOrderApproval = (orderNumber: string, refresh: () => void) => {
  const [isApproving, setIsApproving] = useState(false);
  const inFlight = useRef(false);
  const notify = useNotify();

  const approve = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setIsApproving(true);
    try {
      const res = await orderTrackingApi.approvePreOrder(orderNumber);
      if (!res.success) {
        notify.error(res.message || 'The pre-order could not be approved.');
        refresh();
        return false;
      }
      notify.success(res.message || 'Pre-order approved.');
      refresh();
      return true;
    } catch (err: unknown) {
      const code = getApiErrorCode(err);
      const kind = getApiErrorKind(err);
      if (code === 'PRE_ORDER_STOCK_NOT_READY') {
        // Stock changed since the page loaded: the order is still PRE_ORDER_PENDING.
        notify.warning(STOCK_NOT_READY_MESSAGE);
        refresh();
      } else if (kind === 'conflict' || kind === 'notFound') {
        // e.g. already approved/cancelled elsewhere, or the order is gone — show the real state.
        notify.warning(getApiErrorMessage(err, 'This order changed. Showing its latest state.'));
        refresh();
      } else {
        // 403, 405, 5xx, network: nothing changed on the server; keep the page as it is.
        // (401 is handled globally by the API client.)
        notify.error(err, 'The pre-order could not be approved. Please try again.');
      }
      return false;
    } finally {
      inFlight.current = false;
      setIsApproving(false);
    }
  }, [orderNumber, refresh, notify]);

  return { approve, isApproving };
};
