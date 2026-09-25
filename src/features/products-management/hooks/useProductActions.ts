import { useState } from 'react';
import { productApi } from '../api/productsApi';
import type { CreateProductRequest, UpdateProductRequest, UpdateProductStatusRequest } from '../types/product.types';

export const useProductActions = (onSuccessCallback?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const createProduct = async (payload: CreateProductRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await productApi.createProduct(payload);
      if (res.success) {
        setActionSuccess('Product created successfully!');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to create product');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error occurred while creating product.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProduct = async (id: number, payload: UpdateProductRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await productApi.updateProduct(id, payload);
      if (res.success) {
        setActionSuccess('Product updated successfully!');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to update product');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error occurred while updating product.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProductStatus = async (id: number, payload: UpdateProductStatusRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await productApi.updateProductStatus(id, payload);
      if (res.success) {
        setActionSuccess('Product status updated successfully!');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to update product status');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error occurred while updating product status.');
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
    createProduct,
    updateProduct,
    updateProductStatus,
  };
};