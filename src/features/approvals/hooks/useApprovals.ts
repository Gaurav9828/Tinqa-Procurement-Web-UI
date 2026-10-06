import { useState, useCallback, useEffect } from 'react';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { approvalService } from '../services/approvalService';
import type { ProcessApprovalPayload, UnifiedApprovalItem } from '../types/approval.types';

import { useAuthStore } from '../../../store/useAuthStore';
import { stockApi } from '../../stock-management/api/stockApi';
import { orderApi } from '../../order-management/api/orderApi';
import type { ApprovalItem } from '../../../types/common.types';
import { useNotify } from '../../../hooks/useNotify';

export const useApprovals = () => {
  const [approvals, setApprovals] = useState<UnifiedApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const { user } = useAuthStore();
  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const fetchAllApprovals = useCallback(async () => {
    if (user?.role !== 'ADMIN_L2') return;

    const isCurrent = beginRequest();
    setIsLoading(true);

    try {
      const [documentsResult, profilesResult, stocksResult, orderResult] = await Promise.allSettled([
        approvalService.getPendingDocuments(),
        approvalService.getProfileApprovals(),
        approvalService.getStocksApprovals(),
        approvalService.getOrdersApprovals()
      ]);
      if (!isCurrent()) return;

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

      const failedQueues = [documentsResult, profilesResult, stocksResult, orderResult].filter(
        (result) => result.status === 'rejected'
      ).length;
      if (failedQueues === 4) {
        notify.error('Failed to load pending approvals.');
      } else if (failedQueues > 0) {
        notify.warning('Some approval queues could not be loaded. The list may be incomplete.');
      }

      setApprovals(mergedApprovals);
    } catch (err: unknown) {
      notify.error(err, 'An unexpected error occurred.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [user?.role, beginRequest, notify]);

  useEffect(() => {
    fetchAllApprovals();
  }, [fetchAllApprovals]);

  const processPendingApproval = async (
    item: ApprovalItem,
    payload: ProcessApprovalPayload
  ): Promise<boolean> => {
    const targetId = 'id' in item ? item.id : item.requestId;

    if ((payload.decision === 'REJECTED' || payload.decision === 'CANCELLED') && !payload.rejectionReason?.trim()) {
      notify.error('A rejection reason is required.');
      return false;
    }

    try {
      if (item.approvalType === 'DOCUMENT') {
        const res = await approvalService.processDocumentApproval(targetId, payload);
        if (res.success) {
          notify.success(res.message || 'Document L2 approval status updated.');
        } else {
          notify.error(res.message || 'Failed to process document approval.');
          return false;
        }
      } else if (item.approvalType === 'PROFILE') {
        const res = await approvalService.processProfileApproval(targetId, payload);
        if (res.success) {
          notify.success(res.message || 'Profile L2 approval status updated.');
        } else {
          notify.error(res.message || 'Failed to process Profile approval.');
          return false;
        }

      } else if (item.approvalType === 'STOCKS') {
        const res = await stockApi.processAdminL2Approval(targetId, payload);
        if (res.success) {
          notify.success(res.message || 'Stock L2 approval status updated.');
        } else {
          notify.error(res.message || 'Failed to process stock approval.');
          return false;
        }
      } else if (item.approvalType === 'ORDERS') {
        const res = await orderApi.processAdminL2Approval(targetId, payload);
        if (res.success) {
          notify.success(res.message || 'Order L2 approval status updated.');
        } else {
          notify.error(res.message || 'Failed to process Order approval.');
          return false;
        }
      }

      await fetchAllApprovals();
      return true;
    } catch (err: unknown) {
      notify.error(err, 'An unexpected error occurred during approval processing.');
      return false;
    }
  };

  // Download handler action
  const downloadDocument = async (documentId: number, fileName: string) => {
    try {
      setIsDownloading(true);
      await approvalService.downloadDocument(documentId, fileName);
    } catch (err: unknown) {
      notify.error(err, 'Failed to download document.');
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    approvals,
    isLoading,
    isDownloading,
    refreshApprovals: fetchAllApprovals,
    processPendingApproval,
    downloadDocument,
  };
};