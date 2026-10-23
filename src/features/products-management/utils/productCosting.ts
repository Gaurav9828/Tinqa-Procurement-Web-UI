import { COST_ENTRIES_MAX, COST_LABEL_MAX, COST_REASON_MAX, type CostEntryRequest } from '../types/product.types';
import type { CostEntry, CostSheet, ItemCost, OrderProfit, Profit, RealisedProfit } from '../types/costing.types';
import type { ProductCostSummary } from '../types/productApproval.types';
import { sellingPricePaise, splitInclusive } from './productTax';

/**
 * What one product unit costs and earns, previewed while the product is edited. Same figures as Ecommerce BE
 * (CostSheets / ProfitMath); keep the two in step. Everything excludes GST:
 *   net revenue      = selling price − GST inside it
 *   unit cost        = Σ component qty × unit cost + Σ extra costs
 *   gross profit     = net revenue − unit cost
 *   income tax       = gross profit × tax rate (nothing on a loss)
 *   profit after tax = gross profit − income tax
 */

// ---- Money in paise (signed: a loss is negative) ----

/** a / b rounded half up (away from zero for negatives), b > 0. */
const divideHalfUp = (a: number, b: number): number => Math.sign(a) * Math.floor((2 * Math.abs(a) + b) / (2 * b));

/** An amount as the API or a form holds it. */
type AmountInput = number | string | null | undefined;

