import { useCallback } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import type { EnableReturnRequest, RejectReturnRequest, ReturnChargeRequest, ReturnInspectionRequest } from '../types/orderTracking.types';
import { useOrderMutation, type OrderMutationResult } from './useOrderMutation';

interface Options {
  /** Reload what a return step changed on the order (enable, request, approve, reject, change charge, withdraw). */
  onOrderChanged: () => void;
  /** The inspection also requests the refund, so it may reload more (the refunds too). Defaults to `onOrderChanged`. */
  onRefundChanged?: () => void;
}

/** Every return action the panel can offer; each one reports through the global alert and reloads on its own. */
export interface ReturnActions {
  enableReturn: (payload: EnableReturnRequest) => Promise<OrderMutationResult>;
  withdrawReturn: () => Promise<OrderMutationResult>;
  recordInspection: (payload: ReturnInspectionRequest) => Promise<OrderMutationResult>;
  approveReturn: (payload: ReturnChargeRequest) => Promise<OrderMutationResult>;
  rejectReturn: (payload: RejectReturnRequest) => Promise<OrderMutationResult>;
  changeReturnCharge: (payload: ReturnChargeRequest) => Promise<OrderMutationResult>;
  isSubmitting: boolean;
}

/**
 * Staff side of a return. REFUND_REQUEST: request a return on a delivered order (from the customer's support ticket),
 * withdraw it while requested or enabled, and record the inspection. RETURN_ENABLE: approve or reject someone else's
 * request, and change the charge of an enabled return. The server's message wins over the fallback wording below.
 */
export const useOrderReturn = (orderNumber: string, { onOrderChanged, onRefundChanged = onOrderChanged }: Options): ReturnActions => {
  const enableCall = useCallback((payload: EnableReturnRequest) => orderTrackingApi.enableReturn(orderNumber, payload), [orderNumber]);
  const withdrawCall = useCallback(() => orderTrackingApi.withdrawReturn(orderNumber), [orderNumber]);
  const inspectCall = useCallback((payload: ReturnInspectionRequest) => orderTrackingApi.recordInspection(orderNumber, payload), [orderNumber]);
  const approveCall = useCallback((payload: ReturnChargeRequest) => orderTrackingApi.approveReturn(orderNumber, payload), [orderNumber]);
  const rejectCall = useCallback((payload: RejectReturnRequest) => orderTrackingApi.rejectReturn(orderNumber, payload), [orderNumber]);
  const chargeCall = useCallback((payload: ReturnChargeRequest) => orderTrackingApi.changeReturnCharge(orderNumber, payload), [orderNumber]);

  const enable = useOrderMutation({
    call: enableCall,
    success: 'Return requested. A Store Manager will review it.',
    failure: 'The return could not be requested.',
    onChanged: onOrderChanged,
  });
  const withdraw = useOrderMutation({
    call: withdrawCall,
    success: 'Return option withdrawn.',
    failure: 'The return could not be withdrawn.',
    onChanged: onOrderChanged,
  });
  const inspect = useOrderMutation({
    call: inspectCall,
    success: 'Inspection recorded.',
    failure: 'The inspection could not be recorded.',
    onChanged: onRefundChanged,
  });
  const approve = useOrderMutation({
    call: approveCall,
    success: 'Return approved. The customer has 7 days to start it.',
    failure: 'The return could not be approved.',
    onChanged: onOrderChanged,
  });
  const reject = useOrderMutation({
    call: rejectCall,
    success: 'Return request rejected. The customer has been told why.',
    failure: 'The return request could not be rejected.',
    onChanged: onOrderChanged,
  });
  const changeCharge = useOrderMutation({
    call: chargeCall,
    success: 'Return charge changed. The customer has been emailed and must agree to it again.',
    failure: 'The return charge could not be changed.',
    onChanged: onOrderChanged,
  });

  return {
    enableReturn: enable.run,
    withdrawReturn: withdraw.run,
    recordInspection: inspect.run,
    approveReturn: approve.run,
    rejectReturn: reject.run,
    changeReturnCharge: changeCharge.run,
    isSubmitting:
      enable.isSubmitting || withdraw.isSubmitting || inspect.isSubmitting || approve.isSubmitting || reject.isSubmitting || changeCharge.isSubmitting,
  };
};
