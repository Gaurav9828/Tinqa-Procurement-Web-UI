import { useState } from 'react';
import { useNotify } from '../../../hooks/useNotify';
import { invalidateSupplierOptions } from '../../../hooks/useLookupOptions';
import { supplierApi } from '../api/supplierApi';
import type {
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierResponse,
} from '../types/supplier.types';

export const useSupplierActions = (onSuccess?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useNotify();

  const createSupplier = async (payload: CreateSupplierRequest): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await supplierApi.createSupplier(payload);
      notify.success(res.message || 'Supplier created successfully');
      invalidateSupplierOptions();
      if (onSuccess) onSuccess();
      return true;
    } catch (err: unknown) {
      notify.error(err, 'Failed to create supplier');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSupplier = async (
    id: number,
    payload: UpdateSupplierRequest
  ): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await supplierApi.updateSupplier(id, payload);
      notify.success(res.message || 'Supplier updated successfully');
      invalidateSupplierOptions();
      if (onSuccess) onSuccess();
      return true;
    } catch (err: unknown) {
      notify.error(err, 'Failed to update supplier');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSupplierStatus = async (supplier: SupplierResponse): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await supplierApi.toggleSupplierStatus(supplier.id);
      notify.success(res.message || `Supplier status updated successfully`);
      invalidateSupplierOptions();
      if (onSuccess) onSuccess();
      return true;
    } catch (err: unknown) {
      notify.error(err, 'Failed to update supplier status');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus,
  };
};