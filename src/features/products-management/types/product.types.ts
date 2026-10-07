export interface SpecificationDTO {
    specKey: string;
    specValue: string;
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
    createdAt?: string | null;
}