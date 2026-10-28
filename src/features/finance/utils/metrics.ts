import type { ProfitAndLoss, TrendPoint } from '../types/finance.types';

/** What each figure means and how it is worked out, shown next to its chart and in every export. */
export interface MetricDefinition {
  id: string;
  title: string;
  definition: string;
  formula: string;
}

export const METRICS = {
  balance: {
    id: 'balance',
    title: 'Company account',
    definition: 'All money that has come into and gone out of the business since the account was opened at ₹0. It goes negative while spending on manufacturing comes before sales.',
    formula: 'Every customer payment and income − every refund, purchase and approved expense',
  },
  revenue: {
    id: 'revenue',
    title: 'Revenue (top line)',
    definition: 'Money brought in from selling goods, before any costs are taken out. Refunds paid back to customers are deducted.',
    formula: 'Product sales + shipping charges collected − customer refunds',
  },
  directCosts: {
    id: 'directCosts',
    title: 'Direct costs (COGS)',
    definition: 'What it takes to make or buy what is sold: raw materials and dealer purchases, consumables such as wires, direct labour, factory overheads and packaging.',
    formula: 'Sum of direct-cost entries',
  },
  grossProfit: {
    id: 'grossProfit',
    title: 'Gross profit',
    definition: 'Money left after subtracting the direct costs of making the product.',
    formula: 'Revenue − direct costs',
  },
  operatingExpenses: {
    id: 'operatingExpenses',
    title: 'Operating expenses',
    definition: 'Costs of running the business that are not part of the product itself: shipping to customers, salaries, rent, utilities, office maintenance, travel, marketing, software and others.',
    formula: 'Sum of operating-expense entries (depreciation and amortization excluded)',
  },
  ebitda: {
    id: 'ebitda',
    title: 'EBITDA',
    definition: 'Earnings before interest, taxes, depreciation and amortization: core operating profit without the effect of debt, tax rates or non-cash wear-and-tear charges.',
    formula: 'Revenue − operating expenses (excluding D&A) − direct costs',
  },
  ebit: {
    id: 'ebit',
    title: 'EBIT (operating profit)',
    definition: 'Earnings before interest and taxes: what is left after depreciation and amortization are subtracted from EBITDA.',
    formula: 'EBITDA − depreciation & amortization',
  },
  pbt: {
    id: 'pbt',
    title: 'PBT (profit before tax)',
    definition: 'Profit remaining after interest on loans and debt is paid out of EBIT (other income, such as interest received, is added).',
    formula: 'EBIT + other income − interest',
  },
  pat: {
    id: 'pat',
    title: 'PAT (net profit, bottom line)',
    definition: 'The final money left after all operating costs, interest, depreciation and taxes. What the business can keep as retained earnings or pay out as dividends.',
    formula: 'PBT − tax',
  },
  depreciation: {
    id: 'depreciation',
    title: 'Depreciation & amortization',
    definition: 'Non-cash charges that spread the cost of physical assets (machinery, vehicles — depreciation) and intangible assets (software, patents — amortization) over their useful life. They reduce profit but not the account balance.',
    formula: 'Sum of depreciation and amortization entries',
  },
  cashFlow: {
    id: 'cashFlow',
    title: 'Cash flow',
    definition: 'The actual movement of cash in and out of the business. It differs from profit: a business can be profitable on paper yet run out of cash (asset purchases, loans and capital move cash but not profit).',
    formula: 'Cash in − cash out, by operating, investing and financing activity',
  },
  burn: {
    id: 'burn',
    title: 'Burn rate & runway',
    definition: 'How fast the business spends its cash reserves before becoming cash-flow positive, and how many months the current balance would last at that pace.',
    formula: 'Burn = net cash going out per month · Runway = account balance ÷ burn',
  },
  workingCapital: {
    id: 'workingCapital',
    title: 'Working capital',
    definition: 'Money available for day-to-day operations: current assets minus current liabilities. It shows whether short-term bills can be paid. Expenses awaiting approval are not counted until an Admin L2 approves them.',
    formula: 'Cash in the account − refunds owed to customers',
  },
} satisfies Record<string, MetricDefinition>;

