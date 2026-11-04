import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient'
import type { ApiResponse } from '../../../types/common.types';
import type {
    CreateProductRequest,
    ProductResponse,
    ProductResponseDto,
    UpdateProductRequest,
    UpdateProductStatusRequest,
} from '../types/product.types';
import { toProduct } from '../utils/productMapper';
import type { DescriptionReference } from '../utils/descriptionSuggestions';

/**
 * Ecommerce BE ProductController (/api/products) supports exactly:
 *   GET    /products              all products (admin list, incl. disabled)
 *   GET    /products/active       enabled products only
 *   POST   /products              create             (ADMIN_L1/L2)
 *   PUT    /products/{id}         full update        (ADMIN_L1/L2)
 *   PATCH  /products/{id}/status  { isEnabled }      (ADMIN_L1/L2)
 *   PUT    /products/display-order { productIds }   storefront order (PRODUCT_PUBLISH)
 *   POST   /products/{id}/new-version  copy a submitted product into a new draft version (PRODUCT_CREATE)
 *   GET    /products/description-reference?subject=  Wikipedia facts for description suggestions (PRODUCT_VIEW)
 * There is no GET or DELETE on /products/{id} — calling them returns 405 METHOD_NOT_ALLOWED.
 */
const BASE_URL = '/products';

export const productApi = {
    /** Returns the created product (the backend responds with it, including its new id). */
    createProduct: async (payload: CreateProductRequest): Promise<ApiResponse<ProductResponseDto | null>> => {
        const response = await ecommerceAxiosClient.post<ApiResponse<ProductResponseDto | null>>(BASE_URL, payload);
        return response.data;
    },

    updateProduct: async (id: number, payload: UpdateProductRequest): Promise<ApiResponse<unknown>> => {
        const response = await ecommerceAxiosClient.put<ApiResponse<unknown>>(`${BASE_URL}/${id}`, payload);
        return response.data;
    },

    updateProductStatus: async (id: number, payload: UpdateProductStatusRequest): Promise<ApiResponse<unknown>> => {
        const response = await ecommerceAxiosClient.patch<ApiResponse<unknown>>(`${BASE_URL}/${id}/status`, payload);
        return response.data;
    },

    /**
     * Copies a product (components, warranties, costs, specs...) into a new draft, Version N+1, whose components can be
     * changed. Turning the new version on later turns this one off.
     */
    createNewVersion: async (id: number): Promise<ApiResponse<ProductResponseDto | null>> => {
        const response = await ecommerceAxiosClient.post<ApiResponse<ProductResponseDto | null>>(`${BASE_URL}/${id}/new-version`);
        return response.data;
    },

    /**
     * Shows these products in this order (e.g. one category's, first to last). They swap the positions they already
     * hold, so other products keep theirs. GET /products and /products/active list products in this order.
     */
    reorderProducts: async (productIds: number[]): Promise<ApiResponse<unknown>> => {
        const response = await ecommerceAxiosClient.put<ApiResponse<unknown>>(`${BASE_URL}/display-order`, { productIds });
        return response.data;
    },

    /** GET /products, normalised to the UI model (specs/userGuide → specifications, etc.). */
    getAllProducts: async (): Promise<ApiResponse<ProductResponse[]>> => {
        const response = await ecommerceAxiosClient.get<ApiResponse<ProductResponseDto[]>>(BASE_URL);
        const body = response.data;
        return { ...body, data: Array.isArray(body.data) ? body.data.map(toProduct) : [] };
    },

    /** GET /products/active (public): the products on sale now, in storefront order. */
    getActiveProducts: async (): Promise<ProductResponse[]> => {
        const response = await ecommerceAxiosClient.get<ApiResponse<ProductResponseDto[]>>(`${BASE_URL}/active`);
        return Array.isArray(response.data.data) ? response.data.data.map(toProduct) : [];
    },

    /**
     * One product, read from the list endpoint (the backend has no product-detail route).
     * Resolves to null when the product no longer exists.
     */
    findProductById: async (id: number): Promise<ProductResponse | null> => {
        const res = await productApi.getAllProducts();
        if (!res.success) throw new Error(res.message || 'Failed to load products.');
        return res.data.find((product) => product.id === id) ?? null;
    },

    /**
     * Facts about what a miniature shows (e.g. "Kedarnath"), from a free Wikipedia lookup the backend makes and caches.
     * Null when nothing was found. Only called when the specialist asks for suggestions.
     */
    getDescriptionReference: async (subject: string): Promise<DescriptionReference | null> => {
        const response = await ecommerceAxiosClient.get<ApiResponse<DescriptionReference | null>>(`${BASE_URL}/description-reference`, {
            params: { subject },
        });
        return response.data.data ?? null;
    },
};
