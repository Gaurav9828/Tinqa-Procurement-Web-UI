import { useState } from 'react';
import { useNotify } from '../../../hooks/useNotify';
import { invalidateStockOptions } from '../../../hooks/useLookupOptions';
import { stockApi } from '../api/stockApi';
import type {
  CreateStockFromOrderRequest,
  UpdateStockRequest,
} from '../types/stock.types';
import type { ProcessApprovalPayload } from '../../approvals/types/approval.types';

export const useStockActions = (onSuccessCallback?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useNotify();

  const createStockFromOrder = async (payload: CreateStockFromOrderRequest): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await stockApi.createStockFromOrder(payload);
      if (res.success) {
        notify.success(res.message || 'Stock created from order successfully.');
        // The order is now used: drop it from the cached stock list so it isn't offered again.
        invalidateStockOptions();
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      notify.error(res.message || 'Failed to create stock from order.');
      return false;
    } catch (err: unknown) {
      notify.error(err, 'Error occurred while creating stock.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStock = async (id: number, payload: UpdateStockRequest): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await stockApi.updateStock(id, payload);
      if (res.success) {
        notify.success(res.message || 'Stock updated successfully.');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      notify.error(res.message || 'Failed to update stock.');
      return false;
    } catch (err: unknown) {
      notify.error(err, 'Error occurred while updating stock.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };


  const processApproval = async (id: number, payload: ProcessApprovalPayload): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await stockApi.processAdminL2Approval(id, payload);
      if (res.success) {
        notify.success(res.message || 'Stock L2 approval status updated.');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      notify.error(res.message || 'Failed to process approval.');
      return false;
    } catch (err: unknown) {
      notify.error(err, 'Error processing stock approval.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    createStockFromOrder,
    updateStock,
    processApproval,
  };
};