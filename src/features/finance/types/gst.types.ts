/** The GST register and position (GET /admin/finance/gst/*). Amounts are paise, signed where noted. */

export type GstDirection = 'OUTPUT' | 'INPUT';
export type GstSource = 'ECOMMERCE_SALE' | 'ECOMMERCE_CREDIT_NOTE' | 'OTHER_SUPPLY' | 'DEALER_PURCHASE' | 'EXPENSE_BILL';
export type GstDocumentType = 'TAX_INVOICE' | 'CREDIT_NOTE' | 'PURCHASE_INVOICE' | 'EXPENSE_BILL' | 'SUPPLY_BILL' | 'REVERSAL';
export type GstMonthStatus = 'OPEN' | 'TO_FILE' | 'PAST_DUE_DATE';

/** One amount per tax head; `total` is their sum. */
export interface GstHeads {
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  total: number;
}

export interface GstTotals {
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  tax: number;
  documents: number;
}

export interface GstUtilisation {
  creditHead: string;
  taxHead: string;
  amount: number;
}

/** One tax period (calendar month): liability, credit, set-off and what is left to pay in cash. */
export interface GstMonth {
  period: string;
  label: string;
  start: string;
  end: string;
  /** The period chosen covers only part of the month. */
  partial: boolean;
  output: GstTotals;
  inputEligible: GstTotals;
  inputIneligibleTax: number;
  openingCredit: GstHeads;
  liability: GstHeads;
  credit: GstHeads;
  utilisations: GstUtilisation[];
  cashPayable: GstHeads;
  closingCredit: GstHeads;
  gstPaid: number;
  gstr1Due: string;
  gstr3bDue: string;
  status: GstMonthStatus;
}

export interface GstSummary {
  from: string;
  to: string;
  asOf: string;
  gstin: string | null;
  state: string | null;
  period: {
    /** Net of credit notes. */
    output: GstTotals;
    outputInvoices: GstTotals;
    /** Negative. */
    outputCreditNotes: GstTotals;
    otherSupplies: GstTotals;
    inputEligible: GstTotals;
    inputIneligible: GstTotals;
    /** Output tax − eligible input tax of the period (before carried-forward credit). */
    netTax: number;
    cashPayable: GstHeads;
    creditUsed: number;
    gstPaid: number;
  };
  months: GstMonth[];
  tillDate: {
    firstRecordOn: string | null;
    outputTax: number;
    inputTaxEligible: number;
    inputTaxIneligible: number;
    cashPayable: number;
    gstPaid: number;
    /** Positive: still to pay; negative: paid ahead. */
    outstanding: number;
    creditCarriedForward: GstHeads;
    outputAdjustmentCarriedForward: GstHeads;
  };
  bySource: { source: GstSource; label: string; direction: GstDirection; taxable: number; tax: number; documents: number; lines: number }[];
  byRate: { direction: GstDirection; rate: number | null; supplyType: string; taxable: number; igst: number; cgst: number; sgst: number; cess: number; tax: number }[];
  hsnSummary: { hsnSac: string | null; rate: number | null; quantity: number; taxable: number; igst: number; cgst: number; sgst: number; cess: number; tax: number }[];
  notes: string[];
}

/** One register row. Signed paise: credit notes and reversals are negative. */
export interface GstRegisterEntry {
  id: number;
  direction: GstDirection;
  source: GstSource;
  sourceLabel: string;
  documentType: GstDocumentType;
  documentNumber: string | null;
  documentDate: string;
  /** yyyy-mm */
  taxPeriod: string;
  orderReference: string;
  sourceId: string | null;
  lineKey: string;
  description: string;
  hsnSac: string | null;
  quantity: number | null;
  counterpartyName: string | null;
  counterpartyGstin: string | null;
  placeOfSupply: string | null;
  placeOfSupplyCode: string | null;
  supplyType: 'INTRA_STATE' | 'INTER_STATE';
  gstRate: number | null;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cessPaise: number;
  totalTaxPaise: number;
  itcEligible: boolean;
  itcNote: string | null;
  reversesEntryId: number | null;
  recordedAt: string;
  recordedBy: string;
}

export interface GstRegisterParams {
  from: string;
  to: string;
  direction?: GstDirection;
  source?: GstSource;
  search?: string;
  page: number;
  size: number;
}
