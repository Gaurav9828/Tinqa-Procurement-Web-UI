import { useState } from 'react';
import { productApi } from '../api/productsApi';
import type { CreateProductRequest, UpdateProductRequest, UpdateProductStatusRequest } from '../types/product.types';
import { validateProductPayload } from '../validator/productSecurityValidator';
import { useDispatch } from 'react-redux';
import { showAlert } from '../../../store/alertSlice';

export const useProductActions = (onSuccessCallback?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  const createProduct = async (payload: CreateProductRequest): Promise<boolean> => {
    const validationError: string = validateProductPayload(payload);
    if (validationError) {
      dispatch(showAlert({ message: validationError, type: 'error' }));
      return false;
    }
    
    setIsSubmitting(true);
    try {
      const res = await productApi.createProduct(payload);
      if (res.success) {
        dispatch(showAlert({ message: res.message || 'Product created successfully!', type: 'success' }));
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      dispatch(showAlert({ message: res.message || 'Failed to create product', type: 'error' }));
      return false;
    } catch (err: any) {
      dispatch(showAlert({ message: err?.response?.data?.message || 'Error occurred while creating product.', type: 'error' }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProduct = async (id: number, payload: UpdateProductRequest): Promise<boolean> => {
    const validationError: string = validateProductPayload(payload);
    if (validationError) {
      dispatch(showAlert({ message: validationError, type: 'error' }));
      return false;
    }

    setIsSubmitting(true);
    try {
      const res = await productApi.updateProduct(id, payload);
      if (res.success) {
        dispatch(showAlert({ message: res.message || 'Product updated successfully!', type: 'success' }));
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      dispatch(showAlert({ message: res.message || 'Failed to update product', type: 'error' }));
      return false;
    } catch (err: any) {
      dispatch(showAlert({ message: err?.response?.data?.message || 'Error occurred while updating product.', type: 'error' }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProductStatus = async (id: number, payload: UpdateProductStatusRequest): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await productApi.updateProductStatus(id, payload);
      if (res.success) {
        dispatch(showAlert({ message: res.message || 'Product status updated successfully!', type: 'success' }));
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      dispatch(showAlert({ message: res.message || 'Failed to update product status', type: 'error' }));
      return false;
    } catch (err: any) {
      dispatch(showAlert({ message: err?.response?.data?.message || 'Error occurred while updating product status.', type: 'error' }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    createProduct,
    updateProduct,
    updateProductStatus,
  };
};