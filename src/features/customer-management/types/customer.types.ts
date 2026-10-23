import type { StoreCustomerAddress } from '../../store-sales/types/storeSale.types';

/** A row of GET /admin/customers. */
export interface CustomerSummary {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  /** ACTIVE or DELETED (the customer closed their account). */
  status: string;
  emailVerified: boolean;
  /** The selling agent who registered them at a store; null when they signed up themselves. */
  registeredBy: string | null;
  registeredAt: string;
  orderCount: number;
  /** Sum of their orders paid in full. */
  totalSpent: number;
  lastOrderAt: string | null;
  /** Units waiting in their cart. */
  cartUnits: number;
  lastCartActivityAt: string | null;
}

/** GET /admin/customers/{id}. */
export interface CustomerDetail {
  id: number;
  uuid: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  name: string;
  email: string;
  phoneNumber: string;
  dob: string | null;
  status: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  passwordSetupPending: boolean;
  rewardPoints: number | null;
  registeredBy: string | null;
  registeredAt: string;
  updatedAt: string | null;
  addresses: StoreCustomerAddress[];
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  cartUnits: number;
  cartValue: number;
  lastCartActivityAt: string | null;
  openTicketCount: number;
}

export interface CustomerOrderItem {
  productId: number;
  title: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

/** GET /admin/customers/{id}/orders, newest first. */
export interface CustomerOrder {
  id: number;
  orderNumber: string;
  placedAt: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  /** ONLINE or STORE. */
  salesChannel: string;
  soldByName: string | null;
  totalAmount: number;
  cancellationReason: string | null;
  items: CustomerOrderItem[];
}

/** GET /admin/customers/{id}/cart, most recently added first. */
export interface CustomerCartItem {
  productId: number;
  title: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  /** Listed and in stock: the customer can still order it. */
  available: boolean;
  addedAt: string | null;
}

/** The details a Super Admin edits (PATCH /admin/customers/{id}); empty strings mean "unchanged" except middle name. */
export interface CustomerEditForm {
  firstName: string;
  middleName: string;
  lastName: string;
  phoneNumber: string;
  dob: string;
  reason: string;
}

/** Field names the Procurement change request accepts (CustomerChangeRequest.CustomerField). */
export type CustomerField = 'FIRST_NAME' | 'MIDDLE_NAME' | 'LAST_NAME' | 'PHONE_NUMBER' | 'DOB';

export interface CustomerChangeRequestPayload {
  customerId: number;
  customerName: string;
  changes: Partial<Record<CustomerField, string>>;
  reason: string;
}
