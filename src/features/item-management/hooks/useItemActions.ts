import { useCallback, useState } from 'react';
import { useNotify } from '../../../hooks/useNotify';
import { getApiFieldErrors } from '../../../utils/apiError';
import { invalidateItemOptions } from '../../../hooks/useLookupOptions';
import { itemApi } from '../api/itemApi';
import type {
  CreateCategoryRequest,
  CreateItemRequest,
  UpdateItemRequest,
  ItemResponse,
} from '../types/item.types';

export const useItemActions = (onSuccessCallback?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Backend 400 field errors (`errors: [{ field, message }]`, e.g. `warranties[0].title`) from the last create/update.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldErrors = useCallback(() => setFieldErrors({}), []);
  const notify = useNotify();

  const createCategory = async (payload: CreateCategoryRequest): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const res = await itemApi.createCategory(payload);
      if (res.success) {
        notify.success('Category created successfully!');
        return true;
      }
      notify.error(res.message || 'Failed to create category.');
      return false;
    } catch (err: unknown) {
      notify.error(err, 'Error creating category.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const createItem = async (payload: CreateItemRequest): Promise<boolean> => {
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const res = await itemApi.createItem(payload);
      if (res.success) {
        notify.success('Item created successfully!');
        invalidateItemOptions();
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      notify.error(res.message || 'Failed to create item.');
      return false;
    } catch (err: unknown) {
      // Item validation errors arrive as a list of messages in `data`.
      const responseData = (err as { response?: { data?: { data?: unknown } } })?.response?.data;
      if (Array.isArray(responseData?.data)) {
        notify.error(responseData.data.join(' | '));
      } else {
        notify.error(err, 'Error creating item.');
      }
      setFieldErrors(getApiFieldErrors(err));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItem = async (id: number, payload: UpdateItemRequest): Promise<boolean> => {
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      const res = await itemApi.updateItem(id, payload);
      if (res.success) {
        notify.success('Item updated successfully!');
        invalidateItemOptions();
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      notify.error(res.message || 'Failed to update item.');
      return false;
    } catch (err: unknown) {
      notify.error(err, 'Error updating item.');
      setFieldErrors(getApiFieldErrors(err));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleItemStatus = async (item: ItemResponse, targetStatus: boolean): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const payload: UpdateItemRequest = {
        categoryId: item.categoryId,
        name: item.name,
        brand: item.brand,
        unitOfMeasure: item.unitOfMeasure,
        mrp: item.mrp,
        countryOfOrigin: item.countryOfOrigin || 'India',
        rawMaterialsUsed: item.rawMaterialsUsed,
        termsAndCondition: item.termsAndCondition,
        description: item.description,
        attributes: item.attributes,
        isActive: targetStatus,
        // `warranties` deliberately omitted: the backend then leaves them untouched.
      };

      const res = await itemApi.updateItem(item.id, payload);
      if (res.success) {
        invalidateItemOptions();
        notify.success(
          `Item "${item.name}" has been successfully ${targetStatus ? 'activated' : 'inactivated'}.`
        );
        if (onSuccessCallback) onSuccessCallback();
        return true;
      } else {
        notify.error(res.message || `Failed to ${targetStatus ? 'activate' : 'inactivate'} item.`);
        return false;
      }
    } catch (err: unknown) {
      notify.error(err, 'An error occurred.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    fieldErrors,
    clearFieldErrors,
    toggleItemStatus,
    createCategory,
    createItem,
    updateItem,
  };
};