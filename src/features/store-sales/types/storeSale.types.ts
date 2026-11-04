// Mirrors the Ecommerce BE store-sale DTOs (com.tinqa.ecommerce.dto.store.*).
// A selling agent registers a walk-in customer and books their order. Cash the agent received is booked at once and
// the order confirmed; the customer is emailed the receipt and, when new, a link to set their password.
import type { Gender } from '../../../types/common.types';
import type { OrderItemSummary, OrderPaymentAttempt } from '../../order-tracking/types/orderTracking.types';
import type { BarcodeStatus } from '../../barcodes/types/barcode.types';

/** StoreCustomerDTO.AddressDTO */
export interface StoreCustomerAddress {
  id: number;
  addressType: string | null;
  recipientName: string | null;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  isDefault: boolean | null;
}

/** StoreCustomerDTO — contact details, account state and delivery addresses. */
export interface StoreCustomer {
  id: number;
  name: string;
  email: string;
  phoneNumber: string | null;
  /** The customer proved the address (verification code, or a password link they used). */
  emailVerified?: boolean;
  /** Registered at a store and has not set a password yet: their welcome email has the link. */
  passwordSetupPending?: boolean;
  registeredAt?: string | null;
  addresses: StoreCustomerAddress[];
}

/** UserAddressRequest */
export interface StoreAddressRequest {
  addressType: 'SHIPPING';
  recipientName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** StoreCustomerRequestDTO — the storefront sign-up details (no password: a set-password link is emailed) plus a delivery address. */
export interface StoreCustomerRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  /** "+91 9876543210" */
  phoneNumber: string;
  /** yyyy-MM-dd */
  dob: string;
  /** Empty until the agent picks one. */
  gender: Gender | '';
  address: StoreAddressRequest;
  /** From verifying `email` with the code sent there. */
  emailVerificationToken?: string;
}

/** StoreProductDTO */
export interface StoreProduct {
  id: number;
  title: string;
  imageUrl: string | null;
  listPrice: number;
  discountPercentage: number | null;
  /** After discount, GST included. */
  unitPrice: number;
  stock: number;
  gstRate: number | null;
}

/** The product on a scanned unit's barcode (Procurement GET /v1/store-sales/units/lookup). */
export interface StoreUnit {
  barcode: string;
  productId: number;
  productTitle: string | null;
  status: BarcodeStatus;
  inStock: boolean;
  /** Why the unit isn't on the shelf, when it isn't. */
  note: string | null;
}

export interface StoreSaleLine {
  productId: number;
  quantity: number;
}

/** StoreQuoteDTO */
export interface StoreQuote {
  lines: {
    productId: number;
    title: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    /** Accessory sold with its parent product: the extra discount already taken off lineTotal (0 otherwise). */
    bundleDiscount?: number | null;
    /** Out of stock: booked as a pre-order. */
    preOrder: boolean;
  }[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
}

/** CASH, or an online method the customer pays with from their account. */
export type StorePaymentMethod = 'CASH' | 'UPI';

/** StoreOrderRequestDTO */
export interface StoreOrderRequest {
  customerId: number;
  addressId: number;
  paymentMethod: StorePaymentMethod;
  items: StoreSaleLine[];
  totalAmount: number;
  shippingFee: number;
  notes?: string;
  cashReceiptNumber?: string;
}

/** OrderPaymentResponseDTO (admin view) of a cash payment. */
export type StoreCashPayment = OrderPaymentAttempt;

/** StoreSaleDTO */
export interface StoreSale {
  orderNumber: string;
  createdAt: string;
  orderStatus: string;
  paymentMethod: string;
  /** PAID for cash (received by the agent); PENDING until an online sale is paid. */
  paymentStatus: string;
  totalAmount: number;
  soldBy: string;
  soldByName: string | null;
  customer: { id: number; name: string; phoneNumber: string | null; email: string } | null;
  /** Where the order goes (the address on the order). */
  deliveryAddress?: StoreSaleDeliveryAddress | null;
  items: OrderItemSummary[];
  cash: StoreCashPayment | null;
  /** The customer's order email: PENDING (queued), SENT or FAILED; null when none was queued. */
  customerEmailStatus: 'PENDING' | 'SENT' | 'FAILED' | null;
  customerEmailError?: string | null;
}

/** StoreSaleDTO.DeliveryAddress */
export interface StoreSaleDeliveryAddress {
  recipientName: string | null;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface StoreSaleListParams {
  page: number;
  size: number;
  paymentStatus?: string;
  /** All sales only: one seller's login. */
  soldBy?: string;
}
