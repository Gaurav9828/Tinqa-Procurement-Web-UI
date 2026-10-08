import { useCallback, useState } from 'react';
import { productApi } from '../api/productsApi';
import type { CreateProductRequest, UpdateProductRequest, UpdateProductStatusRequest } from '../types/product.types';
import { validateProductPayload } from '../validator/productSecurityValidator';
import { useApiAction } from '../../../hooks/useApiAction';
import { getApiFieldErrors } from '../../../utils/apiError';

export const useProductActions = (onSuccessCallback?: () => void) => {
  const { isSubmitting, run, reject } = useApiAction(onSuccessCallback);
  // Backend field errors (`errors: [{ field, message }]`, e.g. `warranties[0].title`) from the last create/update.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldErrors = useCallback(() => setFieldErrors({}), []);
  const captureFieldErrors = (err: unknown) => setFieldErrors(getApiFieldErrors(err));

  const createProduct = async (payload: CreateProductRequest): Promise<boolean> => {
    setFieldErrors({});
    const validationError = validateProductPayload(payload);
    if (validationError) return reject(validationError);
    return run(() => productApi.createProduct(payload), {
      success: 'Product created successfully!',
      failure: 'Error occurred while creating product.',
      onError: captureFieldErrors,
    });
  };

  const updateProduct = async (id: number, payload: UpdateProductRequest): Promise<boolean> => {
    setFieldErrors({});
    const validationError = validateProductPayload(payload);
    if (validationError) return reject(validationError);
    return run(() => productApi.updateProduct(id, payload), {
      success: 'Product updated successfully!',
      failure: 'Error occurred while updating product.',
      onError: captureFieldErrors,
    });
  };

  const updateProductStatus = async (id: number, payload: UpdateProductStatusRequest): Promise<boolean> =>
    run(() => productApi.updateProductStatus(id, payload), {
      success: 'Product status updated successfully!',
      failure: 'Error occurred while updating product status.',
    });

  return {
    isSubmitting,
    fieldErrors,
    clearFieldErrors,
    createProduct,
    updateProduct,
    updateProductStatus,
  };
};
