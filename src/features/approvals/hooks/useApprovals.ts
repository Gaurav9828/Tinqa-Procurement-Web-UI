import { useState, useCallback, useEffect, useRef } from 'react';
import { approvalService } from '../services/approvalService';
import type { ProcessApprovalPayload, UnifiedApprovalItem } from '../types/approval.types';

import { useAuthStore } from '../../../store/useAuthStore';
import { useStockActions } from '../../stock-management/hooks/useStockActions';
import { useStockList } from '../../stock-management/hooks/useStockList';
import { useOrderList } from '../../order-management/hooks/useOrderList';
import { useOrderActions } from '../../order-management/hooks/useOrderActions';
import type { ApprovalItem } from '../../../types/common.types';

export const useApprovals = () => {
  const [approvals, setApprovals] = useState<UnifiedApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Stock actions already provide isSubmitting, actionError, actionSuccess, and clearMessages
  const { refetch: stockRefetch } = useStockList();
  const { processApproval } = useStockActions(stockRefetch);
  const { refetch: OrderRefetch } = useOrderList();
  const { processAdminL2Approval } = useOrderActions(OrderRefetch);

  const { user } = useAuthStore();
  const isFetchingRef = useRef<boolean>(false);

  const clearMessages = () => {
    setError(null);
    setActionSuccess(null);
  };

  const fetchAllApprovals = useCallback(async () => {
    if (user?.role !== 'ADMIN_L2' || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const [documentsResult, profilesResult, stocksResult, orderResult] = await Promise.allSettled([
        approvalService.getPendingDocuments(),
        approvalService.getProfileApprovals(),
        approvalService.getStocksApprovals(),
        approvalService.getOrdersApprovals()
      ]);

      const mergedApprovals: UnifiedApprovalItem[] = [];

      if (documentsResult.status === 'fulfilled') {
        mergedApprovals.push(
          ...documentsResult.value.map((doc) => ({
            ...doc,
            approvalType: 'DOCUMENT' as const,
          }))
        );
      }

      if (profilesResult.status === 'fulfilled') {
        mergedApprovals.push(
          ...profilesResult.value.map((prof) => ({
            ...prof,
            approvalType: 'PROFILE' as const,
          }))
        );
      }

      if (stocksResult.status === 'fulfilled') {
        mergedApprovals.push(
          ...stocksResult.value.map((stock) => ({
            ...stock,
            approvalType: 'STOCKS' as const,
          }))
        );
      }

      if (orderResult.status === 'fulfilled') {
        mergedApprovals.push(
          ...orderResult.value.map((order) => ({
            ...order,
            approvalType: 'ORDERS' as const,
          }))
        );
      }

      if (
        documentsResult.status === 'rejected' &&
        profilesResult.status === 'rejected' &&
        stocksResult.status === 'rejected' &&
        orderResult.status === 'rejected'
      ) {
        setError('Failed to load pending approvals.');
      }

      setApprovals(mergedApprovals);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.role]);

  useEffect(() => {
    fetchAllApprovals();
  }, [fetchAllApprovals]);

  const processPendingApproval = async (
    item: ApprovalItem,
    payload: ProcessApprovalPayload
  ): Promise<boolean> => {
    const targetId = 'id' in item ? item.id : item.requestId;
    clearMessages();

    try {
      if (item.approvalType === 'DOCUMENT') {
        const res = await approvalService.processDocumentApproval(targetId, payload as ProcessApprovalPayload);
        if (res.success) {
          setActionSuccess('Document L2 approval status updated.');
        } else {
          setError(res.message || 'Failed to process document approval.');
          return false;
        }
      } else if (item.approvalType === 'PROFILE') {
        const res = await approvalService.processProfileApproval(targetId, payload as ProcessApprovalPayload);
        if (res.success) {
          setActionSuccess('Profile L2 approval status updated.');
        } else {
          setError(res.message || 'Failed to process Profile approval.');
          return false;
        }

      } else if (item.approvalType === 'STOCKS') {
        const success = await processApproval(targetId, payload as ProcessApprovalPayload);
        if (success) {
          setActionSuccess('Stock L2 approval status updated.');
        } else {
          setError('Failed to process stock approval.');
          return false;
        }
      } else if (item.approvalType === 'ORDERS') {
        const success = await processAdminL2Approval(targetId, payload as ProcessApprovalPayload);
        if (success) {
          setActionSuccess('Order L2 approval status updated.');
        } else {
          setError('Failed to process Order approval.');
          return false;
        }
      }

      await fetchAllApprovals();
      return true;
    } catch (err: any) {
      const errMessage = err?.response?.data?.message || err?.message || 'An unexpected error occurred during approval processing.';
      setError(errMessage);
      return false;
    }
  };

  // Download handler action
  const downloadDocument = async (documentId: number, fileName: string) => {
    try {
      setIsDownloading(true);
      await approvalService.downloadDocument(documentId, fileName);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to download document.');
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    approvals,
    isLoading,
    isDownloading,
    error,
    actionSuccess,
    clearMessages,
    refreshApprovals: fetchAllApprovals,
    processPendingApproval,
    downloadDocument,
  };
};