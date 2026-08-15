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
  name: string;
  brand?: string;
  sku: string;
  description?: string;
  categoryId: number;
  categoryName?: string;
  unitOfMeasure: string;
  mrp: number;
  attributes?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemRequest {
  name: string;
  brand?: string;
  sku: string;
  description?: string;
  categoryId: number;
  unitOfMeasure: string;
  mrp: number;
  attributes?: Record<string, any>;
}

export interface UpdateItemRequest {
  name: string;
  brand?: string;
  categoryId: number;
  unitOfMeasure: string;
  mrp: number;
  description?: string;
  attributes?: Record<string, any>;
  isActive: boolean;
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