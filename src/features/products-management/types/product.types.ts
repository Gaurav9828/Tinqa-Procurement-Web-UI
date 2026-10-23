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
    /**
     * Cost of one unit of the item excluding GST (needs PRODUCT_COST_EDIT). Omitted: the item keeps the cost it already
     * has on the product.
     */
    unitCost?: number;
}

/** Limits of an extra cost (Ecommerce BE ProductRequestDTO.CostEntryDTO). */
export const COST_ENTRIES_MAX = 30;
export const COST_LABEL_MAX = 100;
export const COST_REASON_MAX = 1000;

/** An extra cost of one product unit (manpower, software...), with how it was worked out. */
export interface CostEntryRequest {
    label: string;
    /** Per product unit, excluding GST: ≥ 0, at most 2 decimals. */
    amount: number;
    description?: string;
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

/**
 * GST included in the product price (Ecommerce BE). Each order charges the rate as CGST + SGST (delivered in our
 * state) or IGST (another state). Both are required on create/update; null only on products created before GST
 * was recorded. See utils/productTax.
 */
export interface ProductGstFields {
    /** HSN (goods) / SAC (services) code printed on the invoice: 4, 6 or 8 digits. */
    hsnSac: string | null;
    /** Percent: one of GST_RATES (utils/productTax). */
    gstRate: number | null;
}

/** Most extra discount an accessory can get with a parent (Ecommerce BE ProductRequestDTO.AccessoryParentDTO). */
export const BUNDLE_DISCOUNT_MAX = 90;
/** Ecommerce BE limits for the accessory text (ProductSecurityValidator). */
export const ACCESSORY_PURPOSE_MAX = 1000;
export const ACCESSORY_BENEFITS_MAX = 10;
export const ACCESSORY_BENEFIT_MAX = 200;

/** A product the accessory is offered with, in POST/PUT /products. */
export interface AccessoryParentRequest {
    parentProductId: number;
    /** Extra percent off the accessory when bought with this parent: 0–90, at most 2 decimals. 0 = no extra discount. */
    bundleDiscountPercentage: number;
}

/** One accessory–parent link as returned by the backend; `productId` is the product on the other side. */
export interface AccessoryLinkResponse {
    productId: number;
    title: string;
    bundleDiscountPercentage: number;
}

/**
 * Accessory settings. Update semantics: `accessory` omitted = all of them untouched; false = not an accessory
 * (its parent links are removed); true = an accessory offered with `accessoryParents` (at least one), which
 * replace the current ones.
 */
export interface AccessoryFields {
    accessory?: boolean;
    /** Why the customer needs it / what it does (max 1000). */
    accessoryPurpose?: string;
    /** Benefit bullet points (max 10, each max 200, single line). */
    accessoryBenefits?: string[];
    accessoryParents?: AccessoryParentRequest[];
}

/** Ecommerce BE limit for a category name (ProductCategoryService.NAME_MAX). */
export const CATEGORY_NAME_MAX = 60;

/**
 * A product category (Ecommerce BE ProductCategoryDTO). Not a fixed list: a new name typed on the product form
 * creates one. The counts come only from GET /admin/product-categories.
 */
export interface ProductCategory {
    id: number;
    name: string;
    /** URL-safe key; names with the same slug are the same category (see utils/productCategory). */
    slug: string;
    sortOrder: number;
    productCount?: number;
    activeProductCount?: number;
}

export interface CreateProductRequest extends Partial<ProductGstFields>, AccessoryFields {
    title: string;
    /**
     * An existing category's name (matched ignoring case, spacing and punctuation) or a new one, which the backend
     * creates. Required on create; on update omitted = the category stays as it is.
     */
    categoryName?: string;
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
    /**
     * Extra costs (needs PRODUCT_COST_EDIT). Update semantics: key omitted = untouched, otherwise the list replaces
     * them ([] removes all).
     */
    costEntries?: CostEntryRequest[];
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
    /** Null only if the category row is missing. */
    category?: ProductCategory | null;
    description?: string | null;
    price: number;
    discountPercentage?: number | null;
    hsnSac?: string | null;
    gstRate?: number | null;
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
    /** Average of active reviews (0.0 when there are none). */
    averageRating?: number | null;
    /** Number of active reviews. */
    reviewCount?: number | null;
    accessory?: boolean | null;
    accessoryPurpose?: string | null;
    accessoryBenefits?: string[] | null;
    /** Accessory: the products it is offered with (admin view: disabled ones included). */
    accessoryFor?: AccessoryLinkResponse[] | null;
    /** Parent: the accessories offered with it. */
    accessories?: AccessoryLinkResponse[] | null;
}

/** UI product model (normalised from ProductResponseDto by toProduct()). */
export interface ProductResponse extends Partial<ProductGstFields> {
    id: number;
    title: string;
    tagline: string | null;
    /** Null only if the category row is missing. */
    category?: ProductCategory | null;
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
    averageRating: number;
    reviewCount: number;
    /** Also offered with the products in `accessoryFor`, each at an extra bundle discount. */
    accessory: boolean;
    accessoryPurpose: string | null;
    accessoryBenefits: string[];
    accessoryFor: AccessoryLinkResponse[];
    /** Accessories offered with this product. */
    accessories: AccessoryLinkResponse[];
}