import type { AccessoryLinkResponse, CreateProductRequest, ProductGstFields, ProductResponse, UpdateProductRequest } from '../types/product.types';
import type { ProductApprovalResponse, ProductApprovalSnapshot } from '../types/productApproval.types';

/**
 * Where a product stands in the Admin L2 approval workflow.
 *  - DRAFT:         saved but not finished — not sent for approval yet (no stock, can't go live).
 *  - LEGACY:        active product with no approval request (created before the workflow) — treated as approved.
 *  - NOT_SUBMITTED: inactive product with no request (e.g. submitting failed) — must be submitted to go live.
 *  - PENDING / APPROVED / REJECTED / CANCELLED: the latest CREATE / RESUBMISSION request's status.
 *  - UPDATE_PENDING:     changes to an approved product wait for Admin L2; the live product is unchanged.
 *  - UPDATE_REJECTED:    the last change request was rejected; the live product is unchanged (still approved).
 *  - UPDATE_NOT_APPLIED: changes were approved but not yet written to the product (e.g. the save failed).
 *  - UNKNOWN:       approval status couldn't be loaded — nothing that would activate the product is allowed.
 */
export type ProductApprovalState =
  | 'DRAFT'
  | 'LEGACY'
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'UPDATE_PENDING'
  | 'UPDATE_REJECTED'
  | 'UPDATE_NOT_APPLIED'
  | 'UNKNOWN';

export const getApprovalState = (
  product: Pick<ProductResponse, 'enabled'> & Partial<Pick<ProductResponse, 'draft'>>,
  latest: ProductApprovalResponse | undefined,
  approvalsLoaded: boolean
): ProductApprovalState => {
  if (product.draft) return 'DRAFT';
  if (latest?.requestType === 'UPDATE') {
    if (latest.status === 'PENDING') return 'UPDATE_PENDING';
    if (latest.status === 'APPROVED') return latest.appliedAt ? 'APPROVED' : 'UPDATE_NOT_APPLIED';
    return 'UPDATE_REJECTED';
  }
  if (latest) return latest.status;
  if (!approvalsLoaded) return product.enabled ? 'LEGACY' : 'UNKNOWN';
  return product.enabled ? 'LEGACY' : 'NOT_SUBMITTED';
};

export interface ApprovalPermissions {
  /** Open the edit form. */
  canEdit: boolean;
  /** Saving an edit sends an UPDATE request to Admin L2 instead of changing the product. */
  editNeedsApproval: boolean;
  /** Send a (new) CREATE / RESUBMISSION request. */
  canSubmit: boolean;
  /** Write approved-but-unapplied changes to the product. */
  canApplyUpdate: boolean;
  /** Turn the product on (only once approved). Turning it off is always allowed. */
  canActivate: boolean;
  /** Add stock (uses component item stock) — only for products that are approved to sell. */
  canAddStock: boolean;
  /** Reason shown when editing is blocked. */
  editBlockedReason: string | null;
}

/** Product has been approved at least once, so it may be live and every change needs Admin L2. */
const APPROVED_STATES: ProductApprovalState[] = ['APPROVED', 'LEGACY', 'UPDATE_PENDING', 'UPDATE_REJECTED', 'UPDATE_NOT_APPLIED'];

const EDIT_BLOCKED_REASONS: Partial<Record<ProductApprovalState, string>> = {
  PENDING: 'Waiting for a catalog approver — it can be edited again if the request is rejected.',
  CANCELLED: 'Cancelled by an approver — this product can no longer be edited.',
  UPDATE_PENDING: 'Changes are waiting for a catalog approver — edit again once they are approved or rejected.',
  UPDATE_NOT_APPLIED: 'Approved changes have not been applied yet — apply them first.',
  UNKNOWN: 'Approval status is not loaded yet.',
};

export const getApprovalPermissions = (state: ProductApprovalState): ApprovalPermissions => {
  const approved = APPROVED_STATES.includes(state);
  const editBlockedReason = EDIT_BLOCKED_REASONS[state] ?? null;
  return {
    canEdit: !editBlockedReason,
    editNeedsApproval: approved,
    canSubmit: state === 'NOT_SUBMITTED' || state === 'REJECTED',
    canApplyUpdate: state === 'UPDATE_NOT_APPLIED',
    canActivate: approved,
    canAddStock: approved,
    editBlockedReason,
  };
};

