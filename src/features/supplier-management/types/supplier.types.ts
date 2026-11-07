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

export interface CategorySummary {
  id: number;
  name: string;
  code: string;
}

// Supplier Types (SupplierDTOs)
export interface SupplierResponse {
  id: number;
  name: string;
  tradeName?: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  street: string;
  landmark?: string;
  city: string;
  district?: string;
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

export interface CreateSupplierRequest {
  name: string;
  tradeName?: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  street: string;
  landmark?: string;
  city: string;
  district?: string;
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

export interface UpdateSupplierRequest {
  name: string;
  tradeName?: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  street: string;
  landmark?: string;
  city: string;
  district?: string;
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

/** Query of GET /v1/admin/suppliers; every filter is applied by the backend. Empty lists mean "any". */
export interface SupplierFilterParams {
  search?: string;
  categoryIds?: number[];
  cities?: string[];
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}