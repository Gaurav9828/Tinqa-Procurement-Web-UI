import { useState } from 'react';
import { orderApi } from '../api/orderApi';
import type { 
  CreateOrderRequest, 
  UpdateOrderRequest, 
  UpdateOrderStatusRequest 
} from '../types/order.types';

export const useOrderActions = (onSuccessCallback?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const createOrder = async (payload: CreateOrderRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await orderApi.createOrder(payload);
      if (res.success) {
        setActionSuccess('Order created successfully!');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to create order');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error occurred while creating order.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOrder = async (id: number, payload: UpdateOrderRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await orderApi.updateOrder(id, payload);
      if (res.success) {
        setActionSuccess('Order updated successfully!');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to update order');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error occurred while updating order.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOrderStatus = async (id: number, payload: UpdateOrderStatusRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await orderApi.updateOrderStatus(id, payload);
      if (res.success) {
        setActionSuccess(`Order status updated to ${payload.status}`);
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to update order status');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error occurred while updating status.');
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
    createOrder,
    updateOrder,
    updateOrderStatus,
  };
};