import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type { ProductCategory } from '../types/product.types';

/** Needs PRODUCT_VIEW. Categories are created with the product itself (categoryName on POST/PUT /products). */
export const productCategoryApi = {
  /** Every category with its product counts, in storefront order. */
  getCategories: async (): Promise<ApiResponse<ProductCategory[]>> =>
    (await ecommerceAxiosClient.get<ApiResponse<ProductCategory[]>>('/admin/product-categories')).data,
};
