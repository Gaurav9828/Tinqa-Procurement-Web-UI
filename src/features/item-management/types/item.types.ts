export interface CategoryResponse {
  id: number;
  name: string;
  description?: string;
  code?: string;
  createdAt?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  code?: string;
}

/** Mirrors the backend enum com.tinqa.procurement.item.enums.WarrantyType. */
export const WARRANTY_TYPES = ['MANUFACTURER', 'SELLER', 'EXTENDED', 'REPLACEMENT', 'SERVICE', 'PARTS', 'LIMITED'] as const;
export type WarrantyType = (typeof WARRANTY_TYPES)[number];

/** Mirrors the backend enum com.tinqa.procurement.item.enums.WarrantyDurationUnit. */
export const WARRANTY_DURATION_UNITS = ['DAYS', 'MONTHS', 'YEARS'] as const;
export type WarrantyDurationUnit = (typeof WARRANTY_DURATION_UNITS)[number];

/**
 * One element of `warranties[]` in item create/update requests (ItemDTOs.WarrantyRequest).
 * `id` only for a warranty that already exists on this item — never on create or for new rows.
 */
export interface ItemWarrantyRequest {
  id?: number;
  warrantyType: WarrantyType;
  /** Required, max 255. */
  title: string;
  /** Whole number > 0. */
  durationValue: number;
  durationUnit: WarrantyDurationUnit;
  /** Who honours it (brand, manufacturer or dealer). Max 255. */
  provider?: string;
  coverage?: string;
  exclusions?: string;
  termsAndConditions?: string;
  /** Defaults to true on the server when omitted. */
  isActive?: boolean;
}

/** ItemDTOs.WarrantyResponse — in `item.warranties[]` and GET /items/{id}/warranties. */
export interface ItemWarrantyResponse {
  id: number;
  itemId: number;
  warrantyType: WarrantyType;
  title: string;
  durationValue: number;
  durationUnit: WarrantyDurationUnit;
  provider?: string | null;
  coverage?: string | null;
  exclusions?: string | null;
  termsAndConditions?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
}

export interface ItemResponse {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  brand?: string;
  sku: string;
  unitOfMeasure: string;
  mrp: number;
  countryOfOrigin: string;
  rawMaterialsUsed?: string;
  termsAndCondition?: string;
  description?: string;
  attributes?: Record<string, string>;
  warranties?: ItemWarrantyResponse[] | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface CreateItemRequest {
  categoryId: number;
  name: string;
  brand?: string;
  sku: string;
  unitOfMeasure: string;
  mrp: number;
  countryOfOrigin: string;
  rawMaterialsUsed?: string;
  termsAndCondition?: string;
  description?: string;
  attributes?: Record<string, string>;
  /** Never include ids on create. */
  warranties?: ItemWarrantyRequest[];
}

export interface UpdateItemRequest {
  categoryId: number;
  name: string;
  brand?: string;
  unitOfMeasure: string;
  mrp: number;
  countryOfOrigin: string;
  rawMaterialsUsed?: string;
  termsAndCondition?: string;
  description?: string;
  attributes?: Record<string, string>;
  /**
   * Omitted = existing warranties untouched. Present = the COMPLETE new set: entries with id are
   * updated, entries without are created, missing ones are deleted ([] removes all).
   */
  warranties?: ItemWarrantyRequest[];
  isActive?: boolean;
}

export interface ItemFilterParams {
  search?: string;
  categoryId?: number;
  page?: number;
  size?: number;
  sort?: string;
}