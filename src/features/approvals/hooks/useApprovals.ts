import { useState, useCallback, useEffect } from 'react';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { approvalService } from '../services/approvalService';
import type { ProcessApprovalPayload, UnifiedApprovalItem } from '../types/approval.types';

import { useAccess } from '../../../hooks/useAccess';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Permission } from '../../../config/access';
import { stockApi } from '../../stock-management/api/stockApi';
import { orderApi } from '../../order-management/api/orderApi';
import { productApprovalApi } from '../../products-management/api/productApprovalApi';
import type { ApprovalItem } from '../../../types/common.types';
import type { EmployeeResponse } from '../../employee-management/types/employee.types';
import { useNotify } from '../../../hooks/useNotify';
import { ORDER_APPROVAL_TYPES, ORDER_QUEUES, isOrderApprovalType, isRejectDecision, type OrderApprovalType } from '../utils/orderQueues';
import type { OrderStatus } from '../../../types/common.types';

/** Holding any of these opens the hub's Requests tab (each queue still loads only for its own decider). */
export const REQUEST_QUEUE_PERMISSIONS: Permission[] = ['DOCUMENT_APPROVE', 'EMPLOYEE_PROFILE_CHANGE_APPROVE', 'STOCK_APPROVE',
  'PROCUREMENT_ORDER_APPROVE', 'PROCUREMENT_ORDER_UPDATE_STATUS', 'PRODUCT_APPROVAL_DECIDE', 'EMPLOYEE_APPROVE'];

// The order queues in one call; each order lands in the queue of its status if it waits on staff there
const loadOrderQueues = async (types: OrderApprovalType[]): Promise<UnifiedApprovalItem[]> => {
  const orders = await approvalService.getOrdersInStatuses(types.map((type) => ORDER_QUEUES[type].status));
  return types.flatMap((type) => {
    const queue = ORDER_QUEUES[type];
    return orders
      .filter((order) => order.orderStatus === queue.status && (queue.includes?.(order) ?? true))
      .map((order) => ({ ...order, approvalType: type }));
  });
};

// PENDING orders have their own approval decision; quotations and returns are ordinary status moves
const decideOrder = (item: ApprovalItem, id: number, payload: ProcessApprovalPayload) =>
  item.approvalType === 'ORDERS'
    ? orderApi.processAdminL2Approval(id, payload)
    : orderApi.updateOrderStatus(id, {
        status: payload.decision as OrderStatus,
        reason: isRejectDecision(payload.decision) ? payload.rejectionReason?.trim() : undefined,
      });

