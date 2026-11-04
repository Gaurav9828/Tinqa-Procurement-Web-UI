import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { ProductManagementPage } from './ProductManagementPage';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import { axiosClient } from '../../../api/axiosClient';
import { useAuthStore } from '../../../store/useAuthStore';
import { superAdminPermissions, signInAsSuperAdmin } from '../../../test/access';
import { resetCostingCache } from '../hooks/useCosting';
import type { ItemResponse } from '../../item-management/types/item.types';
import type { ProductResponseDto } from '../types/product.types';
import type { ProductProfit } from '../types/costing.types';
import { fillGst } from './gstTestUtil';
import { noBarcodes, scanUnitBarcodes, openFormTab, fillFrontImage } from './barcodeTestUtil';
import { DIORAMAS, fillCategory } from './categoryTestUtil';

/**
 * Product costing end to end through the HTTP clients: the component's purchase cost comes from Procurement
 * (GET /v1/stocks/items/{id}/cost), extra costs are typed in, the profit is previewed live and the costs are sent
 * with the product (Ecommerce POST /products) and summarised for the approver (Procurement POST /v1/product-approvals).
 */
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
const ecom = vi.mocked(ecommerceAxiosClient);
const procurement = vi.mocked(axiosClient);
type User = ReturnType<typeof userEvent.setup>;

const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, data, timestamp: '', path: '' } });

const MOTHERBOARD: ItemResponse = {
  id: 7,
  categories: [{ id: 1, name: 'Electronics' }],
  name: 'Motherboard',
  sku: 'MB-1',
  unitOfMeasure: 'PCS',
  mrp: 2000,
  countryOfOrigin: 'India',
  isActive: true,
};

const LOCK: ProductResponseDto = {
  id: 1,
  title: 'Smart Lock',
  modelName: 'SL-1',
  category: DIORAMAS,
  price: 11800,
  hsnSac: '9405',
  gstRate: 18,
  enabled: true,
  stockQuantity: 3,
  specs: [],
  userGuide: [],
  warranties: [],
  components: [{ id: 50, itemId: 7, itemName: 'Motherboard', itemSku: 'MB-1', quantity: 2, warranties: [] }],
};

const profit = (revenue: number, cost: number) => {
  const gross = revenue - cost;
  const tax = Math.round(gross * 25.17) / 100;
  return { revenue, cost, grossProfit: gross, marginPercent: (gross * 100) / revenue, markupPercent: (gross * 100) / cost, incomeTaxRate: 25.17, incomeTax: tax, profitAfterTax: gross - tax };
};

const LOCK_PROFIT: ProductProfit = {
  productId: 1,
  title: 'Smart Lock',
  costSheet: {
    listPrice: 11800,
    discountPercentage: null,
    sellingPrice: 11800,
    gstRate: 18,
    gstIncluded: 1800,
    netRevenue: 10000,
    components: [{ itemId: 7, itemName: 'Motherboard', itemSku: 'MB-1', quantity: 2, unitCost: 1500, lineCost: 3000 }],
    componentsCost: 3000,
    componentsWithoutCost: 0,
    costEntries: [{ id: 1, label: 'Manpower', amount: 2000, description: '2 technicians × 4 hours × ₹250/hour' }],
    additionalCost: 2000,
    unitCost: 5000,
    profit: profit(10000, 5000),
    complete: true,
  },
  realised: {
    orders: 2,
    unitsSold: 3,
    salesRevenue: 30000,
    shippingCollected: 300,
    refunded: 0,
    productCost: 15000,
    shippingCost: 450,
    linesWithEstimatedCost: 0,
    profit: profit(30300, 15450),
  },
};

let db: ProductResponseDto[];

const installBackends = () => {
  procurement.get.mockImplementation(async (url: string) => {
    const barcodes = noBarcodes(url);
    if (barcodes) return barcodes;
    if (url.startsWith('/v1/admin/items?')) return ok({ content: [MOTHERBOARD], totalPages: 1, totalElements: 1 });
    if (url === '/v1/stocks') return ok([{ id: 1, itemId: 7, availableUnits: 10, approvalStatus: 'APPROVED', isActive: true }]);
    if (url === '/v1/stocks/items/7/availability') return ok({ itemId: 7, totalAvailableUnits: 10, stocks: [] });
    if (url === '/v1/admin/items/7/warranties') return ok([]);
    if (url === '/v1/stocks/items/7/cost') {
      return ok({ itemId: 7, itemName: 'Motherboard', nextUnitCost: 1500, averageUnitCost: 1520, unitsInStock: 10, lastUnitCost: 1550, lastOrderNumber: 'PO-9' });
    }
    if (url === '/v1/product-approvals/latest') return ok([]);
    throw new Error(`Unexpected GET ${url}`);
  });
  procurement.post.mockImplementation(async (_url: string, body: unknown) => ok({ id: 77, ...(body as object), status: 'PENDING' }));
  ecom.get.mockImplementation(async (url: string) => {
    if (url === '/admin/product-categories') return ok([DIORAMAS]);
    if (url === '/products') return ok(structuredClone(db));
    if (url === '/admin/costing/settings') return ok({ incomeTaxRate: 25.17 });
    if (url === '/admin/costing/products/1') return ok(LOCK_PROFIT);
    throw new Error(`Unexpected GET ${url}`);
  });
  ecom.post.mockImplementation(async (_url: string, raw: unknown) => {
    const product = { ...(raw as ProductResponseDto), id: 2, warranties: [], components: [] } as ProductResponseDto;
    db.push(product);
    return ok(product, 'Product created successfully!');
  });
};

