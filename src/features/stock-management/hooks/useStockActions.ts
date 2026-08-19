import { useState } from 'react';
import { stockApi } from '../api/stockApi';
import type {
  CreateStockFromOrderRequest,
  UpdateStockRequest,
  QuantityAdjustmentRequest,
} from '../types/stock.types';
import type { ProcessApprovalPayload } from '../../approvals/types/approval.types';

export const useStockActions = (onSuccessCallback?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const createStockFromOrder = async (payload: CreateStockFromOrderRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await stockApi.createStockFromOrder(payload);
      if (res.success) {
        setActionSuccess(res.message || 'Stock created from order successfully.');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to create stock from order.');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error occurred while creating stock.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStock = async (id: number, payload: UpdateStockRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await stockApi.updateStock(id, payload);
      if (res.success) {
        setActionSuccess(res.message || 'Stock updated successfully.');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to update stock.');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error occurred while updating stock.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustQuantity = async (
    id: number,
    type: 'ADD' | 'REDUCE',
    payload: QuantityAdjustmentRequest
  ): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res =
        type === 'ADD'
          ? await stockApi.addStockQuantity(id, payload)
          : await stockApi.reduceStockQuantity(id, payload);
      if (res.success) {
        setActionSuccess(res.message || `Stock quantity ${type.toLowerCase()}ed successfully.`);
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to adjust stock quantity.');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error adjusting stock quantity.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const processApproval = async (id: number, payload: ProcessApprovalPayload): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await stockApi.processAdminL2Approval(id, payload);
      if (res.success) {
        setActionSuccess(res.message || 'Stock L2 approval status updated.');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to process approval.');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error processing stock approval.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    actionError,
    actionSuccess,
    clearMessages,
    createStockFromOrder,
    updateStock,
    adjustQuantity,
    processApproval,
  };
};