export const rupeesToPaise = (rupees: AmountInput): number => {
  const n = Number(rupees);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

/** Profit in paise; percentages with 2 decimals (null when the base is zero). */
export interface ProfitPaise {
  revenue: number;
  cost: number;
  grossProfit: number;
  marginPercent: number | null;
  markupPercent: number | null;
  incomeTaxRate: number;
  incomeTax: number;
  profitAfterTax: number;
}

const percentOf = (part: number, whole: number): number | null => (whole === 0 ? null : divideHalfUp(part * 10000, whole) / 100);

export const profitOf = (revenue: number, cost: number, incomeTaxRate: number): ProfitPaise => {
  const gross = revenue - cost;
  const tax = gross > 0 ? divideHalfUp(gross * Math.round(incomeTaxRate * 100), 10000) : 0;
  return {
    revenue,
    cost,
    grossProfit: gross,
    marginPercent: percentOf(gross, revenue),
    markupPercent: percentOf(gross, cost),
    incomeTaxRate,
    incomeTax: tax,
    profitAfterTax: gross - tax,
  };
};

/** An API profit (rupees) in paise. */
export const profitToPaise = (profit: Profit): ProfitPaise => ({
  ...profit,
  revenue: rupeesToPaise(profit.revenue),
  cost: rupeesToPaise(profit.cost),
  grossProfit: rupeesToPaise(profit.grossProfit),
  incomeTax: rupeesToPaise(profit.incomeTax),
  profitAfterTax: rupeesToPaise(profit.profitAfterTax),
});

export interface CostPreview {
  sellingPrice: number;
  gstIncluded: number;
  netRevenue: number;
  componentsCost: number;
  componentsWithoutCost: number;
  additionalCost: number;
  unitCost: number;
  profit: ProfitPaise;
  /** No GST rate chosen yet: the whole price is taken as revenue. */
  gstMissing: boolean;
  /** At least one cost was entered (a component's unit cost or an extra cost). */
  hasCosts: boolean;
}

export const previewCosts = (input: {
  price: AmountInput;
  discountPercentage: AmountInput;
  gstRate: AmountInput;
  /** Unit cost as typed ('' = not entered). */
  components: { quantity: number | string; unitCost: string }[];
  /** Amounts as typed. */
  extraCosts: string[];
  incomeTaxRate: number;
}): CostPreview => {
  const selling = sellingPricePaise(input.price, input.discountPercentage);
  const gstMissing = input.gstRate === '' || input.gstRate === null || input.gstRate === undefined || !Number.isFinite(Number(input.gstRate));
  const net = gstMissing ? selling : splitInclusive(selling, Number(input.gstRate), 'INTER_STATE').taxable;
  let componentsCost = 0;
  let withoutCost = 0;
  for (const row of input.components) {
    const unit = parseCostAmount(row.unitCost);
    if (unit === null) withoutCost += 1;
    else componentsCost += rupeesToPaise(unit) * (Number(row.quantity) || 0);
  }
  const extras = input.extraCosts.map(parseCostAmount).filter((amount): amount is number => amount !== null);
  const additional = extras.reduce((sum, amount) => sum + rupeesToPaise(amount), 0);
  const unitCost = componentsCost + additional;
  return {
    sellingPrice: selling,
    gstIncluded: selling - net,
    netRevenue: net,
    componentsCost,
    componentsWithoutCost: withoutCost,
    additionalCost: additional,
    unitCost,
    profit: profitOf(net, unitCost, input.incomeTaxRate),
    gstMissing,
    hasCosts: withoutCost < input.components.length || extras.length > 0,
  };
};

/** One line of a revenue → cost → profit ladder (see ProfitBreakdown), in paise. */
export interface BreakdownRow {
  label: string;
  amount: number;
  /** '−' rows are taken off, '=' rows are subtotals. */
  sign?: '+' | '−' | '=';
  hint?: string;
  testId?: string;
}

/** The cost/profit ladder of a preview (or of a saved cost sheet, see sheetToPreview). */
export const costPreviewRows = (preview: CostPreview): BreakdownRow[] => [
  { label: 'Selling price (GST included)', amount: preview.sellingPrice, testId: 'cost-selling' },
  { label: 'GST inside the price', amount: preview.gstIncluded, sign: '−', hint: 'Paid to the government, not income' },
  { label: 'Net revenue per unit', amount: preview.netRevenue, sign: '=', testId: 'cost-net-revenue' },
  { label: 'Components', amount: preview.componentsCost, sign: '−', testId: 'cost-components' },
  { label: 'Extra costs', amount: preview.additionalCost, sign: '−', testId: 'cost-extra' },
  { label: 'Cost per unit', amount: preview.unitCost, sign: '=', testId: 'cost-unit' },
];

export const costPreviewWarnings = (preview: CostPreview): string[] => [
  ...(preview.hasCosts ? [] : ['No costs entered yet, so the whole net revenue shows as profit.']),
  ...(preview.componentsWithoutCost > 0
    ? [`${preview.componentsWithoutCost} ${preview.componentsWithoutCost === 1 ? 'component has' : 'components have'} no unit cost yet, so the cost is understated.`]
    : []),
  ...(preview.gstMissing ? ['No GST rate is set: the whole price is counted as revenue.'] : []),
];

/** A saved cost sheet (rupees) as a preview (paise). */
export const sheetToPreview = (sheet: CostSheet): CostPreview => ({
  sellingPrice: rupeesToPaise(sheet.sellingPrice),
  gstIncluded: rupeesToPaise(sheet.gstIncluded),
  netRevenue: rupeesToPaise(sheet.netRevenue),
  componentsCost: rupeesToPaise(sheet.componentsCost),
  componentsWithoutCost: sheet.componentsWithoutCost,
  additionalCost: rupeesToPaise(sheet.additionalCost),
  unitCost: rupeesToPaise(sheet.unitCost),
  profit: profitToPaise(sheet.profit),
  gstMissing: sheet.gstRate === null,
  hasCosts: sheet.componentsWithoutCost < sheet.components.length || sheet.costEntries.length > 0,
});

/** Money made on delivered orders, as a ladder: what came in, then what it cost. */
export const realisedRows = (realised: Pick<RealisedProfit, 'salesRevenue' | 'shippingCollected' | 'refunded' | 'productCost' | 'shippingCost'>): BreakdownRow[] => [
  { label: 'Sales (GST excluded)', amount: rupeesToPaise(realised.salesRevenue), testId: 'realised-sales' },
  { label: 'Shipping charged', amount: rupeesToPaise(realised.shippingCollected) },
  { label: 'Refunds paid back', amount: rupeesToPaise(realised.refunded), sign: '−' },
  { label: 'Product cost', amount: rupeesToPaise(realised.productCost), sign: '−', hint: 'Units × their cost when ordered', testId: 'realised-product-cost' },
  { label: 'Shipping & returns paid', amount: rupeesToPaise(realised.shippingCost), sign: '−', hint: 'Carrier costs entered when orders shipped' },
];

export const orderProfitWarnings = (order: Pick<OrderProfit, 'realised' | 'estimatedCost' | 'shippingCosts'>): string[] => [
  ...(order.realised ? [] : ['Not delivered yet: this is what the order will make once delivered.']),
  ...(order.estimatedCost ? ["Some lines were ordered before costs were recorded: today's cost sheet is used for them."] : []),
  ...(order.shippingCosts.some((cost) => cost.status === 'SUBMITTED') ? ['A shipping cost is still awaiting approval; it is already counted.'] : []),
];

/** The cost summary stored with an approval request, so the approver sees the margin. None while no cost is entered. */
export const toCostSummary = (preview: CostPreview): ProductCostSummary | undefined =>
  preview.hasCosts ? costSummaryOf(preview) : undefined;

const costSummaryOf = (preview: CostPreview): ProductCostSummary => ({
  unitCost: preview.unitCost / 100,
  netRevenue: preview.netRevenue / 100,
  grossProfit: preview.profit.grossProfit / 100,
  marginPercent: preview.profit.marginPercent,
  profitAfterTax: preview.profit.profitAfterTax / 100,
  componentsWithoutCost: preview.componentsWithoutCost,
});

// ---- Amounts as typed ----

const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

/** A cost as typed: ≥ 0 with at most 2 decimals; null when blank or invalid. */
export const parseCostAmount = (raw: string | null | undefined): number | null => {
  const trimmed = (raw ?? '').trim();
  return AMOUNT_PATTERN.test(trimmed) ? Number(trimmed) : null;
};

export const costAmountError = (raw: string): string | null => {
  if (!raw.trim()) return null;
  return parseCostAmount(raw) === null ? 'Enter an amount of 0 or more with at most 2 decimals.' : null;
};

/** The cost to start a component with: what the next unit used costs, else the last purchase price. */
export const suggestedUnitCost = (cost: ItemCost | null | undefined): string => {
  const value = cost?.nextUnitCost ?? cost?.lastUnitCost;
  return value === null || value === undefined ? '' : Number(value).toFixed(2);
};

/** "Next unit ₹120.00 · average ₹118.40 · last bought ₹125.00 (PO-12)". */
export const describeItemCost = (cost: ItemCost | null | undefined, format: (paise: number) => string): string => {
  if (!cost) return '';
  const parts: string[] = [];
  if (cost.nextUnitCost !== null) parts.push(`next unit ${format(rupeesToPaise(cost.nextUnitCost))}`);
  if (cost.averageUnitCost !== null && cost.averageUnitCost !== cost.nextUnitCost) parts.push(`average ${format(rupeesToPaise(cost.averageUnitCost))}`);
  if (cost.lastUnitCost !== null) {
    const order = cost.lastOrderNumber ? ` (${cost.lastOrderNumber})` : '';
    parts.push(`last bought ${format(rupeesToPaise(cost.lastUnitCost))}${order}`);
  }
  return parts.length ? `Purchase cost: ${parts.join(' · ')}` : 'No purchase price recorded for this item yet — enter the cost.';
};

// ---- Extra costs (manpower, software...) ----

export interface CostEntryRow {
  uid: string;
  label: string;
  amount: string;
  description: string;
}

let uidCounter = 0;
const nextUid = () => `cost-${++uidCounter}`;

export const emptyCostEntryRow = (label = ''): CostEntryRow => ({ uid: nextUid(), label, amount: '', description: '' });

export const toCostEntryRows = (entries: CostEntry[] | null | undefined): CostEntryRow[] =>
  (entries ?? []).map((entry) => ({
    uid: nextUid(),
    label: entry.label,
    amount: Number(entry.amount).toFixed(2),
    description: entry.description ?? '',
  }));

/** Common extra costs offered as one-click rows. */
export const COST_SUGGESTIONS = ['Manpower', 'Software', 'Packaging', 'Testing & QC', 'Overheads'];

export const costEntryErrorKey = (index: number, field: 'label' | 'amount' | 'description') => `costEntries[${index}].${field}`;

/** Keyed like the backend's field errors, e.g. `costEntries[0].amount`. */
export const validateCostEntries = (rows: CostEntryRow[]): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (rows.length > COST_ENTRIES_MAX) errors.costEntries = `A product can have at most ${COST_ENTRIES_MAX} extra costs.`;
  rows.forEach((row, i) => {
    if (!row.label.trim()) errors[costEntryErrorKey(i, 'label')] = 'Name the cost, e.g. Manpower.';
    else if (row.label.trim().length > COST_LABEL_MAX) errors[costEntryErrorKey(i, 'label')] = `At most ${COST_LABEL_MAX} characters.`;
    if (!row.amount.trim()) errors[costEntryErrorKey(i, 'amount')] = 'Enter the cost per unit.';
    else if (parseCostAmount(row.amount) === null) errors[costEntryErrorKey(i, 'amount')] = 'Enter an amount of 0 or more with at most 2 decimals.';
    if (row.description.trim().length > COST_REASON_MAX) errors[costEntryErrorKey(i, 'description')] = `At most ${COST_REASON_MAX} characters.`;
  });
  return errors;
};

export const toCostEntryRequests = (rows: CostEntryRow[]): CostEntryRequest[] =>
  rows.map((row) => ({
    label: row.label.trim().replace(/\s+/g, ' '),
    amount: parseCostAmount(row.amount) as number,
    ...(row.description.trim() ? { description: row.description.trim() } : {}),
  }));

const normaliseEntry = (entry: { label: string; amount: number | string; description?: string | null }) =>
  JSON.stringify([entry.label.trim().replace(/\s+/g, ' '), Number(entry.amount), (entry.description ?? '').trim()]);

export const costEntriesChanged = (original: CostEntry[], rows: CostEntryRow[]): boolean =>
  original.length !== rows.length || original.some((entry, i) => normaliseEntry(entry) !== normaliseEntry(rows[i]));

/** "Manpower ₹2,000.00; Software ₹150.00", or "None". */
export const summarizeCostEntries = (
  list: { label: string; amount: number | string }[],
  format: (paise: number) => string
): string => (list.length ? list.map((entry) => `${entry.label} ${format(rupeesToPaise(entry.amount))}`).join('; ') : 'None');

export const dropCostEntryErrors = (errors: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => !key.startsWith('costEntries')));
