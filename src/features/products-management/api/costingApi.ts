import { axiosClient } from '../../../api/axiosClient';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { CostingSettings, ItemCost, OrderProfit, ProductProfit, ProfitSummary } from '../types/costing.types';

/** Every call needs PRODUCT_COST_VIEW. Costs are written with the product itself (POST/PUT /products). */
export const costingApi = {
  getSettings: async (): Promise<ApiResponse<CostingSettings>> =>
    (await ecommerceAxiosClient.get<ApiResponse<CostingSettings>>('/admin/costing/settings')).data,

  /** Cost sheet + profit on the product's delivered orders. */
  getProductProfit: async (productId: number): Promise<ApiResponse<ProductProfit>> =>
    (await ecommerceAxiosClient.get<ApiResponse<ProductProfit>>(`/admin/costing/products/${productId}`)).data,

  /** Per product, delivered orders placed in [from, to] (yyyy-mm-dd). */
  getProfitSummary: async (from: string, to: string): Promise<ApiResponse<ProfitSummary>> =>
    (await ecommerceAxiosClient.get<ApiResponse<ProfitSummary>>('/admin/costing/products', { params: { from, to } })).data,

  getOrderProfit: async (orderNumber: string): Promise<ApiResponse<OrderProfit>> =>
    (await ecommerceAxiosClient.get<ApiResponse<OrderProfit>>(`/admin/costing/orders/${encodeURIComponent(orderNumber)}`)).data,

  /** Procurement: landed purchase cost of one unit of an item. */
  getItemCost: async (itemId: number): Promise<ApiResponse<ItemCost>> =>
    (await axiosClient.get<ApiResponse<ItemCost>>(`/v1/stocks/items/${itemId}/cost`)).data,
};
