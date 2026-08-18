import { axiosClient } from '../../../api/axiosClient';
import type {
  CategoryResponse,
  CreateCategoryRequest,
  CreateItemRequest,
  ItemFilterParams,
  ItemResponse,
  UpdateItemRequest,
} from '../types/item.types';

import type { ApiResponse, PageableResponse } from '../../../types/common.types';

const BASE_URL = '/v1/admin/items';

export const itemApi = {
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

  // Items
  createItem: async (
    payload: CreateItemRequest
  ): Promise<ApiResponse<ItemResponse>> => {
    const response = await axiosClient.post<ApiResponse<ItemResponse>>(
      BASE_URL,
      payload
    );
    return response.data;
  },

  updateItem: async (
    id: number,
    payload: UpdateItemRequest
  ): Promise<ApiResponse<ItemResponse>> => {
    const response = await axiosClient.put<ApiResponse<ItemResponse>>(
      `${BASE_URL}/${id}`,
      payload
    );
    return response.data;
  },

  getItemById: async (id: number): Promise<ApiResponse<ItemResponse>> => {
    const response = await axiosClient.get<ApiResponse<ItemResponse>>(
      `${BASE_URL}/${id}`
    );
    return response.data;
  },

  getItems: async (
    params: ItemFilterParams
  ): Promise<ApiResponse<PageableResponse<ItemResponse>>> => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sort) queryParams.append('sort', params.sort);

    const response = await axiosClient.get<ApiResponse<PageableResponse<ItemResponse>>>(
      `${BASE_URL}?${queryParams.toString()}`
    );
    return response.data;
  },

  deleteItem: async (id: number): Promise<ApiResponse<void>> => {
    const response = await axiosClient.delete<ApiResponse<void>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};