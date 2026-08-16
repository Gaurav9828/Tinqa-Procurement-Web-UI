export interface CategoryResponse {
  id: number;
  name: string;
  description?: string;
  code?: string;
  createdAt?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  code?: string;
}

export interface ItemResponse {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  brand?: string;
  sku: string;
  unitOfMeasure: string;
  mrp: number;
  countryOfOrigin: string;
  rawMaterialsUsed?: string;
  warrantyMonths?: number;
  termsAndCondition?: string;
  description?: string;
  attributes?: Record<string, string>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface CreateItemRequest {
  categoryId: number;
  name: string;
  brand?: string;
  sku: string;
  unitOfMeasure: string;
  mrp: number;
  countryOfOrigin: string;
  rawMaterialsUsed?: string;
  warrantyMonths?: number;
  termsAndCondition?: string;
  description?: string;
  attributes?: Record<string, string>;
}

export interface UpdateItemRequest {
  categoryId: number;
  name: string;
  brand?: string;
  unitOfMeasure: string;
  mrp: number;
  countryOfOrigin: string;
  rawMaterialsUsed?: string;
  warrantyMonths?: number;
  termsAndCondition?: string;
  description?: string;
  attributes?: Record<string, string>;
  isActive?: boolean;
}

export interface PageableResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  empty: boolean;
}

export interface ItemFilterParams {
  search?: string;
  categoryId?: number;
  page?: number;
  size?: number;
  sort?: string;
}