import { axiosClient } from '../../../api/axiosClient';
import type {
  CategoryResponse,
  CreateCategoryRequest,
  CreateDealerRequest,
  DealerFilterParams,
  DealerResponse,
  UpdateDealerRequest,
} from '../types/dealer.types';
import type { ApiResponse, PageableResponse } from '../../../types/common.types';

const BASE_URL = '/v1/admin/dealers';

export const dealerApi = {
  // Categories
  createCategory: async (
    payload: CreateCategoryRequest
  ): Promise<ApiResponse<CategoryResponse>> => {
    const response = await axiosClient.post<ApiResponse<CategoryResponse>>(
      `${BASE_URL}/categories`,
      payload
    );
    return response.data;
  },

  getAllCategories: async (): Promise<ApiResponse<CategoryResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<CategoryResponse[]>>(
      `${BASE_URL}/categories`
    );
    return response.data;
  },

  // Dealer Operations
  createDealer: async (
    payload: CreateDealerRequest
  ): Promise<ApiResponse<DealerResponse>> => {
    const response = await axiosClient.post<ApiResponse<DealerResponse>>(
      BASE_URL,
      payload
    );
    return response.data;
  },

  updateDealer: async (
    id: number,
    payload: UpdateDealerRequest
  ): Promise<ApiResponse<DealerResponse>> => {
    const response = await axiosClient.put<ApiResponse<DealerResponse>>(
      `${BASE_URL}/${id}`,
      payload
    );
    return response.data;
  },

  getDealerById: async (id: number): Promise<ApiResponse<DealerResponse>> => {
    const response = await axiosClient.get<ApiResponse<DealerResponse>>(
      `${BASE_URL}/${id}`
    );
    return response.data;
  },

  getAllDealers: async (
    params: DealerFilterParams
  ): Promise<ApiResponse<PageableResponse<DealerResponse>>> => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sort) queryParams.append('sort', params.sort);

    const response = await axiosClient.get<ApiResponse<PageableResponse<DealerResponse>>>(
      `${BASE_URL}?${queryParams.toString()}`
    );
    return response.data;
  },

  deleteDealer: async (id: number): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  toggleDealerStatus: async (id: number): Promise<ApiResponse<DealerResponse>> => {
    const response = await axiosClient.patch<ApiResponse<DealerResponse>>(
      `${BASE_URL}/${id}/toggle-status`
    );
    return response.data;
  },

  // Category Mappings
  assignCategories: async (
    dealerId: number,
    categoryIds: number[]
  ): Promise<ApiResponse<DealerResponse>> => {
    const response = await axiosClient.post<ApiResponse<DealerResponse>>(
      `${BASE_URL}/${dealerId}/categories`,
      categoryIds
    );
    return response.data;
  },

  updateDealerCategories: async (
    dealerId: number,
    categoryIds: number[]
  ): Promise<ApiResponse<DealerResponse>> => {
    const response = await axiosClient.put<ApiResponse<DealerResponse>>(
      `${BASE_URL}/${dealerId}/categories`,
      categoryIds
    );
    return response.data;
  },

  removeCategoryFromDealer: async (
    dealerId: number,
    categoryId: number
  ): Promise<ApiResponse<DealerResponse>> => {
    const response = await axiosClient.delete<ApiResponse<DealerResponse>>(
      `${BASE_URL}/${dealerId}/categories/${categoryId}`
    );
    return response.data;
  },
};