/** Company account types (Ecommerce /api/admin/finance). Amounts are paise; signed where noted. */

export type PnlSection =
  | 'REVENUE'
  | 'DIRECT_COSTS'
  | 'OPERATING_EXPENSES'
  | 'DEPRECIATION_AMORTIZATION'
  | 'OTHER_INCOME'
  | 'INTEREST'
  | 'TAX'
  | 'NONE';

export type CashActivity = 'OPERATING' | 'INVESTING' | 'FINANCING' | 'NON_CASH';
export type Direction = 'IN' | 'OUT';
export type Granularity = 'DAY' | 'WEEK' | 'MONTH';
export type VoucherStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';
export type VoucherSource = 'MANUAL' | 'SHIPMENT';
/** How GST appears on a voucher's bill: none, CGST + SGST (same state) or IGST (another state). */
export type TaxTreatment = 'NONE' | 'INTRA_STATE' | 'INTER_STATE';
export type VoucherDocumentKind = 'INVOICE' | 'RECEIPT' | 'PAYMENT_PROOF' | 'OTHER';
export type LedgerSource =
  | 'CUSTOMER_PAYMENT'
  | 'CUSTOMER_REFUND'
  | 'PROCUREMENT_ORDER'
  | 'PROCUREMENT_SALARY'
  // A client demo's costs, booked when its completion (or a correction) is approved
  | 'PROCUREMENT_DEMO'
  | 'VOUCHER'
  | 'REVERSAL';

export interface FinanceCategory {
  code: string;
  label: string;
  section: PnlSection;
  sectionLabel: string;
  activity: CashActivity;
  direction: Direction;
  cashImpact: boolean;
  /** Posted only by payments and refunds; never raised as a voucher. */
  system: boolean;
}

export interface ProfitAndLoss {
  grossSales: number;
  refunds: number;
  revenue: number;
  directCosts: number;
  grossProfit: number;
  operatingExpenses: number;
  ebitda: number;
  depreciationAmortization: number;
  ebit: number;
  otherIncome: number;
  interest: number;
  pbt: number;
  tax: number;
  pat: number;
  grossMarginPct: number | null;
  ebitdaMarginPct: number | null;
  ebitMarginPct: number | null;
  netMarginPct: number | null;
}

export interface CashFlow {
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  closingBalance: number;
  operating: number;
  investing: number;
  financing: number;
}

/** Vouchers awaiting approval are not in it: nothing counts until an Admin L2 approves it. */
export interface WorkingCapital {
  currentAssets: number;
  cash: number;
  currentLiabilities: number;
  pendingRefunds: number;
  workingCapital: number;
}

export interface Burn {
  months: number;
  monthlyBurn: number;
  monthlyNetCashFlow: number;
  runwayMonths: number | null;
  cashPositive: boolean;
}

export interface TrendPoint extends Omit<ProfitAndLoss, 'grossMarginPct' | 'ebitdaMarginPct' | 'ebitMarginPct' | 'netMarginPct'> {
  start: string;
  label: string;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  operating: number;
  investing: number;
  financing: number;
  closingBalance: number;
}

export interface CategoryTotal {
  category: string;
  label: string;
  section: PnlSection;
  activity: CashActivity;
  /** Signed: income positive, costs negative. */
  amount: number;
  cash: number;
}

export interface FinanceOverview {
  from: string;
  to: string;
  granularity: Granularity;
  account: { name: string; currency: string; balancePaise: number; entryCount: number; firstEntryOn: string | null };
  profitAndLoss: ProfitAndLoss;
  cashFlow: CashFlow;
  workingCapital: WorkingCapital;
  burn: Burn;
  trend: TrendPoint[];
  categories: CategoryTotal[];
  /** The approvers' queue: shown only, never counted in any figure until approved. */
  pending: { vouchers: number; expensePaise: number };
  procurementSync: {
    cursorAt: string | null;
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
    postedCount: number;
  } | null;
  integrity: { balanced: boolean; accountBalance: number; ledgerCashTotal: number; accountEntryCount: number; ledgerEntryCount: number };
}

export interface LedgerEntry {
  id: number;
  category: string;
  categoryLabel: string;
  section: PnlSection;
  activity: CashActivity;
  /** Signed: money in positive, money out negative. */
  amountPaise: number;
  cashImpact: boolean;
  balanceAfterPaise: number;
  sourceType: LedgerSource;
  sourceId: string | null;
  reference: string | null;
  counterparty: string | null;
  description: string;
  occurredOn: string;
  postedAt: string;
  postedBy: string;
  reversesEntryId: number | null;
}

