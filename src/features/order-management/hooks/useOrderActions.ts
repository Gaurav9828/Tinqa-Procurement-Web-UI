import { orderApi } from '../api/orderApi';
import type {
  CreateOrderRequest,
  UpdateOrderRequest,
  UpdateOrderStatusRequest
} from '../types/order.types';
import type { ProcessApprovalPayload } from '../../approvals/types/approval.types';
import { useApiAction } from '../../../hooks/useApiAction';
import { validateOrderPayload } from '../validator/orderValidator';

export const useOrderActions = (onSuccessCallback?: () => void) => {
  const { isSubmitting, run, reject } = useApiAction(onSuccessCallback);

  const createOrder = async (payload: CreateOrderRequest): Promise<boolean> => {
    const validationError = validateOrderPayload(payload);
    if (validationError) return reject(validationError);
    return run(() => orderApi.createOrder(payload), {
      success: 'Order created successfully!',
      failure: 'Failed to create order.',
    });
  };

  const updateOrder = async (id: number, payload: UpdateOrderRequest): Promise<boolean> => {
    const validationError = validateOrderPayload(payload);
    if (validationError) return reject(validationError);
    return run(() => orderApi.updateOrder(id, payload), {
      success: 'Order updated successfully!',
      failure: 'Failed to update order.',
    });
  };

  const updateOrderStatus = async (id: number, payload: UpdateOrderStatusRequest): Promise<boolean> =>
    run(() => orderApi.updateOrderStatus(id, payload), {
      success: `Order status updated to ${payload.status}`,
      failure: 'Failed to update order status.',
    });

  const processAdminL2Approval = async (id: number, payload: ProcessApprovalPayload): Promise<boolean> => {
    if ((payload.decision === 'REJECTED' || payload.decision === 'CANCELLED') && !payload.rejectionReason?.trim()) {
      return reject('A rejection reason is required.');
    }
    return run(() => orderApi.processAdminL2Approval(id, payload), {
      success: `Order ${String(payload.decision).toLowerCase()} successfully.`,
      failure: 'Failed to process order approval.',
    });
  };

  return {
    isSubmitting,
    createOrder,
    updateOrder,
    updateOrderStatus,
    processAdminL2Approval
  };
};
