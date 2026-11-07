import type { NewProductUnit } from '../../barcodes/types/barcode.types';

/**
 * Stock entry drafts (Ecommerce BE /api/product-stock-drafts, STOREFRONT_STOCK_UPDATE): the units of one product
 * being built, saved part-filled so the scanning can be finished later. One draft per product, shared by the team.
 * A draft reserves no stock; submitting it adds the stock with each unit's own barcode and the barcodes of the pieces
 * fitted into it.
 */
export interface StockDraftSummary {
  id: number;
  productId: number;
  productTitle: string;
  /** Units the draft adds (rows of the grid). */
  quantity: number;
  /** Rows with the unit barcode and every piece barcode entered. */
  completeUnits: number;
  note: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A component of the product as it is now: `quantity` pieces of the item go into each unit. */
export interface StockDraftComponent {
  itemId: number;
  itemName: string;
  quantity: number;
}

export interface StockDraftDetail extends StockDraftSummary {
  /** Sent back on save and submit; a different one means someone else saved in between. */
  version: number;
  /** The rows as entered (piece lists hold only the codes entered so far). */
  units: NewProductUnit[];
  components: StockDraftComponent[];
  /** False when the save couldn't reach Procurement to check the barcodes (they are checked again on submit). */
  stockChecked: boolean;
}

export interface CreateStockDraftRequest {
  productId: number;
  quantity: number;
  note?: string | null;
  units: NewProductUnit[];
}

export interface UpdateStockDraftRequest {
  version: number;
  quantity: number;
  note?: string | null;
  units: NewProductUnit[];
}