export interface Voucher {
  id: number;
  voucherNumber: string;
  category: string;
  categoryLabel: string;
  section: PnlSection;
  direction: Direction;
  cashImpact: boolean;
  amountPaise: number;
  signedAmountPaise: number;
  title: string;
  description: string | null;
  payee: string | null;
  reference: string | null;
  invoiceNumber: string | null;
  paymentMode: string | null;
  expenseDate: string;
  /** For a GST bill the parts below add up to amountPaise exactly. */
  taxTreatment: TaxTreatment;
  supplierGstin: string | null;
  hsnSac: string | null;
  taxablePaise: number | null;
  /** Percent; null when there is no GST bill or the bill mixes rates. */
  gstRate: number | null;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cessPaise: number;
  /** CGST + SGST + IGST + cess. */
  gstPaise: number;
  /** GST bills: the GST is claimed as input tax credit (booked apart from the expense). False for blocked credit. */
  itcClaimable: boolean;
  /** The GST booked apart in the account: input tax credit claimed, or output tax on an income bill. */
  separatelyBookedTaxPaise: number;
  otherChargesPaise: number;
  roundOffPaise: number;
  documents: VoucherDocument[];
  source: VoucherSource;
  status: VoucherStatus;
  submittedBy: string;
  submittedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionComment: string | null;
  reversedBy: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  ledgerEntryId: number | null;
  reversalEntryId: number | null;
  updatedAt: string;
}

/** A bill, receipt or payment proof attached to a voucher. */
export interface VoucherDocument {
  id: number;
  kind: VoucherDocumentKind;
  /** The name the server stored it under, e.g. EXP-2026-000042_INVOICE_INV-7781_2026-10-15_01.pdf. */
  fileName: string;
  originalName: string | null;
  contentType: string;
  sizeBytes: number;
  originalSizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  /** Invoices are read when attached: VERIFIED matches the voucher, NEEDS_REVIEW see notes, UNREADABLE is a scan. */
  verificationStatus: DocumentVerification;
  verificationNotes: string | null;
}

export type DocumentVerification = 'VERIFIED' | 'NEEDS_REVIEW' | 'UNREADABLE' | 'NOT_CHECKED';
export type CheckLevel = 'OK' | 'WARN' | 'ERROR';

/** What was read from an invoice PDF before attaching it (POST /admin/finance/invoices/analyze). Rupees; null = not found. */
export interface InvoiceAnalysis {
  /** ERROR: it can't be attached as an invoice. */
  verdict: CheckLevel;
  /** False for a scan: nothing could be read. */
  textFound: boolean;
  pages: number;
  checks: { level: CheckLevel; code: string; message: string }[];
  fields: {
    supplierGstin: string | null;
    buyerGstin: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    hsnSac: string | null;
    taxTreatment: Exclude<TaxTreatment, 'NONE'> | null;
    gstRate: number | null;
    mixedRates: boolean;
    taxableAmount: number | null;
    cgst: number | null;
    sgst: number | null;
    igst: number | null;
    cess: number | null;
    roundOff: number | null;
    total: number | null;
  };
}

export interface VoucherPayload {
  category: string;
  /** Rupees, positive. */
  amount: number;
  title: string;
  description?: string | null;
  payee?: string | null;
  reference?: string | null;
  invoiceNumber?: string | null;
  paymentMode?: string | null;
  expenseDate: string;
  /** GST breakdown in rupees; omitted or NONE for a voucher without a GST bill. */
  taxTreatment?: TaxTreatment;
  supplierGstin?: string | null;
  hsnSac?: string | null;
  taxableAmount?: number | null;
  gstRate?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  cess?: number | null;
  otherCharges?: number | null;
  roundOff?: number | null;
  /** GST bills: claim the GST as input tax credit (default true); false for blocked credit (CGST Act s.17(5)). */
  itcClaimable?: boolean;
}

export interface VoucherListParams {
  status?: VoucherStatus;
  category?: string;
  submittedBy?: string;
  reference?: string;
  search?: string;
  page: number;
  size: number;
}

export interface LedgerListParams {
  from: string;
  to: string;
  category?: string;
  section?: PnlSection;
  source?: LedgerSource;
  search?: string;
  page: number;
  size: number;
}

export interface Period {
  from: string;
  to: string;
}
