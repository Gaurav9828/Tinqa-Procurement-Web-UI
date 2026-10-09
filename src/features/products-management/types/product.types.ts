export interface SpecificationDTO {
    specKey: string;
    specValue: string;
}

export type ProductWarrantyType = 'MANUFACTURER' | 'SELLER' | 'EXTENDED' | 'REPLACEMENT' | 'SERVICE' | 'PARTS' | 'LIMITED';
export type ProductWarrantyDurationUnit = 'DAYS' | 'MONTHS' | 'YEARS';

/** Backend limits for product warranty text (ProductRequestDTO.WarrantyDTO). */
export const WARRANTY_TEXT_MAX = 20000;

/**
 * One product-level warranty in POST/PUT /products (same field set as component warranties).
 * Omit `id` on create (the backend rejects it). On update an item with `id` updates that warranty,
 * one without creates it, and any existing warranty missing from the list is deleted.
 */
export interface WarrantyRequest {
    id?: number;
    warrantyType: ProductWarrantyType;
    /** Required, max 255. */
    title: string;
    /** Whole number > 0. */
    durationValue: number;
    durationUnit: ProductWarrantyDurationUnit;
    /** Optional, max 255. Blank values are omitted. */
    provider?: string;
    /** Optional, max 20000 each (plain text). */
    coverage?: string;
    exclusions?: string;
    termsAndConditions?: string;
    /** Defaults to true on the server when omitted. */
    isActive?: boolean;
}

/** Warranty as returned by GET /products and the create/update/status responses (inactive ones included). */
export interface WarrantyResponse {
    id: number;
    warrantyType: ProductWarrantyType;
    title: string;
    durationValue: number;
    durationUnit: ProductWarrantyDurationUnit;
    provider?: string | null;
    coverage?: string | null;
    exclusions?: string | null;
    termsAndConditions?: string | null;
    isActive: boolean;
    /** ISO-8601 with offset, e.g. "2026-10-08T09:15:00Z". */
    createdAt?: string | null;
    updatedAt?: string | null;
    /** Numeric admin ids; may be null/absent. */
    createdBy?: number | null;
    updatedBy?: number | null;
}

/**
 * Copy of one of an item's warranties, stored with the product (component-level warranty).
 * Field names follow the Procurement item warranty so a snapshot is a straight copy.
 */
export interface ComponentWarrantySnapshot {
    /** Procurement item warranty it was copied from (traceability only). */
    sourceWarrantyId?: number | null;
    warrantyType: string;
    title: string;
    durationValue: number;
    durationUnit: string;
    provider?: string | null;
    coverage?: string | null;
    exclusions?: string | null;
    termsAndConditions?: string | null;
}

/** One item (Procurement) the product is built from, in POST/PUT /products. */
export interface ProductComponentRequest {
    itemId: number;
    itemName: string;
    itemSku?: string;
    /** > 0, at most 3 decimals. */
    quantity: number;
    /** Snapshot of the item's active warranties; may be empty. */
    warranties: ComponentWarrantySnapshot[];
}

/** Component as returned by the admin product endpoints (snapshot taken when the product was saved). */
export interface ProductComponentResponse {
    id: number;
    itemId: number;
    itemName: string;
    itemSku?: string | null;
    quantity: number;
    warranties: (ComponentWarrantySnapshot & { id: number })[];
    createdAt?: string | null;
    createdBy?: string | null;
}

export interface CreateProductRequest {
    title: string;
    tagline?: string;
    description?: string;
    price: number;
    discountPercentage?: number;
    image1Url?: string;
    image2Url?: string;
    image3Url?: string;
    image4Url?: string;
    image5Url?: string;
    enabled: boolean;
    stockQuantity: number;
    lastUpdateDescription?: string;
    specifications?: SpecificationDTO[];
    /**
     * Update semantics: key omitted = warranties untouched, [] = delete all, otherwise the full list.
     * Never include it unless the full current list is being sent.
     */
    warranties?: WarrantyRequest[];
    /**
     * Items + their warranty snapshots. Update semantics: key omitted = untouched, otherwise the
     * list replaces every component ([] removes all).
     */
    components?: ProductComponentRequest[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> { }

// Add this interface to resolve the import error
export interface UpdateProductStatusRequest {
    isEnabled: boolean;
}

/**
 * Raw product as returned by GET /api/products (Ecommerce BE ProductResponseDto).
 * Note the read shape differs from the write shape: specifications come back split into
 * `specs` and `userGuide`, and the update note as `last_update_description`.
 * Use `toProduct()` (utils/productMapper) — components work with `ProductResponse`.
 */
export interface ProductResponseDto {
    id: number;
    title: string;
    tagline?: string | null;
    description?: string | null;
    price: number;
    discountPercentage?: number | null;
    image1Url?: string | null;
    image2Url?: string | null;
    image3Url?: string | null;
    image4Url?: string | null;
    image5Url?: string | null;
    enabled: boolean;
    stockQuantity: number | null;
    last_update_description?: string | null;
    /** Tolerated if a future backend version returns the camelCase name. */
    lastUpdateDescription?: string | null;
    createdAt?: string | null;
    specs?: { label: string; value: string }[] | null;
    userGuide?: { title: string; content: string[] | null }[] | null;
    /** Tolerated if a future backend version returns the write shape directly. */
    specifications?: SpecificationDTO[] | null;
    warranties?: WarrantyResponse[] | null;
    components?: ProductComponentResponse[] | null;
}

/** UI product model (normalised from ProductResponseDto by toProduct()). */
export interface ProductResponse {
    id: number;
    title: string;
    tagline: string | null;
    description: string | null;
    price: number;
    discountPercentage: number | null;
    image1Url: string | null;
    image2Url: string | null;
    image3Url: string | null;
    image4Url: string | null;
    image5Url: string | null;
    enabled: boolean;
    stockQuantity: number;
    lastUpdateDescription: string | null;
    /** Write-shape specifications (including "Guide - …" user-guide rows), ready to send back on update. */
    specifications: SpecificationDTO[];
    /** All warranties, including inactive ones (admin list). */
    warranties: WarrantyResponse[];
    /** Items the product is built from, with their component-level warranties. */
    components: ProductComponentResponse[];
    createdAt?: string | null;
}