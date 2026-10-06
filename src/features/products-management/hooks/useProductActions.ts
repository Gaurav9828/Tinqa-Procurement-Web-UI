import { productApi } from '../api/productsApi';
import type { CreateProductRequest, UpdateProductRequest, UpdateProductStatusRequest } from '../types/product.types';
import { validateProductPayload } from '../validator/productSecurityValidator';
import { useApiAction } from '../../../hooks/useApiAction';

export const useProductActions = (onSuccessCallback?: () => void) => {
  const { isSubmitting, run, reject } = useApiAction(onSuccessCallback);

  const createProduct = async (payload: CreateProductRequest): Promise<boolean> => {
    const validationError = validateProductPayload(payload);
    if (validationError) return reject(validationError);
    return run(() => productApi.createProduct(payload), {
      success: 'Product created successfully!',
      failure: 'Error occurred while creating product.',
    });
  };

  const updateProduct = async (id: number, payload: UpdateProductRequest): Promise<boolean> => {
    const validationError = validateProductPayload(payload);
    if (validationError) return reject(validationError);
    return run(() => productApi.updateProduct(id, payload), {
      success: 'Product updated successfully!',
      failure: 'Error occurred while updating product.',
    });
  };

  const updateProductStatus = async (id: number, payload: UpdateProductStatusRequest): Promise<boolean> =>
    run(() => productApi.updateProductStatus(id, payload), {
      success: 'Product status updated successfully!',
      failure: 'Error occurred while updating product status.',
    });

  return {
    isSubmitting,
    createProduct,
    updateProduct,
    updateProductStatus,
  };
};
