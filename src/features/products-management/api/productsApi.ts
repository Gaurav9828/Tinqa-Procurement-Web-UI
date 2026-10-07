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

/**
 * Ecommerce BE ProductController (/api/products) supports exactly:
 *   GET    /products              all products (admin list, incl. disabled)
 *   GET    /products/active       enabled products only
 *   POST   /products              create             (ADMIN_L1/L2)
 *   PUT    /products/{id}         full update        (ADMIN_L1/L2)
 *   PATCH  /products/{id}/status  { isEnabled }      (ADMIN_L1/L2)
 * There is no GET or DELETE on /products/{id} — calling them returns 405 METHOD_NOT_ALLOWED.
 */
const BASE_URL = '/products';

export const productApi = {
    createProduct: async (payload: CreateProductRequest): Promise<ApiResponse<unknown>> => {
        const response = await ecommerceAxiosClient.post<ApiResponse<unknown>>(BASE_URL, payload);
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

    /** GET /products, normalised to the UI model (specs/userGuide → specifications, etc.). */
    getAllProducts: async (): Promise<ApiResponse<ProductResponse[]>> => {
        const response = await ecommerceAxiosClient.get<ApiResponse<ProductResponseDto[]>>(BASE_URL);
        const body = response.data;
        return { ...body, data: Array.isArray(body.data) ? body.data.map(toProduct) : [] };
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
};