export type MetricId = keyof typeof METRICS;

/** The profit & loss statement, top to bottom, as label / amount / kind rows (exports and the statement table). */
export const pnlRows = (pnl: ProfitAndLoss) => [
  { label: 'Gross sales', amount: pnl.grossSales, kind: 'line' as const },
  { label: 'Less: customer refunds', amount: -pnl.refunds, kind: 'line' as const },
  { label: 'Revenue', amount: pnl.revenue, kind: 'total' as const },
  { label: 'Less: direct costs (COGS)', amount: -pnl.directCosts, kind: 'line' as const },
  { label: 'Gross profit', amount: pnl.grossProfit, kind: 'total' as const, margin: pnl.grossMarginPct },
  { label: 'Less: operating expenses', amount: -pnl.operatingExpenses, kind: 'line' as const },
  { label: 'EBITDA', amount: pnl.ebitda, kind: 'total' as const, margin: pnl.ebitdaMarginPct },
  { label: 'Less: depreciation & amortization', amount: -pnl.depreciationAmortization, kind: 'line' as const },
  { label: 'EBIT (operating profit)', amount: pnl.ebit, kind: 'total' as const, margin: pnl.ebitMarginPct },
  { label: 'Add: other income', amount: pnl.otherIncome, kind: 'line' as const },
  { label: 'Less: interest', amount: -pnl.interest, kind: 'line' as const },
  { label: 'PBT (profit before tax)', amount: pnl.pbt, kind: 'total' as const },
  { label: 'Less: tax', amount: -pnl.tax, kind: 'line' as const },
  { label: 'PAT (net profit)', amount: pnl.pat, kind: 'grand' as const, margin: pnl.netMarginPct },
];

/** Trend columns per metric, for exports. */
export const TREND_COLUMNS: { key: keyof TrendPoint; label: string }[] = [
  { key: 'grossSales', label: 'Gross sales' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'directCosts', label: 'Direct costs' },
  { key: 'grossProfit', label: 'Gross profit' },
  { key: 'operatingExpenses', label: 'Operating expenses' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'depreciationAmortization', label: 'D&A' },
  { key: 'ebit', label: 'EBIT' },
  { key: 'otherIncome', label: 'Other income' },
  { key: 'interest', label: 'Interest' },
  { key: 'pbt', label: 'PBT' },
  { key: 'tax', label: 'Tax' },
  { key: 'pat', label: 'PAT' },
  { key: 'cashIn', label: 'Cash in' },
  { key: 'cashOut', label: 'Cash out' },
  { key: 'netCashFlow', label: 'Net cash flow' },
  { key: 'closingBalance', label: 'Closing balance' },
];

export const VOUCHER_STATUS_LABELS = {
  SUBMITTED: 'Awaiting approval',
  APPROVED: 'Approved & posted',
  REJECTED: 'Rejected',
  CANCELLED: 'Withdrawn',
  REVERSED: 'Reversed',
} as const;

export const SOURCE_LABELS = {
  CUSTOMER_PAYMENT: 'Customer payment',
  CUSTOMER_REFUND: 'Customer refund',
  PROCUREMENT_ORDER: 'Dealer purchase',
  PROCUREMENT_SALARY: 'Salary',
  PROCUREMENT_DEMO: 'Client demo',
  VOUCHER: 'Voucher',
  REVERSAL: 'Reversal',
} as const;

export const PAYMENT_MODES = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const SECTION_ORDER = [
  'REVENUE',
  'DIRECT_COSTS',
  'OPERATING_EXPENSES',
  'DEPRECIATION_AMORTIZATION',
  'OTHER_INCOME',
  'INTEREST',
  'TAX',
  'NONE',
] as const;
