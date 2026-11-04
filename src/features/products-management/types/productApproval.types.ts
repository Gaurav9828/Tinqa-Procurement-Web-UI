// Admin L2 approval for products. Requests live in the Procurement backend (/v1/product-approvals);
// the product itself lives in the Ecommerce backend and stays inactive until approved.
// Contract: docs/backend-prompts/product-approval-workflow.md (create) and product-update-approval.md (updates)

import type { ProductGstFields, UpdateProductRequest } from './product.types';
import type { NewProductUnit } from '../../barcodes/types/barcode.types';

export type ProductApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ProductApprovalDecision = Exclude<ProductApprovalStatus, 'PENDING'>;

/** What the reviewer sees: a copy of the product as submitted (the Ecommerce product may change later). */
export interface ProductApprovalSnapshot extends Partial<ProductGstFields> {
  title: string;
  /** The version's own model name; absent on snapshots taken before model names existed. */
  modelName?: string | null;
  tagline?: string | null;
  /** The software it runs and its version; absent without software and on snapshots taken before it was recorded. */
  softwareName?: string | null;
  softwareVersion?: string | null;
  /** Absent on snapshots taken before categories existed. */
  categoryName?: string | null;
  price: number;
  discountPercentage?: number | null;
  stockQuantity: number;
  image1Url?: string | null;
  components: { itemId: number; itemName: string; quantity: number }[];
  warranties: { title: string; warrantyType: string; durationValue: number; durationUnit: string; isActive: boolean }[];
  specificationCount: number;
  /** Accessory: the products it is offered with. Empty / absent: not an accessory. */
  accessoryParents?: { productId: number; title?: string | null; bundleDiscountPercentage: number }[];
  /** One unit's cost and profit at the submitted price. Absent when the submitter can't see costs. */
  costSummary?: ProductCostSummary | null;
}

/** Rupees, GST excluded (Procurement ProductApprovalDTOs.CostSummary). */
export interface ProductCostSummary {
  unitCost: number;
  netRevenue: number;
  /** Negative on a loss. */
  grossProfit: number;
  marginPercent: number | null;
  profitAfterTax: number;
  /** Components entered without a cost (the cost is then understated). */
  componentsWithoutCost: number;
}

/** CREATE / RESUBMISSION: the product goes live. UPDATE: changes to an approved product. */
export type ProductApprovalRequestType = 'CREATE' | 'RESUBMISSION' | 'UPDATE';

/** One changed field of an UPDATE request, as shown to the reviewer. */
export interface ProductChangeSummary {
  label: string;
  oldValue: string;
  newValue: string;
}

export interface SubmitProductApprovalRequest {
  /** Id of the product in the Ecommerce backend. */
  ecommerceProductId: number;
  productTitle: string;
  /** For UPDATE: the product as it will look once the changes are applied. */
  snapshot: ProductApprovalSnapshot;
  /** 'UPDATE' for changes to an approved product. Omitted: the backend picks CREATE or RESUBMISSION. */
  requestType?: 'UPDATE';
  /** UPDATE only: the full PUT /products/{id} payload, applied to the Ecommerce product once approved. */
  proposedChanges?: UpdateProductRequest;
  /** UPDATE only: the live product when the update was requested. */
  previousSnapshot?: ProductApprovalSnapshot;
  /** UPDATE only: what changed, for the reviewer. */
  changeSummary?: ProductChangeSummary[];
  /**
   * Resubmission only: one per unit in stock, each with its barcode and its pieces' barcodes (the rejection gave the
   * earlier ones back).
   */
  units?: NewProductUnit[];
}

export interface ProductApprovalDecisionRequest {
  decision: ProductApprovalDecision;
  /** Required for REJECTED and CANCELLED (max 500). */
  reason?: string;
}

export interface ProductApprovalResponse {
  id: number;
  ecommerceProductId: number;
  productTitle: string;
  /** CREATE for the first request of a product, RESUBMISSION after a rejection, UPDATE for changes to an approved product. */
  requestType: ProductApprovalRequestType;
  status: ProductApprovalStatus;
  snapshot: ProductApprovalSnapshot;
  requestedBy: number | null;
  requestedByUsername: string | null;
  requestedAt: string;
  decidedBy: number | null;
  decidedByUsername: string | null;
  decidedAt: string | null;
  /** Reason given with REJECTED / CANCELLED. */
  decisionReason: string | null;
  /** UPDATE only (null otherwise). */
  proposedChanges?: UpdateProductRequest | null;
  previousSnapshot?: ProductApprovalSnapshot | null;
  changeSummary?: ProductChangeSummary[] | null;
  /** UPDATE only: when the approved changes were written to the Ecommerce product (null = not yet). */
  appliedAt?: string | null;
  appliedBy?: number | null;
}
