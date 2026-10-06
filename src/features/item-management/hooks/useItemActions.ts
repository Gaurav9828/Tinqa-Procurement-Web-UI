import { useState } from 'react';
import { useNotify } from '../../../hooks/useNotify';
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
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItem = async (id: number, payload: UpdateItemRequest): Promise<boolean> => {
    setIsSubmitting(true);
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
        warrantyMonths: item.warrantyMonths ?? 0,
        termsAndCondition: item.termsAndCondition,
        description: item.description,
        attributes: item.attributes,
        isActive: targetStatus,
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
    toggleItemStatus,
    createCategory,
    createItem,
    updateItem,
  };
};