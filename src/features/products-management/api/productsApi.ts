import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient'
import type { ApiResponse } from '../../../types/common.types';
import type {
    CreateProductRequest,
    ProductResponse,
    UpdateProductRequest,
    UpdateProductStatusRequest,
} from '../types/product.types';

const BASE_URL = '/products'; // Adjust base path matching your Ecommerce_BE controller

export const productApi = {
    createProduct: async (payload: CreateProductRequest): Promise<ApiResponse<ProductResponse>> => {
        const response = await ecommerceAxiosClient.post<ApiResponse<ProductResponse>>(BASE_URL, payload);
        return response.data;
    },

    updateProduct: async (id: number, payload: UpdateProductRequest): Promise<ApiResponse<ProductResponse>> => {
        const response = await ecommerceAxiosClient.put<ApiResponse<ProductResponse>>(`${BASE_URL}/${id}`, payload);
        return response.data;
    },

    updateProductStatus: async (id: number, payload: UpdateProductStatusRequest): Promise<ApiResponse<ProductResponse>> => {
        const response = await ecommerceAxiosClient.patch<ApiResponse<ProductResponse>>(`${BASE_URL}/${id}/status`, payload);
        return response.data;
    },

    getProductById: async (id: number): Promise<ApiResponse<ProductResponse>> => {
        const response = await ecommerceAxiosClient.get<ApiResponse<ProductResponse>>(`${BASE_URL}/${id}`);
        return response.data;
    },

    getAllProducts: async (): Promise<ApiResponse<ProductResponse[]>> => {
        const response = await ecommerceAxiosClient.get<ApiResponse<ProductResponse[]>>(BASE_URL);
        return response.data;
    },

    deleteProduct: async (id: number): Promise<ApiResponse<void>> => {
        const response = await ecommerceAxiosClient.delete<ApiResponse<void>>(`${BASE_URL}/${id}`);
        return response.data;
    },
};