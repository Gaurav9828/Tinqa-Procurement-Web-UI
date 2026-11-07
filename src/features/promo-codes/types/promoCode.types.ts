/** Promo codes (docs/promo-codes.md › Staff). The Ecommerce backend owns them; shapes mirror its DTOs. */

export type PromoScope = 'ALL' | 'SELECTED';

/** What a code takes off each unit it covers: a percentage of the list price, or a fixed amount in rupees. */
export type PromoDiscountType = 'PERCENTAGE' | 'AMOUNT';

/** Worked out on the server: deleted, switched off, before its dates, after them, total uses reached, else active. */
export type PromoStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'USED_UP' | 'DISABLED' | 'DELETED';

/** The values the list's `status` filter takes (empty = all but deleted). USED_UP is shown but not filterable. */
export type PromoStatusFilter = '' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED' | 'DELETED';

/** PromoCodeSummaryDTO: one row of GET /admin/promo-codes. */
export interface PromoCodeSummary {
  id: number;
  /** The whole code, or "TINQA***************" (codeHidden) for a code of chosen customers unless the caller has
   *  PROMO_CODE_MANAGE (docs/promo-codes.md › Who sees a code). */
  code: string;
  codeHidden: boolean;
  description: string | null;
  discountType: PromoDiscountType;
  /** Set for PERCENTAGE, else null. */
  discountPercentage: number | null;
  /** Rupees off each unit, set for AMOUNT, else null. */
  amountOff: number | null;
  customerScope: PromoScope;
  customerCount: number;
  productScope: PromoScope;
  productCount: number;
  /** Product scope ALL: on how many units of each product in one order the promo works; null = every unit. For
   *  SELECTED it is null and each product carries its own `maxUnits` (detail). */
  maxUnitsPerProduct: number | null;
  /** How often one customer may use it; null = no limit. */
  usageLimitPerCustomer: number | null;
  /** How often everyone together may use it; null = no limit. */
  totalUsageLimit: number | null;
  /** YYYY-MM-DD, both days included (India time). */
  startsOn: string;
  expiresOn: string;
  active: boolean;
  /** Customer scope ALL only: shown to every storefront visitor while it can be used. */
  shownOnStorefront: boolean;
  status: PromoStatus;
  /** Orders that were not cancelled. */
  timesUsed: number;
  totalDiscountGiven: number;
  createdBy: string | null;
  /** Server local time (India) without an offset, e.g. 2026-11-04T10:00:00. */
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  /** Set while the code is deleted (status DELETED). */
  deletedBy: string | null;
  deletedAt: string | null;
}

/** A customer as the form picks them. */
export interface PromoCustomerRef {
  id: number;
  name: string;
  email: string;
}

/** A chosen customer in the detail. */
export interface PromoCustomer extends PromoCustomerRef {
  /** How often and when last staff emailed them the code (0 / null: never). */
  timesShared: number;
  lastSharedAt: string | null;
}

export interface PromoProduct {
  id: number;
  title: string;
  /** On how many of its units in one order the promo works; null = every unit. */
  maxUnits: number | null;
}

/** PromoCodeDetailDTO: the row plus who and what it is for (empty lists for scope ALL). */
export interface PromoCodeDetail extends PromoCodeSummary {
  customers: PromoCustomer[];
  products: PromoProduct[];
}

/** One chosen product of the request and its units (null = every unit). */
export interface PromoProductUnits {
  productId: number;
  maxUnits: number | null;
}

/** PromoCodeRequestDTO: the create and edit body. On an edit `code` is the saved one: it never changes. */
export interface PromoCodeRequest {
  code: string;
  description: string;
  discountType: PromoDiscountType;
  /** Only the one matching discountType is sent; the other is null. */
  discountPercentage: number | null;
  amountOff: number | null;
  customerScope: PromoScope;
  customerIds: number[];
  productScope: PromoScope;
  /** Product scope SELECTED only. */
  products: PromoProductUnits[];
  /** Product scope ALL only. */
  maxUnitsPerProduct: number | null;
  usageLimitPerCustomer: number | null;
  totalUsageLimit: number | null;
  startsOn: string;
  expiresOn: string;
  active: boolean;
}

/** PromoRedemptionDTO: one order that used the code, newest first. */
export interface PromoRedemption {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  unitsDiscounted: number;
  /** The items' subtotal without the promo. */
  amountBeforeDiscount: number;
  discountAmount: number;
  /** What the order cost, with shipping. */
  orderTotal: number;
  orderStatus: string;
  /** False for a cancelled order: its use was given back. */
  counted: boolean;
  redeemedAt: string;
}

export interface PromoCodeListParams {
  search: string;
  status: PromoStatusFilter;
  page: number;
  size: number;
}
