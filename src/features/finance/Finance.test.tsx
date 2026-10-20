import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import type { ApiResponse, PageResponse } from '../../types/common.types';
import { financeApi } from './api/financeApi';
import { FinancePage } from './pages/FinancePage';
import { VouchersPanel } from './components/VouchersPanel';
import type { FinanceCategory, FinanceOverview, InvoiceAnalysis, TrendPoint, Voucher } from './types/finance.types';
import { compactRupees, rupees } from './utils/money';
import { presetPeriod } from './utils/period';
import { createEndpointMatcher, ECOMMERCE_ENDPOINTS } from '../../config/endpointAccess';
import { billPart, gstAtRate, storedNamePreview, suggestTreatment } from './utils/gst';
import type { GstHeads, GstRegisterEntry, GstSummary, GstTotals } from './types/gst.types';

// Only the network layer is mocked.
vi.mock('./api/financeApi', () => ({
  financeApi: {
    categories: vi.fn(),
    overview: vi.fn(),
    ledger: vi.fn(),
    exportLedger: vi.fn(),
    syncProcurement: vi.fn(),
    listVouchers: vi.fn(),
    createVoucher: vi.fn(),
    updateVoucher: vi.fn(),
    cancelVoucher: vi.fn(),
    approveVoucher: vi.fn(),
    rejectVoucher: vi.fn(),
    reverseVoucher: vi.fn(),
    uploadDocument: vi.fn(),
    removeDocument: vi.fn(),
    downloadDocument: vi.fn(),
    companyGstin: vi.fn(),
    analyzeInvoice: vi.fn(),
    gstSummary: vi.fn(),
    gstRegister: vi.fn(),
    exportGstRegister: vi.fn(),
  },
}));

const api = vi.mocked(financeApi);
const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });
const page = <T,>(content: T[]): ApiResponse<PageResponse<T>> =>
  ok({ content, number: 0, size: 20, totalElements: content.length, totalPages: 1, first: true, last: true, empty: !content.length });

