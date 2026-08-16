import { useState } from 'react';
import { itemApi } from '../api/itemApi';
import type {
  CreateCategoryRequest,
  CreateItemRequest,
  UpdateItemRequest,
  ItemResponse,
} from '../types/item.types';

export const useItemActions = (onSuccessCallback?: () => void) => {
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
      const res = await itemApi.createCategory(payload);
      if (res.success) {
        setActionSuccess('Category created successfully!');
        return true;
      }
      setActionError(res.message || 'Failed to create category.');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error creating category.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const createItem = async (payload: CreateItemRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await itemApi.createItem(payload);
      if (res.success) {
        setActionSuccess('Item created successfully!');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to create item.');
      return false;
    } catch (err: any) {
      const responseData = err?.response?.data;
      if (responseData?.data && Array.isArray(responseData.data)) {
        setActionError(responseData.data.join(' | '));
      } else {
        setActionError(responseData?.message || 'Error creating item.');
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItem = async (id: number, payload: UpdateItemRequest): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
    try {
      const res = await itemApi.updateItem(id, payload);
      if (res.success) {
        setActionSuccess('Item updated successfully!');
        if (onSuccessCallback) onSuccessCallback();
        return true;
      }
      setActionError(res.message || 'Failed to update item.');
      return false;
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Error updating item.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleItemStatus = async (item: ItemResponse, targetStatus: boolean): Promise<boolean> => {
    setIsSubmitting(true);
    clearMessages();
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
        setActionSuccess(
          `Item "${item.name}" has been successfully ${targetStatus ? 'activated' : 'inactivated'}.`
        );
        if (onSuccessCallback) onSuccessCallback();
        return true;
      } else {
        setActionError(res.message || `Failed to ${targetStatus ? 'activate' : 'inactivate'} item.`);
        return false;
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'An error occurred.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    actionError,
    actionSuccess,
    toggleItemStatus,
    clearMessages,
    createCategory,
    createItem,
    updateItem,
  };
};