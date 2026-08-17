import { useState } from 'react';
import { dealerApi } from '../api/dealerApi';
import type {
  CreateCategoryRequest,
  CreateDealerRequest,
  UpdateDealerRequest,
  DealerResponse,
} from '../types/dealer.types';

export const useDealerActions = (onSuccess?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const createCategory = async (payload: CreateCategoryRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await dealerApi.createCategory(payload);
      setActionSuccess(res.message || 'Category created successfully');
      if (onSuccess) onSuccess();
      return true;
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to create category');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const createDealer = async (payload: CreateDealerRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await dealerApi.createDealer(payload);
      setActionSuccess(res.message || 'Dealer created successfully');
      if (onSuccess) onSuccess();
      return true;
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to create dealer');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDealer = async (
    id: number,
    payload: UpdateDealerRequest
  ): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await dealerApi.updateDealer(id, payload);
      setActionSuccess(res.message || 'Dealer updated successfully');
      if (onSuccess) onSuccess();
      return true;
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update dealer');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDealerStatus = async (dealer: DealerResponse): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await dealerApi.toggleDealerStatus(dealer.id);
      setActionSuccess(res.message || `Dealer status updated successfully`);
      if (onSuccess) onSuccess();
      return true;
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update dealer status');
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
    createCategory,
    createDealer,
    updateDealer,
    toggleDealerStatus,
  };
};