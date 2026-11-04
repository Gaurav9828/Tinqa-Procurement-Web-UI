import { useCallback, useState } from 'react';
import { productApi } from '../api/productsApi';
import { productApprovalApi } from '../api/productApprovalApi';
import type { ApiResponse } from '../../../types/common.types';
import type {
  CreateProductRequest,
  ProductResponse,
  ProductResponseDto,
  UpdateProductRequest,
  UpdateProductStatusRequest,
} from '../types/product.types';
import type { ProductApprovalDecision, ProductApprovalResponse, ProductChangeSummary, ProductCostSummary } from '../types/productApproval.types';
import { validateProductPayload } from '../validator/productSecurityValidator';
import { useApiAction } from '../../../hooks/useApiAction';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorMessage, getApiFieldErrors } from '../../../utils/apiError';
import { buildApprovalSnapshot, buildApprovedUpdatePayload, snapshotFromRequest } from '../utils/productApproval';
import { toProduct } from '../utils/productMapper';
import { versionLabel } from '../utils/productVersion';
import type { NewProductUnit } from '../../barcodes/types/barcode.types';
import { rememberUnits } from '../../barcodes/utils/rememberedUnits';

export const PRODUCT_SUBMITTED_MESSAGE =
  'Product created and sent for approval. It stays inactive until it is approved.';

export const DRAFT_SAVED_MESSAGE =
  'Draft saved. It is marked Draft in the list: open it any time to finish it and submit it for approval.';

export const UPDATE_SUBMITTED_MESSAGE =
  'Changes sent for approval. The product stays as it is until they are approved.';

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
   * With `draftId`, (1) finishes that draft instead (PUT with `draft: false`, which builds its first unit).
   */
  const createProduct = async (payload: CreateProductRequest, costSummary?: ProductCostSummary, draftId?: number): Promise<boolean> => {
    setFieldErrors({});
    const inactive: CreateProductRequest = { ...payload, enabled: false, ...(draftId ? { draft: false } : {}) };
    const validationError = validateProductPayload(inactive);
    if (validationError) return reject(validationError);
    const failure = draftId ? 'Error occurred while submitting the draft.' : 'Error occurred while creating product.';

    setIsWorking(true);
    try {
      let created: ProductResponse | null = null;
      try {
        const res = draftId
          ? ((await productApi.updateProduct(draftId, inactive)) as ApiResponse<ProductResponseDto | null>)
          : await productApi.createProduct(inactive);
        if (!res.success) {
          notify.error(res, failure);
          return false;
        }
        created = res.data ? toProduct(res.data) : null;
      } catch (err: unknown) {
        notify.error(err, failure);
        captureFieldErrors(err);
        return false;
      }

      if (!created?.id) {
        notify.warning('Product created (inactive), but it could not be sent for approval. Use "Submit for approval" on the product.');
        onSuccessCallback?.();
        return true;
      }
      // Kept so a resubmission after a rejection starts from these codes
      rememberUnits(created.id, inactive.newUnits ?? []);
      try {
        const approval = await productApprovalApi.submit({
          ecommerceProductId: created.id,
          productTitle: created.title,
          snapshot: {
            ...snapshotFromRequest(inactive, (id) => created?.accessoryFor.find((link) => link.productId === id)?.title),
            title: created.title,
            ...(costSummary ? { costSummary } : {}),
          },
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

  /**
   * Saves unfinished work as a draft: new (`draftId` omitted) or an existing draft. Only title and category are needed;
   * nothing is built from item stock and nothing is sent for approval.
   */
  const saveDraft = async (payload: CreateProductRequest, draftId?: number): Promise<boolean> => {
    setFieldErrors({});
    const draft: CreateProductRequest = { ...payload, draft: true, enabled: false, stockQuantity: 0, newUnits: undefined, removedUnits: undefined };
    const validationError = validateProductPayload(draft, { draft: true });
    if (validationError) return reject(validationError);
    return run(
      async () => {
        const res = await (draftId ? productApi.updateProduct(draftId, draft) : productApi.createProduct(draft));
        // Say where to find the draft (not the server's generic text)
        return res.success ? { ...res, message: '' } : res;
      },
      {
        success: DRAFT_SAVED_MESSAGE,
        failure: 'Could not save the draft.',
        onError: captureFieldErrors,
      }
    );
  };

  /**
   * Copies a sold product into a new draft version whose components can change. Resolves to the new draft (to open
   * it straight away), or null when it wasn't created.
   */
  const createNewVersion = async (product: ProductResponse): Promise<ProductResponse | null> => {
    setIsWorking(true);
    try {
      const res = await productApi.createNewVersion(product.id);
      if (!res.success || !res.data) {
        notify.error(res, `Could not create a new version of "${product.title}".`);
        return null;
      }
      const created = toProduct(res.data);
      notify.success(
        `${versionLabel(created)} of "${product.title}" created as a draft (#${created.id}). Give it its own model name, change what you ` +
          `need, then submit it for approval. ${versionLabel(product)} keeps selling until the new version is approved and turned on.`
      );
      onSuccessCallback?.();
      return created;
    } catch (err: unknown) {
      notify.error(err, `Could not create a new version of "${product.title}".`);
      return null;
    } finally {
      setIsWorking(false);
    }
  };

  const updateProduct = async (id: number, payload: UpdateProductRequest): Promise<boolean> => {
    setFieldErrors({});
    // Stock changes re-send the product as it is; one created before GST was recorded may still have none
    // (the edit form always requires GST, and the backend refuses removing it)
    const validationError = validateProductPayload(payload, { allowWithoutGst: true });
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
    changeSummary: ProductChangeSummary[],
    /** Names the accessory's parents in the snapshot. */
    titleOf?: (productId: number) => string | undefined,
    /** One unit's cost and profit after the changes, shown to the approver. */
    costSummary?: ProductCostSummary
  ): Promise<boolean> => {
    setFieldErrors({});
    const validationError = validateProductPayload(payload);
    if (validationError) return reject(validationError);
    const previousSnapshot = buildApprovalSnapshot(product);
    // Components are only in the payload when they changed; otherwise the product keeps its current ones.
    const snapshot = {
      ...snapshotFromRequest(payload, titleOf),
      ...(payload.components ? {} : { components: previousSnapshot.components }),
      ...(payload.accessory === undefined ? { accessoryParents: previousSnapshot.accessoryParents } : {}),
      ...(costSummary ? { costSummary } : {}),
    };
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

  /**
   * First submission (if the automatic one failed) or resubmission after a rejection. A rejection gave the product's
   * pieces back and withdrew its unit barcodes, so a resubmission sends its units in stock again (`units`).
   */
  const submitForApproval = async (product: ProductResponse, isResubmission: boolean, units?: NewProductUnit[]): Promise<boolean> =>
    run(
      async () => {
        const res = await productApprovalApi.submit({
          ecommerceProductId: product.id,
          productTitle: product.title,
          snapshot: buildApprovalSnapshot(product),
          ...(isResubmission ? { units: units ?? [] } : {}),
        });
        if (res.success && isResubmission) rememberUnits(product.id, units ?? []);
        // Always tell the user the product stays inactive (not the server's generic text).
        return res.success ? { ...res, message: '' } : res;
      },
      {
        success: isResubmission
          ? 'Product resubmitted for approval. It stays inactive until approved.'
          : 'Product sent for approval. It stays inactive until approved.',
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
    saveDraft,
    createNewVersion,
    updateProduct,
    updateProductStatus,
    requestProductUpdate,
    applyApprovedUpdate,
    submitForApproval,
    decideApproval,
  };
};