const signIn = (username: string, permissions: Permission[]) =>
  useAuthStore.setState({
    token: null,
    isAuthenticated: true,
    user: { userId: 1, username, email: `${username}@tinqa.com`, role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const CATEGORIES: FinanceCategory[] = [
  { code: 'PRODUCT_SALES', label: 'Product sales', section: 'REVENUE', sectionLabel: 'Revenue', activity: 'OPERATING', direction: 'IN', cashImpact: true, system: true },
  { code: 'RAW_MATERIALS', label: 'Raw materials & dealer purchases', section: 'DIRECT_COSTS', sectionLabel: 'Direct costs', activity: 'OPERATING', direction: 'OUT', cashImpact: true, system: false },
  { code: 'TRAVEL', label: 'Travel & conveyance', section: 'OPERATING_EXPENSES', sectionLabel: 'Operating expenses', activity: 'OPERATING', direction: 'OUT', cashImpact: true, system: false },
  { code: 'DEPRECIATION', label: 'Depreciation', section: 'DEPRECIATION_AMORTIZATION', sectionLabel: 'D&A', activity: 'NON_CASH', direction: 'OUT', cashImpact: false, system: false },
];

const point = (label: string, values: Partial<TrendPoint>): TrendPoint => ({
  start: '2026-10-01', label, grossSales: 0, refunds: 0, revenue: 0, directCosts: 0, grossProfit: 0, operatingExpenses: 0, ebitda: 0,
  depreciationAmortization: 0, ebit: 0, otherIncome: 0, interest: 0, pbt: 0, tax: 0, pat: 0, cashIn: 0, cashOut: 0, netCashFlow: 0,
  operating: 0, investing: 0, financing: 0, closingBalance: 0, ...values,
});

const OVERVIEW: FinanceOverview = {
  from: '2026-05-01',
  to: '2026-10-19',
  granularity: 'MONTH',
  account: { name: 'Company account', currency: 'INR', balancePaise: -12_345_600, entryCount: 42, firstEntryOn: '2026-05-03' },
  profitAndLoss: {
    grossSales: 5_000_000, refunds: 200_000, revenue: 4_800_000, directCosts: 2_000_000, grossProfit: 2_800_000, operatingExpenses: 1_300_000,
    ebitda: 1_500_000, depreciationAmortization: 100_000, ebit: 1_400_000, otherIncome: 0, interest: 50_000, pbt: 1_350_000, tax: 150_000,
    pat: 1_200_000, grossMarginPct: 58.3, ebitdaMarginPct: 31.3, ebitMarginPct: 29.2, netMarginPct: 25,
  },
  cashFlow: { openingBalance: 0, cashIn: 5_000_000, cashOut: 17_345_600, netCashFlow: -12_345_600, closingBalance: -12_345_600, operating: -9_000_000, investing: -3_345_600, financing: 0 },
  workingCapital: { currentAssets: -12_345_600, cash: -12_345_600, currentLiabilities: 200_000, pendingRefunds: 200_000, workingCapital: -12_545_600 },
  burn: { months: 5.6, monthlyBurn: 2_204_571, monthlyNetCashFlow: -2_204_571, runwayMonths: null, cashPositive: false },
  trend: [point('Sep 2026', { revenue: 1_000_000, closingBalance: -2_000_000 }), point('Oct 2026', { revenue: 3_800_000, closingBalance: -12_345_600 })],
  categories: [
    { category: 'PRODUCT_SALES', label: 'Product sales', section: 'REVENUE', activity: 'OPERATING', amount: 5_000_000, cash: 5_000_000 },
    { category: 'RAW_MATERIALS', label: 'Raw materials & dealer purchases', section: 'DIRECT_COSTS', activity: 'OPERATING', amount: -2_000_000, cash: -2_000_000 },
  ],
  pending: { vouchers: 3, expensePaise: 700_000 },
  procurementSync: { cursorAt: null, lastRunAt: null, lastSuccessAt: '2026-10-19T10:00:00Z', lastError: null, postedCount: 4 },
  integrity: { balanced: true, accountBalance: -12_345_600, ledgerCashTotal: -12_345_600, accountEntryCount: 42, ledgerEntryCount: 42 },
};

const voucher = (overrides: Partial<Voucher> = {}): Voucher => ({
  id: 7, voucherNumber: 'EXP-2026-000007', category: 'TRAVEL', categoryLabel: 'Travel & conveyance', section: 'OPERATING_EXPENSES',
  direction: 'OUT', cashImpact: true, itcClaimable: true, separatelyBookedTaxPaise: 0, amountPaise: 80_000, signedAmountPaise: -80_000, title: 'Client visit', description: null,
  payee: 'Ola', reference: null, invoiceNumber: null, paymentMode: 'UPI', expenseDate: '2026-10-18', source: 'MANUAL', status: 'SUBMITTED',
  submittedBy: 'maker', submittedAt: '2026-10-18T10:00:00', decidedBy: null, decidedAt: null, decisionComment: null, reversedBy: null,
  reversedAt: null, reversalReason: null, ledgerEntryId: null, reversalEntryId: null, updatedAt: '2026-10-18T10:00:00',
  taxTreatment: 'NONE', supplierGstin: null, hsnSac: null, taxablePaise: null, gstRate: null, cgstPaise: 0, sgstPaise: 0, igstPaise: 0,
  cessPaise: 0, gstPaise: 0, otherChargesPaise: 0, roundOffPaise: 0, documents: [], ...overrides,
});

const ANALYSIS: InvoiceAnalysis = {
  verdict: 'OK',
  textFound: true,
  pages: 1,
  checks: [
    { level: 'OK', code: 'INVOICE_TITLE', message: 'Titled as an invoice.' },
    { level: 'OK', code: 'ADDS_UP', message: 'Taxable value + GST adds up to the bill total of ₹1179.60.' },
  ],
  fields: {
    supplierGstin: '27AAPFU0939F1ZV', buyerGstin: '27AAACT1234A1Z1', invoiceNumber: 'SM/7781', invoiceDate: '2026-10-15', hsnSac: '7408',
    taxTreatment: 'INTRA_STATE', gstRate: 18, mixedRates: false, taxableAmount: 1000, cgst: 90, sgst: 90, igst: null, cess: null,
    roundOff: -0.4, total: 1179.6,
  },
};

const renderUi = (ui: React.ReactElement) => {
  const user = userEvent.setup();
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter>
        <GlobalAlertContainer />
        {ui}
      </MemoryRouter>
    </Provider>
  );
  return { user };
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  api.categories.mockResolvedValue(ok(CATEGORIES));
  api.overview.mockResolvedValue(ok(OVERVIEW));
  api.listVouchers.mockResolvedValue(page([voucher()]));
  api.ledger.mockResolvedValue(page([]));
  api.companyGstin.mockResolvedValue('27AAACT1234A1Z5');
});

describe('money formatting', () => {
  it('formats paise as rupees with Indian compact units', () => {
    expect(rupees(12_345_600)).toBe('₹1,23,456.00');
    expect(rupees(-50)).toBe('−₹0.50');
    expect(compactRupees(1_234_500)).toBe('₹12.3K');
    expect(compactRupees(-25_000_000)).toBe('−₹2.5L');
    expect(compactRupees(1_050_000_000)).toBe('₹1.05Cr');
  });

  it('knows the Indian financial year', () => {
    expect(presetPeriod('THIS_FY', null, new Date(2026, 1, 10))).toEqual({ from: '2025-04-01', to: '2026-02-10' });
    expect(presetPeriod('LAST_FY', null, new Date(2026, 9, 19))).toEqual({ from: '2025-04-01', to: '2026-03-31' });
  });
});

describe('Accounts & Finance page', () => {
  it('shows the super admin the account, the profit & loss and a card per figure', async () => {
    signIn('owner', ['FINANCE_REPORT_VIEW', 'FINANCE_REPORT_EXPORT', 'EXPENSE_VIEW', 'EXPENSE_SUBMIT', 'EXPENSE_APPROVE']);
    renderUi(<FinancePage />);

    const hero = await screen.findByRole('region', { name: 'Company account' });
    expect(within(hero).getByText('−₹1,23,456.00')).toBeInTheDocument();
    expect(within(hero).getByText(/Books balanced/)).toBeInTheDocument();
    expect(within(hero).getByText(/3 awaiting approval/)).toBeInTheDocument();

    const statement = screen.getByRole('table', { name: 'Profit and loss statement' });
    expect(within(statement).getByText('PAT (net profit)')).toBeInTheDocument();
    expect(within(statement).getByText('₹12,000.00')).toBeInTheDocument();

    for (const title of ['Revenue (top line)', 'Direct costs (COGS)', 'Gross profit', 'Operating expenses', 'EBITDA', 'EBIT (operating profit)',
      'PBT (profit before tax)', 'PAT (net profit, bottom line)', 'Cash flow', 'Burn rate & runway', 'Working capital']) {
      expect(screen.getByRole('region', { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Export full report' })).toBeInTheDocument();
    expect(api.overview).toHaveBeenCalledTimes(1);
  });

  it('explains a figure and shows its numbers as a table', async () => {
    signIn('owner', ['FINANCE_REPORT_VIEW']);
    const { user } = renderUi(<FinancePage />);
    const card = await screen.findByRole('region', { name: 'EBITDA' });
    await user.click(within(card).getByRole('button', { name: 'What is EBITDA?' }));
    expect(within(card).getByText(/Revenue − operating expenses \(excluding D&A\) − direct costs/)).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Show as table' }));
    expect(within(within(card).getByRole('table')).getByText('Oct 2026')).toBeInTheDocument();
    // No export without FINANCE_REPORT_EXPORT
    expect(screen.queryByRole('button', { name: 'Export full report' })).not.toBeInTheDocument();
  });

  it('never asks for reports a maker may not see', async () => {
    signIn('store_manager', ['EXPENSE_VIEW', 'EXPENSE_SUBMIT']);
    renderUi(<FinancePage />);
    expect(await screen.findByRole('region', { name: 'Expenses & vouchers' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Overview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Ledger' })).not.toBeInTheDocument();
    expect(api.overview).not.toHaveBeenCalled();
    expect(api.ledger).not.toHaveBeenCalled();
  });
});

describe('Vouchers', () => {
  it('raises a voucher with the amount in rupees', async () => {
    signIn('maker', ['EXPENSE_VIEW', 'EXPENSE_SUBMIT']);
    api.createVoucher.mockResolvedValue(ok(voucher({ id: 8 }), 'Voucher raised.'));
    const { user } = renderUi(<VouchersPanel title="Expenses & vouchers" description="" />);

    await user.click(await screen.findByRole('button', { name: 'New expense' }));
    const dialog = screen.getByRole('dialog', { name: 'New expense or voucher' });
    // Nothing entered yet: nothing to raise.
    expect(within(dialog).getByRole('button', { name: 'Raise for approval' })).toBeDisabled();
    // Customer sales are never raised by hand
    expect(within(dialog).queryByRole('option', { name: 'Product sales' })).not.toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText('Category'), 'RAW_MATERIALS');
    expect(within(dialog).getByText(/Takes money out of the account/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Raise for approval' }));
    expect(api.createVoucher).not.toHaveBeenCalled();
    expect(within(dialog).getByText('Enter an amount greater than zero.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Amount'), '1250.50');
    await user.type(within(dialog).getByLabelText('Title'), 'Copper wire');
    await user.click(within(dialog).getByRole('button', { name: 'Raise for approval' }));

    await waitFor(() => expect(api.createVoucher).toHaveBeenCalledTimes(1));
    expect(api.createVoucher.mock.calls[0][0]).toMatchObject({ category: 'RAW_MATERIALS', amount: 1250.5, title: 'Copper wire', paymentMode: 'BANK_TRANSFER' });
    expect(await screen.findByText('Voucher raised.')).toBeInTheDocument();
  });

  it('lets a different approver approve, but never the maker', async () => {
    signIn('maker', ['EXPENSE_VIEW', 'EXPENSE_SUBMIT', 'EXPENSE_APPROVE']);
    const first = renderUi(<VouchersPanel title="Queue" description="" defaultStatus="SUBMITTED" />);
    const row = (await screen.findByText('EXP-2026-000007')).closest('tr')!;
    expect(within(row).queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
    expect(within(row).getByText('Another approver decides')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /Withdraw/ })).toBeInTheDocument();
    expect(api.listVouchers).toHaveBeenCalledWith(expect.objectContaining({ status: 'SUBMITTED' }));
    void first;
  });

  it('approves and posts a voucher with an optional comment', async () => {
    signIn('finance_head', ['EXPENSE_VIEW', 'EXPENSE_APPROVE']);
    api.approveVoucher.mockResolvedValue(ok(voucher({ status: 'APPROVED' }), 'Voucher approved and posted to the company account'));
    const { user } = renderUi(<VouchersPanel title="Queue" description="" defaultStatus="SUBMITTED" />);
    const row = (await screen.findByText('EXP-2026-000007')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Approve/ }));
    const dialog = screen.getByRole('dialog', { name: 'Approve and post' });
    await user.click(within(dialog).getByRole('button', { name: 'Approve & post' }));
    await waitFor(() => expect(api.approveVoucher).toHaveBeenCalledWith(7, ''));
    expect(await screen.findByText('Voucher approved and posted to the company account')).toBeInTheDocument();
    expect(api.listVouchers).toHaveBeenCalledTimes(2);
  });

  it('requires a reason to reject', async () => {
    signIn('finance_head', ['EXPENSE_VIEW', 'EXPENSE_APPROVE']);
    api.rejectVoucher.mockResolvedValue(ok(voucher({ status: 'REJECTED' })));
    const { user } = renderUi(<VouchersPanel title="Queue" description="" />);
    const row = (await screen.findByText('EXP-2026-000007')).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Reject/ }));
    const dialog = screen.getByRole('dialog', { name: 'Reject voucher' });
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(api.rejectVoucher).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText('Reason'), 'No bill attached');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(api.rejectVoucher).toHaveBeenCalledWith(7, 'No bill attached'));
  });
});

describe('endpoint access', () => {
  it('knows the permission of every finance endpoint', () => {
    const match = createEndpointMatcher(ECOMMERCE_ENDPOINTS);
    expect(match('GET', '/admin/finance/overview?from=2026-01-01')).toBe('FINANCE_REPORT_VIEW');
    expect(match('GET', '/admin/finance/ledger/export')).toBe('FINANCE_REPORT_EXPORT');
    expect(match('POST', '/admin/finance/vouchers')).toBe('EXPENSE_SUBMIT');
    expect(match('POST', '/admin/finance/vouchers/9/approve')).toBe('EXPENSE_APPROVE');
    expect(match('POST', '/admin/finance/vouchers/9/cancel')).toBe('EXPENSE_SUBMIT');
    expect(match('GET', '/admin/finance/categories')).toBeNull();
    expect(match('POST', '/admin/finance/vouchers/9/documents')).toBe('EXPENSE_SUBMIT');
    expect(match('POST', '/admin/finance/invoices/analyze')).toBe('EXPENSE_SUBMIT');
    expect(match('DELETE', '/admin/finance/vouchers/9/documents/3')).toBe('EXPENSE_SUBMIT');
    expect(match('GET', '/admin/finance/vouchers/9/documents/3')).toBe('EXPENSE_VIEW');
    expect(match('GET', '/admin/finance/gst/summary?from=2026-04-01')).toBe('FINANCE_REPORT_VIEW');
    expect(match('GET', '/admin/finance/gst/register')).toBe('FINANCE_REPORT_VIEW');
    expect(match('GET', '/admin/finance/gst/register/export')).toBe('FINANCE_REPORT_EXPORT');
  });
});

const heads = (cgst: number, sgst: number, igst = 0): GstHeads => ({ igst, cgst, sgst, cess: 0, total: cgst + sgst + igst });
const totals = (taxable: number, cgst: number, igst = 0, documents = 1): GstTotals =>
  ({ taxable, igst, cgst, sgst: cgst, cess: 0, tax: 2 * cgst + igst, documents });
const GST_SUMMARY: GstSummary = {
  from: '2026-04-01', to: '2026-10-20', asOf: '2026-10-20', gstin: '27AAACT1234A1Z5', state: 'Maharashtra',
  period: {
    output: totals(110_000, 9_900), outputInvoices: totals(110_000, 9_900), outputCreditNotes: totals(0, 0, 0, 0),
    otherSupplies: totals(0, 0, 0, 0), inputEligible: totals(100_000, 9_000), inputIneligible: totals(0, 0, 0, 0),
    netTax: 1_800, cashPayable: heads(900, 900), creditUsed: 18_000, gstPaid: 1_000,
  },
  months: [{
    period: '2026-10', label: 'Oct 2026', start: '2026-10-01', end: '2026-10-31', partial: true,
    output: totals(110_000, 9_900), inputEligible: totals(100_000, 9_000), inputIneligibleTax: 0,
    openingCredit: heads(0, 0), liability: heads(9_900, 9_900), credit: heads(9_000, 9_000),
    utilisations: [{ creditHead: 'CGST', taxHead: 'CGST', amount: 9_000 }, { creditHead: 'SGST', taxHead: 'SGST', amount: 9_000 }],
    cashPayable: heads(900, 900), closingCredit: heads(0, 0), gstPaid: 1_000, gstr1Due: '2026-11-11', gstr3bDue: '2026-11-20', status: 'OPEN',
  }],
  tillDate: {
    firstRecordOn: '2026-10-01', outputTax: 19_800, inputTaxEligible: 18_000, inputTaxIneligible: 0, cashPayable: 1_800, gstPaid: 1_000,
    outstanding: 800, creditCarriedForward: heads(0, 0), outputAdjustmentCarriedForward: heads(0, 0),
  },
  bySource: [
    { source: 'ECOMMERCE_SALE', label: 'E-commerce sale', direction: 'OUTPUT', taxable: 110_000, tax: 19_800, documents: 1, lines: 2 },
    { source: 'DEALER_PURCHASE', label: 'Dealer purchase', direction: 'INPUT', taxable: 100_000, tax: 18_000, documents: 1, lines: 1 },
  ],
  byRate: [],
  hsnSummary: [{ hsnSac: '9405', rate: 18, quantity: 1, taxable: 100_000, igst: 0, cgst: 9_000, sgst: 9_000, cess: 0, tax: 18_000 }],
  notes: [],
};
const GST_ROW: GstRegisterEntry = {
  id: 1, direction: 'INPUT', source: 'DEALER_PURCHASE', sourceLabel: 'Dealer purchase', documentType: 'PURCHASE_INVOICE',
  documentNumber: 'SM/101', documentDate: '2026-10-20', taxPeriod: '2026-10', orderReference: 'PO-77', sourceId: '5', lineKey: 'PURCHASE',
  description: 'Dealer purchase PO-77: Solar cell approved into stock', hsnSac: '8541', quantity: 8, counterpartyName: 'Local Trader',
  counterpartyGstin: null, placeOfSupply: 'Maharashtra', placeOfSupplyCode: '27', supplyType: 'INTRA_STATE', gstRate: 18,
  taxablePaise: 100_000, cgstPaise: 9_000, sgstPaise: 9_000, igstPaise: 0, cessPaise: 0, totalTaxPaise: 18_000, itcEligible: false,
  itcNote: 'The dealer has no valid GSTIN on record', reversesEntryId: null, recordedAt: '2026-10-20T10:00:00', recordedBy: 'SYSTEM',
};

describe('GST tab', () => {
  it('shows output tax, input tax credit, what is payable in cash and outstanding, and the register', async () => {
    signIn('auditor', ['FINANCE_REPORT_VIEW']);
    sessionStorage.setItem('finance.tab', 'gst');
    api.gstSummary.mockResolvedValue(ok(GST_SUMMARY));
    api.gstRegister.mockResolvedValue(page([GST_ROW]));
    renderUi(<FinancePage />);

    const position = await screen.findByRole('region', { name: 'GST position' });
    expect(await within(position).findByText('Output tax (charged)')).toBeInTheDocument();
    expect(within(position).getAllByText('₹198.00').length).toBeGreaterThan(0);
    expect(within(position).getByText('Payable in cash', { selector: 'p' })).toBeInTheDocument();
    expect(within(position).getByText('Still to pay')).toBeInTheDocument();
    const months = within(position).getByRole('table', { name: 'GST month by month' });
    expect(within(months).getByText('Oct 2026 (part)')).toBeInTheDocument();
    expect(within(months).getByText('Month in progress')).toBeInTheDocument();

    const register = screen.getByRole('region', { name: 'GST register' });
    expect(await within(register).findByText(/PO-77: Solar cell/)).toBeInTheDocument();
    expect(within(register).getByText('The dealer has no valid GSTIN on record')).toBeInTheDocument();
    // No exports without FINANCE_REPORT_EXPORT; nothing is asked for that the auditor can't see
    expect(screen.queryByRole('button', { name: /CSV/ })).not.toBeInTheDocument();
    expect(api.exportGstRegister).not.toHaveBeenCalled();
    expect(api.gstSummary).toHaveBeenCalledTimes(1);
  });

  it('is not shown to someone without finance reports', async () => {
    signIn('store_manager', ['EXPENSE_VIEW', 'EXPENSE_SUBMIT']);
    renderUi(<FinancePage />);
    await screen.findByRole('region', { name: 'Expenses & vouchers' });
    expect(screen.queryByRole('tab', { name: 'GST' })).not.toBeInTheDocument();
    expect(api.gstSummary).not.toHaveBeenCalled();
  });
});

describe('GST', () => {
  it('splits GST into equal CGST and SGST inside the state and IGST across states', () => {
    expect(gstAtRate(100_000, 18, 'INTRA_STATE')).toEqual({ cgst: 9_000, sgst: 9_000, igst: 0 });
    expect(gstAtRate(100_000, 18, 'INTER_STATE')).toEqual({ cgst: 0, sgst: 0, igst: 18_000 });
    expect(gstAtRate(33_333, 5, 'INTRA_STATE')).toEqual({ cgst: 833, sgst: 833, igst: 0 });
    expect(suggestTreatment('27AAPFU0939F1ZV', '27AAACT1234A1Z5')).toBe('INTRA_STATE');
    expect(suggestTreatment('29AAPFU0939F1ZV', '27AAACT1234A1Z5')).toBe('INTER_STATE');
    expect(suggestTreatment('29AAPFU0939F1ZV', null)).toBeNull();
  });

  it('previews the name a document is stored under, as the backend builds it', () => {
    expect(billPart(' INV/24-25/7781 ')).toBe('INV-24-25-7781');
    expect(storedNamePreview('EXP-2026-000042', 'INVOICE', 'inv/24-25/7781', '2026-10-15', 1, 'pdf'))
      .toBe('EXP-2026-000042_INVOICE_INV-24-25-7781_2026-10-15_01.pdf');
    expect(storedNamePreview('EXP-2026-000042', 'RECEIPT', '', '2026-10-15', 2, 'jpg')).toBe('EXP-2026-000042_RECEIPT_2026-10-15_02.jpg');
  });

  it('raises a GST bill with its breakdown, then attaches the receipt to the new voucher', async () => {
    signIn('maker', ['EXPENSE_VIEW', 'EXPENSE_SUBMIT']);
    const created = voucher({ id: 12, voucherNumber: 'EXP-2026-000012' });
    api.createVoucher.mockResolvedValue(ok(created, 'Voucher raised.'));
    api.uploadDocument.mockResolvedValue(ok(created));
    const { user } = renderUi(<VouchersPanel title="Expenses" description="" />);

    await user.click(await screen.findByRole('button', { name: 'New expense' }));
    const dialog = screen.getByRole('dialog', { name: 'New expense or voucher' });
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'RAW_MATERIALS');
    await user.type(within(dialog).getByLabelText('Title'), 'Copper wire');
    await user.type(within(dialog).getByLabelText('Invoice number'), 'INV/7781');
    await user.click(within(dialog).getByRole('radio', { name: 'Same state — CGST + SGST' }));

    // A supplier in another state switches the bill to IGST; back in our state it is CGST + SGST again
    await user.type(within(dialog).getByLabelText('Supplier GSTIN'), '29aapfu0939f1zv');
    expect(within(dialog).getByRole('radio', { name: 'Other state — IGST' })).toBeChecked();
    await user.clear(within(dialog).getByLabelText('Supplier GSTIN'));
    await user.type(within(dialog).getByLabelText('Supplier GSTIN'), '27AAPFU0939F1ZV');
    expect(within(dialog).getByRole('radio', { name: 'Same state — CGST + SGST' })).toBeChecked();
    expect(within(dialog).getByText(/same state as us/)).toBeInTheDocument();

    // 18% fills the GST; the amount is the bill total
    await user.type(within(dialog).getByLabelText('Taxable value'), '1000');
    expect(within(dialog).getByLabelText('CGST')).toHaveValue('90.00');
    expect(within(dialog).getByLabelText('SGST')).toHaveValue('90.00');
    await user.type(within(dialog).getByLabelText('Round off (±)'), '0.40');
    expect(within(dialog).getByLabelText('Amount')).toHaveValue('1180.40');

    const receipt = new File(['%PDF-1.4'], 'upi.pdf', { type: 'application/pdf' });
    await user.upload(within(dialog).getByLabelText('Attach receipt or proof'), receipt);
    expect(await within(dialog).findByText('EXP-…_RECEIPT_INV-7781_' + new Date().toISOString().slice(0, 10) + '_01.pdf', { exact: false }))
      .toBeInTheDocument();
    expect(api.analyzeInvoice).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Raise for approval' }));

    await waitFor(() => expect(api.uploadDocument).toHaveBeenCalledTimes(1));
    expect(api.createVoucher.mock.calls[0][0]).toMatchObject({
      category: 'RAW_MATERIALS', amount: 1180.4, taxTreatment: 'INTRA_STATE', supplierGstin: '27AAPFU0939F1ZV', taxableAmount: 1000,
      gstRate: 18, cgst: 90, sgst: 90, igst: 0, roundOff: 0.4, invoiceNumber: 'INV/7781',
    });
    expect(api.uploadDocument).toHaveBeenCalledWith(12, receipt, 'RECEIPT');
    expect(await screen.findByText('Voucher raised. 1 file(s) attached to EXP-2026-000012.')).toBeInTheDocument();
  });

  it('reads an attached invoice, checks it and fills in the form, which stays editable', async () => {
    signIn('maker', ['EXPENSE_VIEW', 'EXPENSE_SUBMIT']);
    const created = voucher({ id: 12, voucherNumber: 'EXP-2026-000012' });
    api.createVoucher.mockResolvedValue(ok(created, 'Voucher raised.'));
    api.uploadDocument.mockResolvedValue(ok(created));
    api.analyzeInvoice.mockResolvedValue(ok(ANALYSIS));
    const { user } = renderUi(<VouchersPanel title="Expenses" description="" />);
    await user.click(await screen.findByRole('button', { name: 'New expense' }));
    const dialog = screen.getByRole('dialog', { name: 'New expense or voucher' });
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'RAW_MATERIALS');

    const bill = new File(['%PDF-1.4'], 'bill.pdf', { type: 'application/pdf' });
    await user.upload(within(dialog).getByLabelText('Attach invoice'), bill);
    expect(await within(dialog).findByRole('status', { name: 'Filled from the invoice' })).toHaveTextContent(
      'Filled from bill.pdf: Invoice number, Date, GST type, Supplier GSTIN, HSN / SAC, Taxable value, CGST, Round off.');
    expect(within(dialog).getByLabelText('Invoice checks')).toHaveTextContent('Taxable value + GST adds up to the bill total of ₹1179.60.');
    expect(within(dialog).getByLabelText('Invoice number')).toHaveValue('SM/7781');
    expect(within(dialog).getByLabelText('Date')).toHaveValue('2026-10-15');
    expect(within(dialog).getByLabelText('Supplier GSTIN')).toHaveValue('27AAPFU0939F1ZV');
    expect(within(dialog).getByLabelText('SGST')).toHaveValue('90');
    expect(within(dialog).getByLabelText('Amount')).toHaveValue('1179.60');

    // Still editable
    await user.clear(within(dialog).getByLabelText('HSN / SAC'));
    await user.type(within(dialog).getByLabelText('HSN / SAC'), '740811');
    await user.type(within(dialog).getByLabelText('Title'), 'Copper wire');
    await user.click(within(dialog).getByRole('button', { name: 'Raise for approval' }));

    await waitFor(() => expect(api.uploadDocument).toHaveBeenCalledWith(12, bill, 'INVOICE'));
    expect(api.createVoucher.mock.calls[0][0]).toMatchObject({
      amount: 1179.6, invoiceNumber: 'SM/7781', expenseDate: '2026-10-15', taxTreatment: 'INTRA_STATE', supplierGstin: '27AAPFU0939F1ZV',
      hsnSac: '740811', taxableAmount: 1000, gstRate: 18, cgst: 90, sgst: 90, roundOff: -0.4,
    });
  });

  it('never overwrites what was typed: the user chooses where the bill differs', async () => {
    signIn('maker', ['EXPENSE_VIEW', 'EXPENSE_SUBMIT']);
    api.analyzeInvoice.mockResolvedValue(ok(ANALYSIS));
    const { user } = renderUi(<VouchersPanel title="Expenses" description="" />);
    await user.click(await screen.findByRole('button', { name: 'New expense' }));
    const dialog = screen.getByRole('dialog', { name: 'New expense or voucher' });
    await user.type(within(dialog).getByLabelText('Invoice number'), 'X-1');

    await user.upload(within(dialog).getByLabelText('Attach invoice'), new File(['%PDF'], 'bill.pdf', { type: 'application/pdf' }));
    const banner = await within(dialog).findByRole('status', { name: 'Filled from the invoice' });
    expect(banner).toHaveTextContent('Invoice number: the bill says SM/7781, you entered X-1.');
    expect(within(dialog).getByLabelText('Invoice number')).toHaveValue('X-1');
    await user.click(within(banner).getByRole('button', { name: 'Use bill value' }));
    expect(within(dialog).getByLabelText('Invoice number')).toHaveValue('SM/7781');
    expect(banner).not.toHaveTextContent('you entered');
  });

  it('accepts only PDFs as invoices and refuses PDFs that are not invoices', async () => {
    signIn('maker', ['EXPENSE_VIEW', 'EXPENSE_SUBMIT']);
    const { user } = renderUi(<VouchersPanel title="Expenses" description="" />);
    await user.click(await screen.findByRole('button', { name: 'New expense' }));
    const dialog = screen.getByRole('dialog', { name: 'New expense or voucher' });
    const invoiceInput = within(dialog).getByLabelText('Attach invoice');
    expect(invoiceInput).toHaveAttribute('accept', '.pdf,application/pdf');

    api.analyzeInvoice.mockResolvedValue(ok({
      ...ANALYSIS, verdict: 'ERROR', checks: [{ level: 'ERROR', code: 'NOT_AN_INVOICE', message: "This PDF doesn't look like an invoice." }],
    }));
    await user.upload(invoiceInput, new File(['%PDF'], 'notes.pdf', { type: 'application/pdf' }));
    expect(await within(dialog).findByText("notes.pdf: This PDF doesn't look like an invoice.")).toBeInTheDocument();
    expect(within(dialog).queryByText(/saved as/)).not.toBeInTheDocument();

    // The picker only offers PDFs, but a drop or a changed filter can still hand over a photo: it is never read
    api.analyzeInvoice.mockClear();
    fireEvent.change(invoiceInput, { target: { files: [new File(['x'], 'bill.jpg', { type: 'image/jpeg' })] } });
    expect(await within(dialog).findByText(/bill\.jpg: an invoice must be the supplier's PDF/)).toBeInTheDocument();
    expect(api.analyzeInvoice).not.toHaveBeenCalled();
    expect(within(dialog).queryByRole('status', { name: 'Filled from the invoice' })).not.toBeInTheDocument();
  });

  it('refuses files that are not bills, and requires the GSTIN of a GST bill', async () => {
    signIn('maker', ['EXPENSE_VIEW', 'EXPENSE_SUBMIT']);
    const { user } = renderUi(<VouchersPanel title="Expenses" description="" />);
    await user.click(await screen.findByRole('button', { name: 'New expense' }));
    const dialog = screen.getByRole('dialog', { name: 'New expense or voucher' });

    // The picker's accept list hides it, but a drop or a changed filter can still hand one over
    fireEvent.change(within(dialog).getByLabelText('Attach receipt or proof'), { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    expect(await within(dialog).findByText('notes.txt: only PDF, JPG, PNG or WEBP files can be attached.')).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText('Category'), 'TRAVEL');
    await user.type(within(dialog).getByLabelText('Title'), 'Hotel');
    await user.click(within(dialog).getByRole('radio', { name: 'Other state — IGST' }));
    await user.type(within(dialog).getByLabelText('Taxable value'), '2000');
    await user.click(within(dialog).getByRole('button', { name: 'Raise for approval' }));
    expect(within(dialog).getByText("Enter the supplier's GSTIN from the bill.")).toBeInTheDocument();
    expect(api.createVoucher).not.toHaveBeenCalled();
  });

  it('shows the breakdown and attached bills in the list, and downloads a bill', async () => {
    signIn('auditor', ['EXPENSE_VIEW']);
    const bill = {
      id: 3, kind: 'INVOICE' as const, fileName: 'EXP-2026-000007_INVOICE_INV-7781_2026-10-18_01.pdf', originalName: 'scan.pdf',
      contentType: 'application/pdf', sizeBytes: 1200, originalSizeBytes: 1200, uploadedBy: 'maker', uploadedAt: '2026-10-18T10:00:00',
      verificationStatus: 'NEEDS_REVIEW' as const, verificationNotes: 'The bill is dated 2026-10-15 but the voucher 2026-10-18.',
    };
    api.listVouchers.mockResolvedValue(page([voucher({
      amountPaise: 118_000, signedAmountPaise: -118_000, taxTreatment: 'INTER_STATE', supplierGstin: '29AAPFU0939F1ZV', taxablePaise: 100_000,
      gstRate: 18, igstPaise: 18_000, gstPaise: 18_000, documents: [bill],
    })]));
    api.downloadDocument.mockResolvedValue(new Blob(['%PDF']));
    const createObjectURL = vi.fn(() => 'blob:bill');
    Object.assign(window.URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const { user } = renderUi(<VouchersPanel title="Expenses" description="" />);

    const row = (await screen.findByText('EXP-2026-000007')).closest('tr')!;
    expect(within(row).getByLabelText('GST breakdown')).toHaveTextContent('Taxable ₹1,000.00 · IGST ₹180.00 @ 18% · GSTIN 29AAPFU0939F1ZV');
    expect(within(row).getByText('incl. GST ₹180.00')).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: `Download ${bill.fileName}` }));
    await waitFor(() => expect(api.downloadDocument).toHaveBeenCalledWith(7, bill));
    expect(createObjectURL).toHaveBeenCalled();
  });
});
