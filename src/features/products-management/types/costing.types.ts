/**
 * Product costing (Ecommerce BE /api/admin/costing, Procurement GET /v1/stocks/items/{id}/cost). Amounts are rupees
 * and exclude GST: GST collected belongs to the government and GST paid on purchases comes back as input tax credit.
 */

/** Profit from revenue and cost (Ecommerce BE ProfitMath.Profit). */
export interface Profit {
  revenue: number;
  cost: number;
  grossProfit: number;
  /** Profit as a share of revenue; null when there is no revenue. */
  marginPercent: number | null;
  /** Profit on top of cost; null when there is no cost. */
  markupPercent: number | null;
  incomeTaxRate: number;
  /** Zero on a loss. */
  incomeTax: number;
  profitAfterTax: number;
}

export interface CostingSettings {
  /** Percent of profit paid as income tax. */
  incomeTaxRate: number;
}

export interface ComponentCost {
  itemId: number;
  itemName: string;
  itemSku?: string | null;
  quantity: number;
  unitCost: number | null;
  lineCost: number | null;
}

export interface CostEntry {
  id?: number;
  label: string;
  amount: number;
  description?: string | null;
}

/** One unit's cost against what it sells for, at today's price. */
export interface CostSheet {
  listPrice: number;
  discountPercentage: number | null;
  sellingPrice: number;
  gstRate: number | null;
  gstIncluded: number;
  netRevenue: number;
  components: ComponentCost[];
  componentsCost: number;
  componentsWithoutCost: number;
  costEntries: CostEntry[];
  additionalCost: number;
  unitCost: number;
  profit: Profit;
  complete: boolean;
}

/** Money made on delivered orders. */
export interface RealisedProfit {
  orders: number;
  unitsSold: number;
  salesRevenue: number;
  shippingCollected: number;
  refunded: number;
  productCost: number;
  shippingCost: number;
  linesWithEstimatedCost: number;
  profit: Profit;
}

export interface ProductProfit {
  productId: number;
  title: string;
  costSheet: CostSheet;
  realised: RealisedProfit;
}

export interface OrderLineProfit {
  productId: number;
  title: string;
  quantity: number;
  revenue: number;
  unitCost: number | null;
  cost: number;
  estimatedCost: boolean;
  profit: Profit;
}

export interface OrderShippingCost {
  voucherNumber: string;
  category: string;
  amount: number;
  /** SUBMITTED (awaiting approval) or APPROVED. */
  status: string;
  payee?: string | null;
  date?: string | null;
}

export interface OrderProfit {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  /** Delivered and not returned. */
  realised: boolean;
  lines: OrderLineProfit[];
  salesRevenue: number;
  shippingCollected: number;
  refunded: number;
  productCost: number;
  shippingCost: number;
  shippingCosts: OrderShippingCost[];
  estimatedCost: boolean;
  profit: Profit;
}

export interface ProductProfitRow {
  productId: number;
  title: string | null;
  realised: RealisedProfit;
}

export interface ProfitSummary {
  from: string;
  to: string;
  products: ProductProfitRow[];
  totals: RealisedProfit;
}

/** Landed purchase cost of one unit of an item (Procurement). Null amounts: no such stock. */
export interface ItemCost {
  itemId: number;
  itemName: string;
  unitOfMeasure?: string | null;
  /** Stock is used oldest first, so this is what the next unit costs. */
  nextUnitCost: number | null;
  averageUnitCost: number | null;
  unitsInStock: number;
  lastUnitCost: number | null;
  lastReceivedOn?: string | null;
  lastOrderNumber?: string | null;
}
