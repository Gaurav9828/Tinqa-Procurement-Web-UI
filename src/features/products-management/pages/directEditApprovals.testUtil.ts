import { vi } from 'vitest';
import { axiosClient } from '../../../api/axiosClient';

/**
 * Edit-form tests exercise the direct-save path: each product's latest approval request is a rejected
 * CREATE, so saving writes to the product (PUT) instead of sending an UPDATE request to Admin L2.
 * Approval-gated edits are covered in ProductApproval.test.tsx.
 */
export const mockDirectEditApprovals = () => {
  const get = vi.mocked(axiosClient).get;
  const base = get.getMockImplementation();
  get.mockImplementation(async (url, config) => {
    if (url !== '/v1/product-approvals/latest') return base?.(url, config);
    const ids = String((config?.params as { productIds?: string } | undefined)?.productIds ?? '').split(',').filter(Boolean).map(Number);
    const data = ids.map((id) => ({ id: 1000 + id, ecommerceProductId: id, productTitle: '', requestType: 'CREATE', status: 'REJECTED', decisionReason: 'Fix the details' }));
    return { data: { success: true, message: 'OK', data } };
  });
};
