import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { ProcessApprovalPayload } from '../../approvals/types/approval.types';
import type {
  CreateStockFromOrderRequest,
  UpdateStockRequest,
  QuantityAdjustmentRequest,
  StockResponse,
} from '../types/stock.types';

const BASE_URL = '/v1/stocks';

export const stockApi = {
  createStockFromOrder: async (
    payload: CreateStockFromOrderRequest
  ): Promise<ApiResponse<StockResponse>> => {
    const response = await axiosClient.post<ApiResponse<StockResponse>>(BASE_URL, payload);
    return response.data;
  },

  updateStock: async (
    id: number,
    payload: UpdateStockRequest
  ): Promise<ApiResponse<StockResponse>> => {
    const response = await axiosClient.put<ApiResponse<StockResponse>>(`${BASE_URL}/${id}`, payload);
    return response.data;
  },

  addStockQuantity: async (
    id: number,
    payload: QuantityAdjustmentRequest
  ): Promise<ApiResponse<StockResponse>> => {
    const response = await axiosClient.post<ApiResponse<StockResponse>>(
      `${BASE_URL}/${id}/add-quantity`,
      payload
    );
    return response.data;
  },

  reduceStockQuantity: async (
    id: number,
    payload: QuantityAdjustmentRequest
  ): Promise<ApiResponse<StockResponse>> => {
    const response = await axiosClient.post<ApiResponse<StockResponse>>(
      `${BASE_URL}/${id}/reduce-quantity`,
      payload
    );
    return response.data;
  },

  processAdminL2Approval: async (
    id: number,
    payload: ProcessApprovalPayload
  ): Promise<ApiResponse<StockResponse>> => {
    const response = await axiosClient.post<ApiResponse<StockResponse>>(
      `${BASE_URL}/${id}/approval`,
      payload
    );
    return response.data;
  },

  getStockById: async (id: number): Promise<ApiResponse<StockResponse>> => {
    const response = await axiosClient.get<ApiResponse<StockResponse>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  getAllStocks: async (): Promise<ApiResponse<StockResponse[]>> => {
    const response = await axiosClient.get<ApiResponse<StockResponse[]>>(BASE_URL);
    return response.data;
  },
};