export const APPROVAL_STATE_LABELS: Record<ProductApprovalState, string> = {
  DRAFT: 'Draft',
  LEGACY: 'Approved',
  NOT_SUBMITTED: 'Not submitted',
  PENDING: 'Pending L2 approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  UPDATE_PENDING: 'Update pending L2 approval',
  UPDATE_REJECTED: 'Update rejected',
  UPDATE_NOT_APPLIED: 'Update approved, not applied',
  UNKNOWN: 'Approval status unavailable',
};

/** Copy of the product for the reviewer. */
export const buildApprovalSnapshot = (
  product: Pick<ProductResponse, 'title' | 'tagline' | 'price' | 'discountPercentage' | 'stockQuantity' | 'image1Url'> & Partial<ProductGstFields> & {
    specifications?: unknown[] | null;
    categoryName?: string | null;
    category?: { name: string } | null;
    components?: { itemId: number; itemName: string; quantity: number }[] | null;
    warranties?: { title: string; warrantyType: string; durationValue: number; durationUnit: string; isActive?: boolean }[] | null;
    accessory?: boolean;
    accessoryFor?: AccessoryLinkResponse[] | null;
  }
): ProductApprovalSnapshot => ({
  title: product.title,
  tagline: product.tagline ?? null,
  categoryName: product.categoryName ?? product.category?.name ?? null,
  price: Number(product.price),
  discountPercentage: product.discountPercentage ?? null,
  hsnSac: product.hsnSac ?? null,
  gstRate: product.gstRate ?? null,
  stockQuantity: Number(product.stockQuantity ?? 0),
  image1Url: product.image1Url ?? null,
  components: (product.components ?? []).map((c) => ({ itemId: c.itemId, itemName: c.itemName, quantity: Number(c.quantity) })),
  warranties: (product.warranties ?? []).map((w) => ({
    title: w.title,
    warrantyType: w.warrantyType,
    durationValue: Number(w.durationValue),
    durationUnit: w.durationUnit,
    isActive: w.isActive !== false,
  })),
  specificationCount: (product.specifications ?? []).length,
  accessoryParents: product.accessory
    ? (product.accessoryFor ?? []).map((link) => ({
        productId: link.productId,
        title: link.title,
        bundleDiscountPercentage: Number(link.bundleDiscountPercentage),
      }))
    : [],
});

/**
 * Snapshot straight from a create/update request (before the server has returned the product). `titleOf` names
 * the accessory's parents; a request that leaves the accessory settings untouched gives no `accessoryParents`.
 */
export const snapshotFromRequest = (
  payload: CreateProductRequest | UpdateProductRequest,
  titleOf: (productId: number) => string | undefined = () => undefined
): ProductApprovalSnapshot => {
  const snapshot = buildApprovalSnapshot({
    title: payload.title ?? '',
    tagline: payload.tagline ?? null,
    categoryName: payload.categoryName ?? null,
    price: Number(payload.price ?? 0),
    discountPercentage: payload.discountPercentage ?? null,
    hsnSac: payload.hsnSac ?? null,
    gstRate: payload.gstRate ?? null,
    stockQuantity: Number(payload.stockQuantity ?? 0),
    image1Url: payload.image1Url ?? null,
    specifications: payload.specifications ?? [],
    components: payload.components ?? [],
    warranties: payload.warranties ?? [],
    accessory: payload.accessory,
    accessoryFor: (payload.accessoryParents ?? []).map((parent) => ({
      productId: parent.parentProductId,
      title: titleOf(parent.parentProductId) ?? `Product #${parent.parentProductId}`,
      bundleDiscountPercentage: parent.bundleDiscountPercentage,
    })),
  });
  if (payload.accessory === undefined) delete snapshot.accessoryParents;
  return snapshot;
};

export const DECISION_REASON_MAX = 500;

/**
 * PUT payload for applying an approved UPDATE request to the live product.
 * Stock keeps moving while the request waits (orders, stock adjustments), so the live stock is kept unless
 * the request itself changed the stock.
 */
export const buildApprovedUpdatePayload = (
  request: Pick<ProductApprovalResponse, 'proposedChanges' | 'previousSnapshot'>,
  live: Pick<ProductResponse, 'stockQuantity'>
): UpdateProductRequest => {
  const changes = request.proposedChanges;
  if (!changes) throw new Error('The approval request has no changes to apply.');
  const stockChanged =
    changes.stockQuantity !== undefined &&
    request.previousSnapshot != null &&
    Number(changes.stockQuantity) !== Number(request.previousSnapshot.stockQuantity);
  return { ...changes, stockQuantity: stockChanged ? Number(changes.stockQuantity) : Number(live.stockQuantity ?? 0) };
};
