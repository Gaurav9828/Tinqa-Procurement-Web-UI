import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { ProductResponseDto } from '../types/product.types';
import type {
  CreateStockDraftRequest,
  StockDraftDetail,
  StockDraftSummary,
  UpdateStockDraftRequest,
} from '../types/stockDraft.types';

/**
 * Ecommerce BE ProductStockDraftController (/api/product-stock-drafts), every route STOREFRONT_STOCK_UPDATE:
 *   GET    /product-stock-drafts             every open draft (one per product at most), newest first
 *   GET    /product-stock-drafts/{id}        one draft with its rows and the product's components
 *   POST   /product-stock-drafts             start a draft (409 STOCK_DRAFT_EXISTS if the product has one)
 *   PUT    /product-stock-drafts/{id}        save it (409 STOCK_DRAFT_STALE, STOCK_DRAFT_BARCODE_TAKEN, BARCODE_NOT_AVAILABLE)
 *   DELETE /product-stock-drafts/{id}        throw it away
 *   POST   /product-stock-drafts/{id}/submit add the stock and close the draft (PATCH /products/{id}/stock's checks)
 */
const BASE_URL = '/product-stock-drafts';

export const stockDraftsApi = {
  list: async (): Promise<ApiResponse<StockDraftSummary[]>> => (await ecommerceAxiosClient.get<ApiResponse<StockDraftSummary[]>>(BASE_URL)).data,

  get: async (id: number): Promise<ApiResponse<StockDraftDetail>> =>
    (await ecommerceAxiosClient.get<ApiResponse<StockDraftDetail>>(`${BASE_URL}/${id}`)).data,

  create: async (payload: CreateStockDraftRequest): Promise<ApiResponse<StockDraftDetail>> =>
    (await ecommerceAxiosClient.post<ApiResponse<StockDraftDetail>>(BASE_URL, payload)).data,

  update: async (id: number, payload: UpdateStockDraftRequest): Promise<ApiResponse<StockDraftDetail>> =>
    (await ecommerceAxiosClient.put<ApiResponse<StockDraftDetail>>(`${BASE_URL}/${id}`, payload)).data,

  remove: async (id: number): Promise<ApiResponse<null>> => (await ecommerceAxiosClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`)).data,

  submit: async (id: number, version: number): Promise<ApiResponse<ProductResponseDto>> =>
    (await ecommerceAxiosClient.post<ApiResponse<ProductResponseDto>>(`${BASE_URL}/${id}/submit`, { version })).data,
};
