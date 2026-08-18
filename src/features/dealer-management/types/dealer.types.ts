// Category Types (CategoryDTOs)
export interface CategoryResponse {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryRequest {
  name: string;
  code: string;
  description?: string;
}

export interface CategorySummary {
  id: number;
  name: string;
  code: string;
}

// Dealer Types (DealerDTOs)
export interface DealerResponse {
  id: number;
  name: string;
  tradeName?: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  googleMapsUrl?: string;
  gstin?: string;
  isGstVerified?: boolean;
  panNumber?: string;
  businessSince?: number;
  employeeCount?: number;
  offersShipping?: boolean;
  doesBulkDealing?: boolean;
  doesWholesaleDealing?: boolean;
  categories: CategorySummary[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface CreateDealerRequest {
  name: string;
  tradeName?: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  googleMapsUrl?: string;
  gstin?: string;
  isGstVerified?: boolean;
  panNumber?: string;
  businessSince?: number;
  employeeCount?: number;
  offersShipping?: boolean;
  doesBulkDealing?: boolean;
  doesWholesaleDealing?: boolean;
  categoryIds: number[];
}

export interface UpdateDealerRequest {
  name: string;
  tradeName?: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  googleMapsUrl?: string;
  gstin?: string;
  isGstVerified?: boolean;
  panNumber?: string;
  businessSince?: number;
  employeeCount?: number;
  offersShipping?: boolean;
  doesBulkDealing?: boolean;
  doesWholesaleDealing?: boolean;
  categoryIds: number[];
  isActive?: boolean;
}

export interface DealerFilterParams {
  search?: string;
  categoryId?: number;
  page?: number;
  size?: number;
  sort?: string;
}