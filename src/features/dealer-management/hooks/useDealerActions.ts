import { useState } from 'react';
import { useNotify } from '../../../hooks/useNotify';
import { invalidateDealerOptions } from '../../../hooks/useLookupOptions';
import { dealerApi } from '../api/dealerApi';
import type {
  CreateCategoryRequest,
  CreateDealerRequest,
  UpdateDealerRequest,
  DealerResponse,
} from '../types/dealer.types';

export const useDealerActions = (onSuccess?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useNotify();

  const createCategory = async (payload: CreateCategoryRequest): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await dealerApi.createCategory(payload);
      notify.success(res.message || 'Category created successfully');
      if (onSuccess) onSuccess();
      return true;
    } catch (err: unknown) {
      notify.error(err, 'Failed to create category');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const createDealer = async (payload: CreateDealerRequest): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await dealerApi.createDealer(payload);
      notify.success(res.message || 'Dealer created successfully');
      invalidateDealerOptions();
      if (onSuccess) onSuccess();
      return true;
    } catch (err: unknown) {
      notify.error(err, 'Failed to create dealer');
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
    try {
      const res = await dealerApi.updateDealer(id, payload);
      notify.success(res.message || 'Dealer updated successfully');
      invalidateDealerOptions();
      if (onSuccess) onSuccess();
      return true;
    } catch (err: unknown) {
      notify.error(err, 'Failed to update dealer');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDealerStatus = async (dealer: DealerResponse): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await dealerApi.toggleDealerStatus(dealer.id);
      notify.success(res.message || `Dealer status updated successfully`);
      invalidateDealerOptions();
      if (onSuccess) onSuccess();
      return true;
    } catch (err: unknown) {
      notify.error(err, 'Failed to update dealer status');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    createCategory,
    createDealer,
    updateDealer,
    toggleDealerStatus,
  };
};