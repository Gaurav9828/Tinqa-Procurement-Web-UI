import type { ApprovalStatus } from '../../../types/common.types';

/** Procurement BarcodeUnitType: a piece of item stock, or a unit of a storefront product. */
export type BarcodeUnitType = 'ITEM_UNIT' | 'PRODUCT_UNIT';

/** Procurement BarcodeStatus. */
export type BarcodeStatus = 'PENDING' | 'IN_STOCK' | 'FITTED' | 'REMOVED' | 'WITHDRAWAL_PENDING' | 'ON_DEMO' | 'VOID';

export type BarcodeEventType =
  | 'REGISTERED'
  | 'APPROVED'
  | 'VOIDED'
  | 'FITTED'
  | 'RETURNED'
  | 'REMOVED'
  | 'WITHDRAWAL_REQUESTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_REJECTED'
  | 'CODE_CORRECTED'
  | 'REVERSED'
  | 'DEMO_HANDED_OUT'
  | 'DEMO_RETURNED';

/** BarcodeDTOs.Unit */
export interface BarcodeUnit {
  id: number;
  code: string;
  unitType: BarcodeUnitType;
  status: BarcodeStatus;
  /** Approved: only a Super Admin can change the code. */
  locked: boolean;
  statusNote: string | null;
  itemId: number | null;
  itemName: string | null;
  itemSku: string | null;
  stockId: number | null;
  stockIdentityNumber: string | null;
  batchNumber: string | null;
  /** A product unit's product, or the product an item unit is fitted into. */
  ecommerceProductId: number | null;
  productTitle: string | null;
  fittedIntoId: number | null;
  fittedIntoCode: string | null;
  createdAt: string;
  createdByName: string | null;
  lockedAt: string | null;
}

/** Where a piece came from: its batch, the purchase order it was received against and the dealer. */
export interface BarcodeSource {
  stockId: number;
  stockIdentityNumber: string;
  batchNumber: string;
  dateOfArrival: string;
  stockApprovalStatus: ApprovalStatus;
  receivedBy: string | null;
  approvedBy: string | null;
  orderNumber: string;
  orderDate: string;
  deliveredOn: string | null;
  dealerId: number;
  dealerName: string;
}

export interface BarcodeEvent {
  eventType: BarcodeEventType;
  fromStatus: BarcodeStatus | null;
  toStatus: BarcodeStatus;
  oldCode: string | null;
  newCode: string | null;
  fittedIntoCode: string | null;
  note: string | null;
  actorName: string | null;
  at: string;
}

export type BarcodeRequestType = 'CORRECTION' | 'ASSIGNMENT';
export type BarcodeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** BarcodeDTOs.RequestResponse */
export interface BarcodeRequest {
  id: number;
  requestType: BarcodeRequestType;
  status: BarcodeRequestStatus;
  barcodeId: number | null;
  currentCode: string | null;
  newCode: string | null;
  unitType: BarcodeUnitType;
  itemName: string | null;
  productTitle: string | null;
  stockId: number | null;
  stockIdentityNumber: string | null;
  batchNumber: string | null;
  unitsWithoutBarcode: number | null;
  codes: string[] | null;
  reason: string;
  requestedBy: number;
  requestedByUsername: string | null;
  requestedAt: string;
  decidedBy: number | null;
  decidedByUsername: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
}

/** BarcodeDTOs.Trace: GET /v1/barcodes/trace/{code} */
export interface BarcodeTrace {
  unit: BarcodeUnit;
  source: BarcodeSource | null;
  fittedInto: BarcodeUnit | null;
  parts: { unit: BarcodeUnit; source: BarcodeSource }[];
  history: BarcodeEvent[];
  requests: BarcodeRequest[];
}

/** A product unit with the pieces fitted into it: GET /v1/barcodes/products/{id} */
export interface ProductUnitBarcodes {
  unit: BarcodeUnit;
  parts: BarcodeUnit[];
}

export type CreateBarcodeRequest =
  | { requestType: 'CORRECTION'; barcodeId: number; newCode: string; reason: string }
  | { requestType: 'ASSIGNMENT'; stockId: number; codes: string[]; reason: string };

export interface BarcodeDecision {
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
}

/**
 * A new product unit as Ecommerce takes it (ProductRequestDTO.ProductUnitDTO): its barcode and, per component item,
 * one piece barcode per unit of the component's quantity.
 */
export interface NewProductUnit {
  barcode: string;
  parts: { itemId: number; barcodes: string[] }[];
}
