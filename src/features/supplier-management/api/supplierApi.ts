import { axiosClient } from '../../../api/axiosClient';
import type {
  CategoryResponse,
  CreateSupplierRequest,
  SupplierFilterParams,
  SupplierResponse,
  UpdateSupplierRequest,
} from '../types/supplier.types';
import type { ApiResponse, PageableResponse } from '../../../types/common.types';

const BASE_URL = '/v1/admin/suppliers';

export const supplierApi = {
  /** The item categories, to assign to suppliers (needs only SUPPLIER_VIEW). */
  getAllCategories: async (): Promise<ApiResponse<CategoryResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<CategoryResponse[]>>(
      `${BASE_URL}/categories`
    );
    return response.data;
  },

  // Supplier Operations
  createSupplier: async (
    payload: CreateSupplierRequest
  ): Promise<ApiResponse<SupplierResponse>> => {
    const response = await axiosClient.post<ApiResponse<SupplierResponse>>(
      BASE_URL,
      payload
    );
    return response.data;
  },

  updateSupplier: async (
    id: number,
    payload: UpdateSupplierRequest
  ): Promise<ApiResponse<SupplierResponse>> => {
    const response = await axiosClient.put<ApiResponse<SupplierResponse>>(
      `${BASE_URL}/${id}`,
      payload
    );
    return response.data;
  },

  getSupplierById: async (id: number): Promise<ApiResponse<SupplierResponse>> => {
    const response = await axiosClient.get<ApiResponse<SupplierResponse>>(
      `${BASE_URL}/${id}`
    );
    return response.data;
  },

  getAllSuppliers: async (
    params: SupplierFilterParams
  ): Promise<ApiResponse<PageableResponse<SupplierResponse>>> => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    params.categoryIds?.forEach((id) => queryParams.append('categoryId', id.toString()));
    params.cities?.forEach((city) => queryParams.append('city', city));
    if (params.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sort) queryParams.append('sort', params.sort);

    const response = await axiosClient.get<ApiResponse<PageableResponse<SupplierResponse>>>(
      `${BASE_URL}?${queryParams.toString()}`
    );
    return response.data;
  },

  /** GET /v1/admin/suppliers/cities — distinct supplier cities, for the list filter. */
  getSupplierCities: async (): Promise<ApiResponse<string[]>> => {
    const response = await axiosClient.get<ApiResponse<string[]>>(`${BASE_URL}/cities`);
    return response.data;
  },

  deleteSupplier: async (id: number): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  toggleSupplierStatus: async (id: number): Promise<ApiResponse<SupplierResponse>> => {
    const response = await axiosClient.patch<ApiResponse<SupplierResponse>>(
      `${BASE_URL}/${id}/toggle-status`
    );
    return response.data;
  },

  // Category Mappings
  assignCategories: async (
    supplierId: number,
    categoryIds: number[]
  ): Promise<ApiResponse<SupplierResponse>> => {
    const response = await axiosClient.post<ApiResponse<SupplierResponse>>(
      `${BASE_URL}/${supplierId}/categories`,
      categoryIds
    );
    return response.data;
  },

  updateSupplierCategories: async (
    supplierId: number,
    categoryIds: number[]
  ): Promise<ApiResponse<SupplierResponse>> => {
    const response = await axiosClient.put<ApiResponse<SupplierResponse>>(
      `${BASE_URL}/${supplierId}/categories`,
      categoryIds
    );
    return response.data;
  },

  removeCategoryFromSupplier: async (
    supplierId: number,
    categoryId: number
  ): Promise<ApiResponse<SupplierResponse>> => {
    const response = await axiosClient.delete<ApiResponse<SupplierResponse>>(
      `${BASE_URL}/${supplierId}/categories/${categoryId}`
    );
    return response.data;
  },
};