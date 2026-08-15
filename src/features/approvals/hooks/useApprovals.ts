import { useState, useCallback, useEffect, useRef } from 'react';
import { approvalService } from '../services/approvalService';
import type { ProcessApprovalPayload, UnifiedApprovalItem } from '../types/approval.types';

import { useAuthStore } from '../../../store/useAuthStore';

export const useApprovals = () => {
  const [approvals, setApprovals] = useState<UnifiedApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const isFetchingRef = useRef<boolean>(false);

  const fetchAllApprovals = useCallback(async () => {
    if (user?.role !== 'ADMIN_L2' || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const [documentsResult, profilesResult] = await Promise.allSettled([
        approvalService.getPendingDocuments(),
        approvalService.getProfileApprovals(),
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

      if (documentsResult.status === 'rejected' && profilesResult.status === 'rejected') {
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

  const processApproval = async (
    item: UnifiedApprovalItem,
    payload: ProcessApprovalPayload
  ) => {
    const targetId = 'id' in item ? item.id : item.requestId;

    if (item.approvalType === 'DOCUMENT') {
      await approvalService.processDocumentApproval(targetId, payload);
    } else if (item.approvalType === 'PROFILE') {
      await approvalService.processProfileApproval(targetId, payload);
    }

    await fetchAllApprovals();
  };

  // Download handler action
  const downloadDocument = async (documentId: number, fileName: string) => {
    try {
      setIsDownloading(true);
      await approvalService.downloadDocument(documentId, fileName);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to download document.');
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    approvals,
    isLoading,
    isDownloading,
    error,
    refreshApprovals: fetchAllApprovals,
    processApproval,
    downloadDocument,
  };
};