/** `enabled`: load only while the Requests tab is open (its badge comes from the approval summary). */
export const useApprovals = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const [approvals, setApprovals] = useState<UnifiedApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const { can, canAny } = useAccess();
  const userId = useAuthStore((state) => state.user?.userId);
  const beginRequest = useLatestRequest();
  const notify = useNotify();

  const fetchAllApprovals = useCallback(async () => {
    if (!enabled || !canAny(...REQUEST_QUEUE_PERMISSIONS)) return;
    // Each queue loads only for someone who can decide it and read the list it comes from (the endpoint's own
    // permission); the rest stay empty
    const ifAllowed = <T,>(permission: Permission | Permission[], load: () => Promise<T[]>): Promise<T[]> =>
      (Array.isArray(permission) ? permission.every(can) : can(permission)) ? load() : Promise.resolve([]);

    const isCurrent = beginRequest();
    setIsLoading(true);

    try {
      // Orders waiting on staff (dealer quotations to submit, orders to approve, returns to decide): only the
      // queues this user decides, and only with PROCUREMENT_ORDER_VIEW to list them
      const orderTypes = ORDER_APPROVAL_TYPES.filter((type) => can(ORDER_QUEUES[type].decidePermission));
      const [documentsResult, profilesResult, stocksResult, orderResult, productResult, employeeResult] = await Promise.allSettled([
        ifAllowed(['DOCUMENT_APPROVE', 'DOCUMENT_VIEW'], () => approvalService.getPendingDocuments()),
        ifAllowed('EMPLOYEE_PROFILE_CHANGE_APPROVE', () => approvalService.getProfileApprovals()),
        ifAllowed(['STOCK_APPROVE', 'STOCK_VIEW'], () => approvalService.getStocksApprovals()),
        orderTypes.length > 0 ? ifAllowed('PROCUREMENT_ORDER_VIEW', () => loadOrderQueues(orderTypes)) : Promise.resolve([]),
        ifAllowed('PRODUCT_APPROVAL_DECIDE', () =>
          productApprovalApi.getPending().then((res) => (res.success && Array.isArray(res.data) ? res.data : []))
        ),
        ifAllowed('EMPLOYEE_APPROVE', () => approvalService.getEmployeeApprovals()),
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
        mergedApprovals.push(...orderResult.value);
      }

      if (productResult.status === 'fulfilled') {
        mergedApprovals.push(
          ...productResult.value.map((request) => ({
            ...request,
            approvalType: 'PRODUCTS' as const,
          }))
        );
      }

      if (employeeResult.status === 'fulfilled') {
        mergedApprovals.push(
          ...employeeResult.value.map((employee) => ({
            ...employee,
            approvalType: 'EMPLOYEE' as const,
          }))
        );
      }

      const queues = [documentsResult, profilesResult, stocksResult, orderResult, productResult, employeeResult];
      const failedQueues = queues.filter((result) => result.status === 'rejected').length;
      if (failedQueues === queues.length) {
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
  }, [enabled, can, canAny, beginRequest, notify]);

  useEffect(() => {
    fetchAllApprovals();
  }, [fetchAllApprovals]);

  const processPendingApproval = async (
    item: ApprovalItem,
    payload: ProcessApprovalPayload
  ): Promise<boolean> => {
    const targetId = 'id' in item ? item.id : item.requestId;

    if (isRejectDecision(payload.decision) && !payload.rejectionReason?.trim()) {
      notify.error('A rejection reason is required.');
      return false;
    }

    // The backend refuses this too; checking here saves a round trip and gives the same message.
    const employeeCreatedBy = item.approvalType === 'EMPLOYEE' ? (item as EmployeeResponse).createdBy : null;
    if (employeeCreatedBy != null && employeeCreatedBy === userId) {
      notify.error('You created this employee, so another employee approver has to review them.');
      return false;
    }

    try {
      if (item.approvalType === 'DOCUMENT') {
        const res = await approvalService.processDocumentApproval(targetId, payload);
        if (res.success) {
          notify.success(res.message || 'Document approval status updated.');
        } else {
          notify.error(res, 'Failed to process document approval.');
          return false;
        }
      } else if (item.approvalType === 'PROFILE') {
        const res = await approvalService.processProfileApproval(targetId, payload);
        if (res.success) {
          notify.success(res.message || 'Profile L2 approval status updated.');
        } else {
          notify.error(res, 'Failed to process Profile approval.');
          return false;
        }

      } else if (item.approvalType === 'STOCKS') {
        const res = await stockApi.processAdminL2Approval(targetId, payload);
        if (res.success) {
          notify.success(res.message || 'Stock L2 approval status updated.');
        } else {
          notify.error(res, 'Failed to process stock approval.');
          return false;
        }
      } else if (isOrderApprovalType(item.approvalType)) {
        const res = await decideOrder(item, targetId, payload);
        if (res.success) {
          notify.success(res.message || 'Order status updated.');
        } else {
          notify.error(res, 'Failed to update the order.');
          return false;
        }
      } else if (item.approvalType === 'EMPLOYEE') {
        const res = await approvalService.processEmployeeApproval(targetId, payload);
        if (res.success) {
          notify.success(res.message || 'Employee approval status updated.');
        } else {
          notify.error(res, 'Failed to process employee approval.');
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