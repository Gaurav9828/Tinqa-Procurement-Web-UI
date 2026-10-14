import { useCallback, useState } from 'react';
import { productApi } from '../api/productsApi';
import { productApprovalApi } from '../api/productApprovalApi';
import type { CreateProductRequest, ProductResponse, UpdateProductRequest, UpdateProductStatusRequest } from '../types/product.types';
import type { ProductApprovalDecision, ProductApprovalResponse, ProductChangeSummary } from '../types/productApproval.types';
import { validateProductPayload } from '../validator/productSecurityValidator';
import { useApiAction } from '../../../hooks/useApiAction';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorMessage, getApiFieldErrors } from '../../../utils/apiError';
import { buildApprovalSnapshot, buildApprovedUpdatePayload, snapshotFromRequest } from '../utils/productApproval';
import { toProduct } from '../utils/productMapper';

export const PRODUCT_SUBMITTED_MESSAGE =
  'Product created and sent for Admin L2 approval. It stays inactive until Admin L2 approves it.';

export const UPDATE_SUBMITTED_MESSAGE =
  'Changes sent for Admin L2 approval. The product stays as it is until Admin L2 approves them.';

export const useProductActions = (onSuccessCallback?: () => void) => {
  const { isSubmitting: isRunning, run, reject } = useApiAction(onSuccessCallback);
  const [isWorking, setIsWorking] = useState(false);
  const notify = useNotify();
  // Backend field errors (`errors: [{ field, message }]`, e.g. `warranties[0].title`) from the last create/update.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldErrors = useCallback(() => setFieldErrors({}), []);
  const captureFieldErrors = (err: unknown) => setFieldErrors(getApiFieldErrors(err));

  /**
   * Create = (1) save the product in the Ecommerce backend, always INACTIVE, then (2) send an approval
   * request to the Procurement backend for Admin L2. If (2) fails the product still exists (inactive)
   * and can be submitted later from the product list.
   */
  const createProduct = async (payload: CreateProductRequest): Promise<boolean> => {
    setFieldErrors({});
    const inactive: CreateProductRequest = { ...payload, enabled: false };
    const validationError = validateProductPayload(inactive);
    if (validationError) return reject(validationError);

    setIsWorking(true);
    try {
      let created: ProductResponse | null = null;
      try {
        const res = await productApi.createProduct(inactive);
        if (!res.success) {
          notify.error(res, 'Error occurred while creating product.');
          return false;
        }
        created = res.data ? toProduct(res.data) : null;
      } catch (err: unknown) {
        notify.error(err, 'Error occurred while creating product.');
        captureFieldErrors(err);
        return false;
      }

      if (!created?.id) {
        notify.warning('Product created (inactive), but it could not be sent for approval. Use "Submit for approval" on the product.');
        onSuccessCallback?.();
        return true;
      }
      try {
        const approval = await productApprovalApi.submit({
          ecommerceProductId: created.id,
          productTitle: created.title,
          snapshot: { ...snapshotFromRequest(inactive), title: created.title },
        });
        if (!approval.success) throw new Error(approval.message || 'The approval request was not accepted.');
        notify.success(PRODUCT_SUBMITTED_MESSAGE);
      } catch (err: unknown) {
        notify.warning(
          `Product created (inactive), but sending it for approval failed: ${getApiErrorMessage(err, 'unknown error')} Use "Submit for approval" on the product.`
        );
      }
      onSuccessCallback?.();
      return true;
    } finally {
      setIsWorking(false);
    }
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

  /**
   * Edit of an approved product: nothing is written to the Ecommerce product yet. The full payload is stored
   * with an UPDATE request and applied once Admin L2 approves it.
   */
  const requestProductUpdate = async (
    product: ProductResponse,
    payload: UpdateProductRequest,
    changeSummary: ProductChangeSummary[]
  ): Promise<boolean> => {
    setFieldErrors({});
    const validationError = validateProductPayload(payload);
    if (validationError) return reject(validationError);
    const previousSnapshot = buildApprovalSnapshot(product);
    // Components are only in the payload when they changed; otherwise the product keeps its current ones.
    const snapshot = { ...snapshotFromRequest(payload), ...(payload.components ? {} : { components: previousSnapshot.components }) };
    return run(
      async () => {
        const res = await productApprovalApi.submit({
          ecommerceProductId: product.id,
          productTitle: product.title,
          requestType: 'UPDATE',
          snapshot,
          previousSnapshot,
          proposedChanges: payload,
          changeSummary,
        });
        return res.success ? { ...res, message: '' } : res;
      },
      { success: UPDATE_SUBMITTED_MESSAGE, failure: 'Could not send the changes for approval.', onError: captureFieldErrors }
    );
  };

  /** Writes approved changes to the Ecommerce product, then records that in the Procurement backend. */
  const writeApprovedUpdate = async (request: ProductApprovalResponse): Promise<void> => {
    const live = await productApi.findProductById(request.ecommerceProductId);
    if (!live) throw new Error('The product no longer exists.');
    const res = await productApi.updateProduct(request.ecommerceProductId, buildApprovedUpdatePayload(request, live));
    if (!res.success) throw new Error(res.message || 'The update was not accepted.');
    const marked = await productApprovalApi.markApplied(request.id);
    if (!marked.success) throw new Error(marked.message || 'Could not record that the changes were applied.');
  };

  /** Retry for an approved UPDATE whose changes couldn't be written when it was approved. */
  const applyApprovedUpdate = async (request: ProductApprovalResponse): Promise<boolean> => {
    setIsWorking(true);
    try {
      await writeApprovedUpdate(request);
      notify.success(`Approved changes applied to "${request.productTitle}".`);
      onSuccessCallback?.();
      return true;
    } catch (err: unknown) {
      notify.error(err, 'Could not apply the approved changes.');
      return false;
    } finally {
      setIsWorking(false);
    }
  };

  const updateProductStatus = async (id: number, payload: UpdateProductStatusRequest): Promise<boolean> =>
    run(() => productApi.updateProductStatus(id, payload), {
      success: 'Product status updated successfully!',
      failure: 'Error occurred while updating product status.',
    });

  /** First submission (if the automatic one failed) or resubmission after a rejection. */
  const submitForApproval = async (product: ProductResponse, isResubmission: boolean): Promise<boolean> =>
    run(
      async () => {
        const res = await productApprovalApi.submit({
          ecommerceProductId: product.id,
          productTitle: product.title,
          snapshot: buildApprovalSnapshot(product),
        });
        // Always tell the user the product stays inactive (not the server's generic text).
        return res.success ? { ...res, message: '' } : res;
      },
      {
        success: isResubmission
          ? 'Product resubmitted for Admin L2 approval. It stays inactive until approved.'
          : 'Product sent for Admin L2 approval. It stays inactive until approved.',
        failure: 'Could not send the product for approval.',
      }
    );

  /**
   * Admin L2 decision. The decision is recorded in the Procurement backend first; an approval then
   * activates the product (CREATE / RESUBMISSION) or writes the requested changes (UPDATE) in the Ecommerce
   * backend. If that fails, the approval stands and it can be retried from the product list.
   */
  const decideApproval = async (
    request: ProductApprovalResponse,
    decision: ProductApprovalDecision,
    reason?: string
  ): Promise<boolean> => {
    if (decision !== 'APPROVED' && !reason?.trim()) return reject('A reason is required to reject or cancel a product.');
    const isUpdate = request.requestType === 'UPDATE';
    if (isUpdate && decision === 'CANCELLED') return reject('Product changes can only be approved or rejected.');
    setIsWorking(true);
    try {
      try {
        const res = await productApprovalApi.decide(request.id, { decision, ...(reason?.trim() ? { reason: reason.trim() } : {}) });
        if (!res.success) {
          notify.error(res, 'Could not record the decision.');
          return false;
        }
      } catch (err: unknown) {
        notify.error(err, 'Could not record the decision.');
        return false;
      }

      if (isUpdate) {
        if (decision === 'REJECTED') {
          notify.success(`Changes to "${request.productTitle}" were rejected. The product stays as it was.`);
        } else {
          try {
            await writeApprovedUpdate(request);
            notify.success(`Changes to "${request.productTitle}" approved and applied.`);
          } catch (err: unknown) {
            notify.warning(
              `Changes to "${request.productTitle}" were approved, but applying them failed: ${getApiErrorMessage(err, 'unknown error')} Use "Apply approved changes" in Product Management.`
            );
          }
        }
        onSuccessCallback?.();
        return true;
      }

      if (decision !== 'APPROVED') {
        notify.success(
          decision === 'REJECTED'
            ? `"${request.productTitle}" was rejected. It stays inactive; the creator can edit and resubmit it.`
            : `"${request.productTitle}" was cancelled. It stays inactive and can no longer be edited.`
        );
        onSuccessCallback?.();
        return true;
      }

      try {
        const res = await productApi.updateProductStatus(request.ecommerceProductId, { isEnabled: true });
        if (!res.success) throw new Error(res.message || 'Activation was not accepted.');
        notify.success(`"${request.productTitle}" approved and activated.`);
      } catch (err: unknown) {
        notify.warning(
          `"${request.productTitle}" was approved, but activating it failed: ${getApiErrorMessage(err, 'unknown error')} Activate it from Product Management.`
        );
      }
      onSuccessCallback?.();
      return true;
    } finally {
      setIsWorking(false);
    }
  };

  return {
    isSubmitting: isRunning || isWorking,
    fieldErrors,
    clearFieldErrors,
    createProduct,
    updateProduct,
    updateProductStatus,
    requestProductUpdate,
    applyApprovedUpdate,
    submitForApproval,
    decideApproval,
  };
};
