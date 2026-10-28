import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
  BarcodeDecision,
  BarcodeRequest,
  BarcodeRequestStatus,
  BarcodeStatus,
  BarcodeTrace,
  BarcodeUnit,
  CreateBarcodeRequest,
  ProductUnitBarcodes,
} from '../types/barcode.types';

const BASE_URL = '/v1/barcodes';

export const barcodeApi = {
  trace: async (code: string): Promise<ApiResponse<BarcodeTrace>> => {
    const response = await axiosClient.get<ApiResponse<BarcodeTrace>>(`${BASE_URL}/trace/${encodeURIComponent(code)}`);
    return response.data;
  },

  /** A stock entry's units (every status). */
  forStock: async (stockId: number): Promise<ApiResponse<BarcodeUnit[]>> => {
    const response = await axiosClient.get<ApiResponse<BarcodeUnit[]>>(BASE_URL, { params: { stockId } });
    return response.data;
  },

  /** An item's units with a status (in stock by default): the pieces a product unit can be built from. */
  forItem: async (itemId: number, status: BarcodeStatus = 'IN_STOCK'): Promise<ApiResponse<BarcodeUnit[]>> => {
    const response = await axiosClient.get<ApiResponse<BarcodeUnit[]>>(BASE_URL, { params: { itemId, status } });
    return response.data;
  },

  /** Every unit of a storefront product, with its parts. */
  forProduct: async (ecommerceProductId: number): Promise<ApiResponse<ProductUnitBarcodes[]>> => {
    const response = await axiosClient.get<ApiResponse<ProductUnitBarcodes[]>>(`${BASE_URL}/products/${ecommerceProductId}`);
    return response.data;
  },

  createRequest: async (payload: CreateBarcodeRequest): Promise<ApiResponse<BarcodeRequest>> => {
    const response = await axiosClient.post<ApiResponse<BarcodeRequest>>(`${BASE_URL}/requests`, payload);
    return response.data;
  },

  getRequests: async (status: BarcodeRequestStatus = 'PENDING'): Promise<ApiResponse<BarcodeRequest[]>> => {
    const response = await axiosClient.get<ApiResponse<BarcodeRequest[]>>(`${BASE_URL}/requests`, { params: { status } });
    return response.data;
  },

  decide: async (id: number, payload: BarcodeDecision): Promise<ApiResponse<BarcodeRequest>> => {
    const response = await axiosClient.patch<ApiResponse<BarcodeRequest>>(`${BASE_URL}/requests/${id}/decision`, payload);
    return response.data;
  },
};
