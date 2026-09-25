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
    specifications: SpecificationDTO[];
}