const renderPage = () => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Provider store={store}>
        <GlobalAlertContainer />
        <ProductManagementPage />
      </Provider>
    </MemoryRouter>
  );
  return { user };
};

const openCreate = async (user: User) => {
  await screen.findByText('Smart Lock');
  await user.click(screen.getByRole('button', { name: /Create Product/ }));
  await user.type(screen.getByPlaceholderText('Product Title'), 'Smart Lock Pro');
  await user.type(screen.getByLabelText(/Model name/), 'MDL-4');
  await openFormTab(user, 'Price & GST');
  await user.type(screen.getByPlaceholderText('0.00'), '11800');
  await fillFrontImage(user);
  await fillGst(user);
  await fillCategory(user);
};

const addMotherboard = async (user: User) => {
  const components = screen.getByRole('group', { name: 'Components' });
  await user.click(within(components).getByRole('button', { name: 'Add Component' }));
  const row = within(components).getByRole('group', { name: 'Component 1' });
  await waitFor(() => expect(within(row).getAllByRole('option').length).toBeGreaterThan(1));
  await user.selectOptions(within(row).getByLabelText('Item *'), '7');
  await waitFor(() => expect(within(row).getByTestId('component-status')).not.toHaveTextContent('Loading'));
  await user.selectOptions(within(row).getByLabelText(/^Qty per product/), '2');
  return row;
};

const costing = () => screen.getByRole('group', { name: 'Costing' });
const earns = () => within(costing()).getByRole('region', { name: 'What one unit earns' });

beforeEach(() => {
  signInAsSuperAdmin('ADMIN_L1');
  vi.clearAllMocks();
  resetCostingCache();
  db = [structuredClone(LOCK)];
  installBackends();
});

describe('Product costing', () => {
  it('fills the component cost from its purchase price, adds manpower with its reason and previews profit after tax', async () => {
    const { user } = renderPage();
    await openCreate(user);
    await openFormTab(user, 'Components & barcodes');
    const row = await addMotherboard(user);

    // Stock is used oldest first, so the next unit's landed cost is suggested
    expect(within(row).getByLabelText('Unit cost (₹)')).toHaveValue('1500.00');
    expect(within(row).getByTestId('component-line-cost')).toHaveTextContent('× 2 = ₹3,000.00');
    expect(within(row.parentElement!).getByTestId('component-cost-hint')).toHaveTextContent('next unit ₹1,500.00 · average ₹1,520.00 · last bought ₹1,550.00 (PO-9)');

    await openFormTab(user, 'Costs');
    await user.click(within(costing()).getByRole('button', { name: '+ Manpower' }));
    const manpower = within(costing()).getByRole('group', { name: 'Extra cost 1' });
    expect(within(manpower).getByLabelText('Cost *')).toHaveValue('Manpower');
    await user.type(within(manpower).getByLabelText('Amount (₹) *'), '2000');
    await user.type(within(manpower).getByLabelText('How it was worked out'), '2 technicians × 4 hours × ₹250/hour');

    // ₹11,800 incl. 18 % GST → ₹10,000 revenue; cost 2 × ₹1,500 + ₹2,000 = ₹5,000
    expect(within(earns()).getByTestId('cost-net-revenue')).toHaveTextContent('₹10,000.00');
    expect(within(earns()).getByTestId('cost-unit')).toHaveTextContent('₹5,000.00');
    expect(within(earns()).getByTestId('profit-gross')).toHaveTextContent('₹5,000.00');
    expect(within(earns()).getByTestId('profit-margin')).toHaveTextContent('50.0% · 100.0%');
    await waitFor(() => expect(within(earns()).getByTestId('profit-tax')).toHaveTextContent('₹1,258.50'));
    expect(within(earns()).getByTestId('profit-pat')).toHaveTextContent('₹3,741.50');

    await scanUnitBarcodes(user);
    await user.click(screen.getAllByRole('button', { name: 'Create Product' }).at(-1)!);
    expect(within(screen.getByTestId('preview-costing')).getByText('2 technicians × 4 hours × ₹250/hour')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));

    await waitFor(() => expect(ecom.post).toHaveBeenCalled());
    const body = ecom.post.mock.calls[0][1] as { components: { unitCost?: number }[]; costEntries: unknown[] };
    expect(body.components[0].unitCost).toBe(1500);
    expect(body.costEntries).toEqual([{ label: 'Manpower', amount: 2000, description: '2 technicians × 4 hours × ₹250/hour' }]);

    // The approver sees one unit's cost and profit
    await waitFor(() => expect(procurement.post).toHaveBeenCalledWith('/v1/product-approvals', expect.anything()));
    const approval = procurement.post.mock.calls[0][1] as { snapshot: { costSummary: unknown } };
    expect(approval.snapshot.costSummary).toEqual({
      unitCost: 5000,
      netRevenue: 10000,
      grossProfit: 5000,
      marginPercent: 50,
      profitAfterTax: 3741.5,
      componentsWithoutCost: 0,
    });
  });

  it('flags a component without a cost and blocks a malformed amount', async () => {
    procurement.get.mockImplementation(async (url: string) => {
      if (url === '/v1/stocks/items/7/cost') return ok({ itemId: 7, itemName: 'Motherboard', nextUnitCost: null, averageUnitCost: null, unitsInStock: 0, lastUnitCost: null });
      if (url.startsWith('/v1/admin/items?')) return ok({ content: [MOTHERBOARD], totalPages: 1, totalElements: 1 });
      if (url === '/v1/stocks') return ok([{ id: 1, itemId: 7, availableUnits: 10, approvalStatus: 'APPROVED', isActive: true }]);
      if (url === '/v1/stocks/items/7/availability') return ok({ itemId: 7, totalAvailableUnits: 10, stocks: [] });
      if (url === '/v1/admin/items/7/warranties') return ok([]);
      return ok([]);
    });
    const { user } = renderPage();
    await openCreate(user);
    await openFormTab(user, 'Components & barcodes');
    const row = await addMotherboard(user);
    expect(within(row).getByLabelText('Unit cost (₹)')).toHaveValue('');
    await openFormTab(user, 'Costs');
    expect(within(earns()).getByText('1 component has no unit cost yet, so the cost is understated.')).toBeInTheDocument();

    await openFormTab(user, 'Components & barcodes');
    await user.type(within(row).getByLabelText('Unit cost (₹)'), '12.345');
    await scanUnitBarcodes(user);
    await user.click(screen.getAllByRole('button', { name: 'Create Product' }).at(-1)!);
    expect(await within(row).findByText('Enter an amount of 0 or more with at most 2 decimals.')).toBeInTheDocument();
    expect(ecom.post).not.toHaveBeenCalled();
  });

  it('shows the cost sheet and the profit made so far in the product details', async () => {
    const { user } = renderPage();
    await screen.findByText('Smart Lock');
    await user.click(screen.getByTitle('View details'));
    const panel = await screen.findByTestId('product-profit');
    expect(await within(panel).findByText('2 technicians × 4 hours × ₹250/hour')).toBeInTheDocument();
    const perUnit = within(panel).getByRole('region', { name: "Per unit at today's price" });
    expect(within(perUnit).getByTestId('profit-pat')).toHaveTextContent('₹3,741.50');
    const earned = within(panel).getByRole('region', { name: /Earned so far — 3 units in 2 delivered orders/ });
    expect(within(earned).getByTestId('realised-sales')).toHaveTextContent('₹30,000.00');
    expect(within(earned).getByTestId('profit-gross')).toHaveTextContent('₹14,850.00');
  });

  it('asks for no costs and shows none without PRODUCT_COST_VIEW', async () => {
    useAuthStore.setState({
      user: {
        userId: 5,
        username: 'catalog',
        email: 'catalog@tinqa.com',
        role: 'ADMIN_L1',
        authClient: 'web',
        isFirstLogin: false,
        permissions: superAdminPermissions('ADMIN_L1').filter((p) => p !== 'PRODUCT_COST_VIEW' && p !== 'PRODUCT_COST_EDIT'),
      },
    });
    const { user } = renderPage();
    await openCreate(user);
    await openFormTab(user, 'Components & barcodes');
    const row = await addMotherboard(user);
    expect(within(row).queryByLabelText('Unit cost (₹)')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Costing' })).not.toBeInTheDocument();

    await scanUnitBarcodes(user);
    await user.click(screen.getAllByRole('button', { name: 'Create Product' }).at(-1)!);
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await waitFor(() => expect(ecom.post).toHaveBeenCalled());
    const body = ecom.post.mock.calls[0][1] as { components: Record<string, unknown>[]; costEntries?: unknown };
    expect(body.components[0]).not.toHaveProperty('unitCost');
    expect(body).not.toHaveProperty('costEntries');
    const urls = [...procurement.get.mock.calls, ...ecom.get.mock.calls].map(([url]) => String(url));
    expect(urls.filter((url) => url.includes('cost'))).toEqual([]);
  });
});
