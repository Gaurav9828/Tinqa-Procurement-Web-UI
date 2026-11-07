import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { ProductManagementPage } from './ProductManagementPage';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import { axiosClient } from '../../../api/axiosClient';
import { signInAsSuperAdmin, superAdminPermissions } from '../../../test/access';
import { useAuthStore } from '../../../store/useAuthStore';
import type { ProductResponseDto } from '../types/product.types';
import type { StockDraftDetail } from '../types/stockDraft.types';
import type { NewProductUnit } from '../../barcodes/types/barcode.types';
import { DIORAMAS } from './categoryTestUtil';

/**
 * Product Management › Stock entry against a small fake of the Ecommerce BE ProductStockDraftController
 * (/product-stock-drafts): one draft per product, versions, cell-path errors, submit adding the stock. Only the HTTP
 * clients are mocked.
 */
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../api/axiosClient', () => ({ axiosClient: { get: vi.fn() } }));
const http = vi.mocked(ecommerceAxiosClient);

const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, errorCode: null, data, timestamp: '', path: '' } });
const httpError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data: { success: false, ...data }, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message), String(status), response.config, {}, response);
};

const COMPONENTS = [
  { id: 50, itemId: 7, itemName: 'Motherboard', itemSku: 'MB-1', quantity: 1, warranties: [] },
  { id: 51, itemId: 8, itemName: 'USB Cable', itemSku: 'USB-C', quantity: 2, warranties: [] },
];
const LAPTOP: ProductResponseDto = {
  id: 1,
  title: 'Laptop X',
  modelName: 'LX-1',
  category: DIORAMAS,
  price: 59999,
  image1Url: 'https://cdn.tinqa.com/laptop.png',
  enabled: true,
  stockQuantity: 3,
  specs: [],
  userGuide: [],
  warranties: [],
  components: COMPONENTS,
};

let products: ProductResponseDto[];
// Item stock (approved) and the barcodes of the pieces in stock, per item: 5 motherboards and 12 cables (2 per unit)
let available: Record<number, number>;
let piecesInStock: Record<number, string[]>;
const codes = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(8 - prefix.length, '0')}`);
let drafts: StockDraftDetail[];
let nextDraftId: number;

const summary = ({ units: _u, components: _c, version: _v, stockChecked: _s, ...rest }: StockDraftDetail) => {
  void _u;
  void _c;
  void _v;
  void _s;
  return rest;
};
const complete = (units: NewProductUnit[]) =>
  units.filter((unit) => unit.barcode && COMPONENTS.every((c) => unit.parts.find((p) => p.itemId === c.itemId)?.barcodes.length === c.quantity)).length;

const installBackend = () => {
  vi.mocked(axiosClient.get).mockImplementation((async (url: string, config?: { params?: { itemId?: number } }) => {
    const availability = /^\/v1\/stocks\/items\/(\d+)\/availability$/.exec(url);
    if (availability) return ok({ itemId: Number(availability[1]), totalAvailableUnits: available[Number(availability[1])] ?? 0, stocks: [] });
    // The pieces of an item in stock, by barcode
    if (url === '/v1/barcodes' && config?.params?.itemId) {
      return ok((piecesInStock[config.params.itemId] ?? []).map((code, i) => ({ id: i + 1, code, unitType: 'ITEM_UNIT', status: 'IN_STOCK' })));
    }
    // Approvals: none recorded, so the enabled product counts as approved; no barcodes listed
    return ok(url.startsWith('/v1/barcodes') || url.startsWith('/v1/product-approvals') ? [] : { content: [], totalPages: 0, totalElements: 0 });
  }) as never);
  http.get.mockImplementation(async (url: string) => {
    if (url === '/admin/product-categories') return ok([DIORAMAS]);
    if (url === '/products') return ok(structuredClone(products));
    if (url === '/product-stock-drafts') return ok(drafts.map(summary));
    const one = /^\/product-stock-drafts\/(\d+)$/.exec(url);
    const found = one && drafts.find((draft) => draft.id === Number(one[1]));
    if (found) return ok(structuredClone(found));
    throw httpError(404, { message: 'Stock entry draft not found', errorCode: 'STOCK_DRAFT_NOT_FOUND' });
  });
  http.post.mockImplementation(async (url: string, raw: unknown) => {
    if (url === '/product-stock-drafts') {
      const body = raw as { productId: number; quantity: number; note: string | null; units: NewProductUnit[] };
      const draft: StockDraftDetail = {
        id: nextDraftId++,
        productId: body.productId,
        productTitle: products.find((p) => p.id === body.productId)!.title,
        quantity: body.quantity,
        completeUnits: complete(body.units),
        note: body.note,
        units: body.units,
        components: COMPONENTS.map(({ itemId, itemName, quantity }) => ({ itemId, itemName, quantity })),
        version: 0,
        stockChecked: true,
        createdBy: 'admin@tinqa.com',
        updatedBy: 'admin@tinqa.com',
        createdAt: '2026-11-06T09:00:00Z',
        updatedAt: '2026-11-06T09:00:00Z',
      };
      drafts.push(draft);
      return ok(structuredClone(draft), 'Stock entry draft saved');
    }
    const submit = /^\/product-stock-drafts\/(\d+)\/submit$/.exec(url);
    if (submit) {
      const draft = drafts.find((d) => d.id === Number(submit[1]))!;
      if ((raw as { version: number }).version !== draft.version) throw httpError(409, { message: 'Someone else saved this draft', errorCode: 'STOCK_DRAFT_STALE' });
      drafts = drafts.filter((d) => d !== draft);
      products = products.map((p) => (p.id === draft.productId ? { ...p, stockQuantity: (p.stockQuantity ?? 0) + draft.quantity } : p));
      return ok(products[0], 'Product stock updated successfully');
    }
    throw httpError(405, { message: 'Method not allowed' });
  });
  http.put.mockImplementation(async (url: string, raw: unknown) => {
    const id = Number(/^\/product-stock-drafts\/(\d+)$/.exec(url)?.[1]);
    const body = raw as { version: number; quantity: number; note: string | null; units: NewProductUnit[] };
    const index = drafts.findIndex((d) => d.id === id);
    if (drafts[index].version !== body.version) throw httpError(409, { message: 'Someone else saved this draft', errorCode: 'STOCK_DRAFT_STALE' });
    drafts[index] = { ...drafts[index], quantity: body.quantity, note: body.note, units: body.units, completeUnits: complete(body.units), version: body.version + 1 };
    return ok(structuredClone(drafts[index]), 'Stock entry draft saved');
  });
  http.delete.mockImplementation(async (url: string) => {
    const id = Number(/^\/product-stock-drafts\/(\d+)$/.exec(url)?.[1]);
    drafts = drafts.filter((d) => d.id !== id);
    return ok(null, 'Stock entry draft deleted');
  });
};

const renderPage = (url = '/products') => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[url]}>
      <Provider store={store}>
        <GlobalAlertContainer />
        <ProductManagementPage />
      </Provider>
    </MemoryRouter>
  );
  return { user };
};

const draftCalls = () =>
  [...http.get.mock.calls, ...http.post.mock.calls, ...http.put.mock.calls, ...http.delete.mock.calls]
    .map(([url]) => String(url))
    .filter((url) => url.startsWith('/product-stock-drafts'));

const cell = (entry: HTMLElement, unit: number, column: string) => within(entry).getByLabelText(`Unit ${unit} ${column}`);
const COLUMNS = ['Unit barcode', 'Motherboard', 'USB Cable #1', 'USB Cable #2'];

/** Like a scanner: the code, then Enter (which moves to the next cell). */
const scanRow = async (user: ReturnType<typeof userEvent.setup>, codes: string[]) => {
  for (const code of codes) await user.keyboard(`${code}{Enter}`);
};

const startEntry = async (user: ReturnType<typeof userEvent.setup>, units: number) => {
  await user.click(await screen.findByRole('button', { name: 'Add stock for Laptop X' }));
  const entry = await screen.findByRole('region', { name: 'Stock entry for Laptop X' });
  const quantity = within(entry).getByLabelText('Units to add');
  // Offered once the components in stock are known
  await waitFor(() => expect(quantity).toBeEnabled());
  await user.selectOptions(quantity, String(units));
  return entry;
};

beforeEach(() => {
  signInAsSuperAdmin('ADMIN_L1');
  products = [structuredClone(LAPTOP)];
  drafts = [];
  nextDraftId = 1;
  available = { 7: 20, 8: 20 };
  piecesInStock = { 7: codes('MB', 5), 8: codes('USB', 12) };
  installBackend();
});

describe('Stock entry tab', () => {
  it('is a tab of its own that loads its drafts only when opened', async () => {
    const { user } = renderPage();
    await screen.findByText('Laptop X');
    expect(draftCalls()).toEqual([]);
    await user.click(screen.getByRole('tab', { name: 'Stock entry' }));
    expect(await screen.findByText(/No drafts\./)).toBeInTheDocument();
    expect(draftCalls()).toEqual(['/product-stock-drafts']);
    // New entries are started for approved products
    expect(within(screen.getByLabelText('Product')).getByRole('option', { name: /Laptop X \(LX-1\) · 3 in stock/ })).toBeInTheDocument();
  });

  it('is not offered without STOREFRONT_STOCK_UPDATE, even by its address, and loads nothing', async () => {
    const user = useAuthStore.getState().user!;
    useAuthStore.setState({ user: { ...user, permissions: superAdminPermissions('ADMIN_L1').filter((p) => p !== 'STOREFRONT_STOCK_UPDATE') } });
    renderPage('/products?tab=stock-entry&product=1');
    await screen.findByText('Laptop X');
    expect(screen.queryByRole('tab', { name: 'Stock entry' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Stock entry for/ })).not.toBeInTheDocument();
    expect(draftCalls()).toEqual([]);
  });

  it('gives each unit a row: its barcode, then one cell per piece fitted into it, and saves it as a draft', async () => {
    const { user } = renderPage();
    const entry = await startEntry(user, 2);
    expect(within(entry).getAllByRole('row')).toHaveLength(3);

    await user.click(cell(entry, 1, 'Unit barcode'));
    await scanRow(user, ['unit0001', 'MB000001', 'USB00001', 'USB00002']);
    // Enter after the last piece moved on to the next unit
    expect(cell(entry, 2, 'Unit barcode')).toHaveFocus();
    await scanRow(user, ['UNIT0002', 'MB000002']);
    expect(within(entry).getByTestId('stock-entry-progress')).toHaveTextContent('1 of 2 units complete');
    // Not every unit is complete yet: it can only be saved as a draft
    expect(within(entry).getByRole('button', { name: 'Add 2 units to stock' })).toBeDisabled();

    await user.click(within(entry).getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    expect(http.post.mock.calls[0]).toEqual([
      '/product-stock-drafts',
      {
        productId: 1,
        quantity: 2,
        note: null,
        units: [
          { barcode: 'UNIT0001', parts: [{ itemId: 7, barcodes: ['MB000001'] }, { itemId: 8, barcodes: ['USB00001', 'USB00002'] }] },
          { barcode: 'UNIT0002', parts: [{ itemId: 7, barcodes: ['MB000002'] }, { itemId: 8, barcodes: [] }] },
        ],
      },
    ]);
    expect(await screen.findByText('Draft saved: 1 of 2 units complete.')).toBeInTheDocument();

    await user.click(within(entry).getByRole('button', { name: 'Back to stock entries' }));
    const list = await screen.findByRole('table');
    expect(within(list).getByText('Laptop X')).toBeInTheDocument();
    expect(within(list).getByText('1 of 2')).toBeInTheDocument();
  });

  it('fills the grid from a block pasted from a spreadsheet', async () => {
    const { user } = renderPage();
    const entry = await startEntry(user, 2);
    fireEvent.paste(cell(entry, 1, 'Unit barcode'), {
      clipboardData: { getData: () => 'UNIT0001\tMB000001\tUSB00001\tUSB00002\nUNIT0002\tMB000002\tUSB00003\tUSB00004\nUNIT0003\tMB000003\tUSB00005\tUSB00006' },
    });
    expect(COLUMNS.map((column) => (cell(entry, 2, column) as HTMLInputElement).value)).toEqual(['UNIT0002', 'MB000002', 'USB00003', 'USB00004']);
    expect(within(entry).getByTestId('stock-entry-progress')).toHaveTextContent('2 of 2 units complete');
    // The third row didn't fit
    expect(await screen.findByText(/4 pasted barcodes didn't fit the grid/)).toBeInTheDocument();
  });

  it('marks a code used twice and blocks the submit until it is fixed', async () => {
    const { user } = renderPage();
    const entry = await startEntry(user, 1);
    await user.click(cell(entry, 1, 'Unit barcode'));
    await scanRow(user, ['UNIT0001', 'MB000001', 'USB00001', 'USB00001']);
    expect(cell(entry, 1, 'USB Cable #1')).toHaveAttribute('aria-invalid', 'true');
    expect(cell(entry, 1, 'USB Cable #2')).toHaveAttribute('aria-invalid', 'true');
    expect(within(entry).getByTestId('stock-entry-problems')).toHaveTextContent('USB00001 is entered more than once');
    expect(within(entry).getByRole('button', { name: 'Add 1 unit to stock' })).toBeDisabled();

    await user.clear(cell(entry, 1, 'USB Cable #2'));
    await user.type(cell(entry, 1, 'USB Cable #2'), 'USB00002');
    expect(within(entry).getByRole('button', { name: 'Add 1 unit to stock' })).toBeEnabled();
  });

  it('keeps every row when a save is refused, and marks the cells the server names', async () => {
    http.post.mockRejectedValueOnce(
      httpError(409, {
        message: 'Barcodes are not available',
        errorCode: 'BARCODE_NOT_AVAILABLE',
        errors: [
          { field: 'units[0].parts[1].barcodes[1]', message: 'Barcode USB00002 (USB Cable) is not in stock: it is fitted in a product' },
          { field: 'units[0].parts[0].barcodes[0]', message: 'Barcode MB000001 is already in the stock entry draft for Laptop Y' },
        ],
      })
    );
    const { user } = renderPage();
    const entry = await startEntry(user, 1);
    await user.click(cell(entry, 1, 'Unit barcode'));
    await scanRow(user, ['UNIT0001', 'MB000001', 'USB00001', 'USB00002']);
    await user.click(within(entry).getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(cell(entry, 1, 'USB Cable #2')).toHaveAttribute('aria-invalid', 'true'));
    expect(cell(entry, 1, 'Motherboard')).toHaveAttribute('aria-invalid', 'true');
    expect(cell(entry, 1, 'USB Cable #1')).not.toHaveAttribute('aria-invalid');
    expect(within(entry).getByTestId('stock-entry-problems')).toHaveTextContent('Unit 1, USB Cable #2: Barcode USB00002 (USB Cable) is not in stock');
    expect((cell(entry, 1, 'Unit barcode') as HTMLInputElement).value).toBe('UNIT0001');

    // Changing a marked cell clears its mark only
    await user.clear(cell(entry, 1, 'USB Cable #2'));
    await user.type(cell(entry, 1, 'USB Cable #2'), 'USB00009');
    expect(cell(entry, 1, 'USB Cable #2')).not.toHaveAttribute('aria-invalid');
    expect(cell(entry, 1, 'Motherboard')).toHaveAttribute('aria-invalid', 'true');
  });

  it('continues a saved draft, saves it with its version, and submits it into stock', async () => {
    drafts = [
      {
        id: 4,
        productId: 1,
        productTitle: 'Laptop X',
        quantity: 2,
        completeUnits: 1,
        note: 'November batch',
        units: [
          { barcode: 'UNIT0001', parts: [{ itemId: 7, barcodes: ['MB000001'] }, { itemId: 8, barcodes: ['USB00001', 'USB00002'] }] },
          { barcode: 'UNIT0002', parts: [{ itemId: 7, barcodes: ['MB000002'] }, { itemId: 8, barcodes: ['USB00003'] }] },
        ],
        components: [
          { itemId: 7, itemName: 'Motherboard', quantity: 1 },
          { itemId: 8, itemName: 'USB Cable', quantity: 2 },
        ],
        version: 3,
        stockChecked: false,
        createdBy: 'ravi@tinqa.com',
        updatedBy: 'ravi@tinqa.com',
        createdAt: '2026-11-05T09:00:00Z',
        updatedAt: '2026-11-05T10:00:00Z',
      },
    ];
    nextDraftId = 5;
    const { user } = renderPage();
    // Add stock on a product with a draft continues that draft
    await user.click(await screen.findByRole('button', { name: 'Add stock for Laptop X' }));
    const entry = await screen.findByRole('region', { name: 'Stock entry for Laptop X' });
    await waitFor(() => expect((cell(entry, 2, 'USB Cable #1') as HTMLInputElement).value).toBe('USB00003'));
    expect(within(entry).getByLabelText(/Reason/)).toHaveValue('November batch');
    expect(within(entry).getByTestId('stock-entry-progress')).toHaveTextContent('1 of 2 units complete · draft saved by ravi@tinqa.com');

    await user.click(cell(entry, 2, 'USB Cable #2'));
    await user.keyboard('USB00004');
    await user.click(within(entry).getByRole('button', { name: 'Add 2 units to stock' }));

    // The change is saved (with the version it was loaded at), then submitted with the new version
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/product-stock-drafts/4/submit', { version: 4 }));
    expect(http.put.mock.calls[0][0]).toBe('/product-stock-drafts/4');
    expect(http.put.mock.calls[0][1]).toMatchObject({ version: 3, quantity: 2, note: 'November batch' });
    expect(await screen.findByText('Product stock updated successfully')).toBeInTheDocument();
    expect(await screen.findByText(/No drafts\./)).toBeInTheDocument();
    expect(drafts).toEqual([]);
    expect(products[0].stockQuantity).toBe(5);
  });

  it('keeps the draft and marks the unit when the stock change is refused', async () => {
    const { user } = renderPage();
    const entry = await startEntry(user, 1);
    await user.click(cell(entry, 1, 'Unit barcode'));
    await scanRow(user, ['UNIT0001', 'MB000001', 'USB00001', 'USB00002']);
    const submit = http.post.getMockImplementation()!;
    http.post.mockImplementation(async (url: string, body: unknown) => {
      if (url.endsWith('/submit')) {
        throw httpError(409, {
          message: 'Barcode MB000001 (Motherboard) is not in stock: it is fitted in a product',
          errorCode: 'BARCODE_NOT_AVAILABLE',
          errors: [{ field: 'productUnits.added[0].parts', message: 'Barcode MB000001 (Motherboard) is not in stock: it is fitted in a product' }],
        });
      }
      return submit(url, body);
    });
    await user.click(within(entry).getByRole('button', { name: 'Add 1 unit to stock' }));

    await waitFor(() => expect(cell(entry, 1, 'Motherboard')).toHaveAttribute('aria-invalid', 'true'));
    expect(drafts).toHaveLength(1); // saved first, kept after the refusal
    expect(screen.getByRole('region', { name: 'Stock entry for Laptop X' })).toBeInTheDocument();
  });

  it('deletes a draft only after asking', async () => {
    const { user } = renderPage();
    const entry = await startEntry(user, 1);
    await user.click(cell(entry, 1, 'Unit barcode'));
    await scanRow(user, ['UNIT0001']);
    await user.click(within(entry).getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Draft saved: 0 of 1 units complete.');

    await user.click(within(entry).getByRole('button', { name: 'Delete draft' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Delete this draft?' });
    expect(http.delete).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole('button', { name: 'Delete draft' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/product-stock-drafts/1'));
    expect(await screen.findByText(/No drafts\./)).toBeInTheDocument();
  });

  it('asks before leaving with unsaved changes', async () => {
    const { user } = renderPage();
    const entry = await startEntry(user, 1);
    await user.click(cell(entry, 1, 'Unit barcode'));
    await user.keyboard('UNIT0001');
    await user.click(within(entry).getByRole('button', { name: 'Back to stock entries' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
    await user.click(within(confirm).getByRole('button', { name: 'Keep working' }));
    expect((cell(entry, 1, 'Unit barcode') as HTMLInputElement).value).toBe('UNIT0001');
  });

  it('offers only as many units as the components in stock can build', async () => {
    // 5 motherboards (1 per unit) and 12 cables (2 per unit): 5 complete sets
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add stock for Laptop X' }));
    const entry = await screen.findByRole('region', { name: 'Stock entry for Laptop X' });
    const quantity = within(entry).getByLabelText('Units to add');
    await waitFor(() => expect(quantity).toBeEnabled());
    expect(quantity.tagName).toBe('SELECT');
    expect(within(quantity).getAllByRole('option').map((option) => option.textContent)).toEqual(['1', '2', '3', '4', '5']);
    expect(within(entry).getByTestId('stock-entry-capacity')).toHaveTextContent(
      'Up to 5 units can be built from the components in stock (Motherboard: 5 in stock with a barcode, 1 per unit).'
    );
  });

  it('counts only the pieces that carry a barcode, and the approved item stock, whichever is fewer', async () => {
    available = { 7: 20, 8: 3 }; // 3 cables approved in stock: one unit (2 per unit)
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add stock for Laptop X' }));
    const entry = await screen.findByRole('region', { name: 'Stock entry for Laptop X' });
    const quantity = within(entry).getByLabelText('Units to add');
    await waitFor(() => expect(within(quantity).getAllByRole('option').map((option) => option.textContent)).toEqual(['1']));
    expect(within(entry).getByTestId('stock-entry-capacity')).toHaveTextContent('USB Cable: 3 in stock with a barcode, 2 per unit');
  });

  it('builds nothing when not one set of components is in stock', async () => {
    piecesInStock = { 7: [], 8: codes('USB', 12) };
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add stock for Laptop X' }));
    const entry = await screen.findByRole('region', { name: 'Stock entry for Laptop X' });
    expect(await within(entry).findByText(/No component available to add this product/)).toBeInTheDocument();
    const quantity = within(entry).getByLabelText('Units to add');
    expect(quantity.tagName).toBe('SELECT');
    expect(quantity).toBeDisabled();
    expect(quantity).toHaveDisplayValue('0');
    // No rows to fill in
    expect(within(entry).queryByRole('table')).not.toBeInTheDocument();
    expect(within(entry).getByRole('button', { name: 'Save draft' })).toBeDisabled();
  });

  it('refuses to save or submit a draft with more units than the components now allow, until lowered', async () => {
    drafts = [
      {
        id: 4, productId: 1, productTitle: 'Laptop X', quantity: 7, completeUnits: 0, note: null, units: [],
        components: [{ itemId: 7, itemName: 'Motherboard', quantity: 1 }, { itemId: 8, itemName: 'USB Cable', quantity: 2 }],
        version: 1, stockChecked: true, createdBy: 'ravi@tinqa.com', updatedBy: 'ravi@tinqa.com',
        createdAt: '2026-11-05T09:00:00Z', updatedAt: '2026-11-05T10:00:00Z',
      },
    ];
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add stock for Laptop X' }));
    const entry = await screen.findByRole('region', { name: 'Stock entry for Laptop X' });
    expect(await within(entry).findByText(/This entry has 7 units, but the components in stock allow only 5/)).toBeInTheDocument();
    expect(within(entry).getByRole('button', { name: 'Save draft' })).toBeDisabled();

    await user.selectOptions(within(entry).getByLabelText('Units to add'), '5');
    expect(within(entry).queryByText(/allow only 5/)).not.toBeInTheDocument();
    expect(within(entry).getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });

  it('drops down the pieces in stock when a piece cell is clicked, leaves out those already entered, and still takes typing', async () => {
    const { user } = renderPage();
    const entry = await startEntry(user, 2);
    await user.click(cell(entry, 1, 'USB Cable #1'));
    const list = screen.getByRole('listbox', { name: 'USB Cable pieces in stock' });
    expect(within(list).getAllByRole('option')).toHaveLength(12);
    await user.click(within(list).getByRole('option', { name: 'USB00003' }));
    expect(cell(entry, 1, 'USB Cable #1')).toHaveValue('USB00003');

    // The next cable cell no longer offers the picked piece; typing narrows the list
    await user.click(cell(entry, 1, 'USB Cable #2'));
    const next = screen.getByRole('listbox', { name: 'USB Cable pieces in stock' });
    expect(within(next).queryByRole('option', { name: 'USB00003' })).not.toBeInTheDocument();
    await user.keyboard('0001');
    expect(within(next).getAllByRole('option').map((option) => option.textContent)).toEqual(['USB00001', 'USB00010', 'USB00011', 'USB00012']);
    // Arrow down + Enter picks the highlighted piece and moves on to the next unit
    await user.keyboard('{ArrowDown}{Enter}');
    expect(cell(entry, 1, 'USB Cable #2')).toHaveValue('USB00001');
    expect(cell(entry, 2, 'Unit barcode')).toHaveFocus();
    // The unit's own barcode is new: no list
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('gives a component used twice per unit two columns, one barcode each', async () => {
    products = [{ ...structuredClone(LAPTOP), components: [{ id: 60, itemId: 9, itemName: 'Touch panel', itemSku: 'TP-1', quantity: 2, warranties: [] }] }];
    available = { 9: 20 };
    piecesInStock = { 9: codes('TP', 10) };
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add stock for Laptop X' }));
    const entry = await screen.findByRole('region', { name: 'Stock entry for Laptop X' });
    expect(within(entry).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Unit', 'Unit barcode', 'Touch panel #1', 'Touch panel #2', 'Complete',
    ]);
    // 10 panels, 2 per unit: up to 5 units
    expect(await within(entry).findByTestId('stock-entry-capacity')).toHaveTextContent('Up to 5 units');
  });

  it('is a list even for a product without components, set to 0 and locked, with no rows to fill in', async () => {
    products = [{ ...structuredClone(LAPTOP), components: [] }];
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add stock for Laptop X' }));
    const entry = await screen.findByRole('region', { name: 'Stock entry for Laptop X' });
    const quantity = within(entry).getByLabelText('Units to add');
    expect(quantity.tagName).toBe('SELECT');
    expect(quantity).toBeDisabled();
    expect(quantity).toHaveDisplayValue('0');
    expect(within(entry).getByRole('alert')).toHaveTextContent('No component available');
    expect(within(entry).queryByRole('table')).not.toBeInTheDocument();
    expect(within(entry).getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(within(entry).getByRole('button', { name: /^Add \d+ units? to stock$/ })).toBeDisabled();
  });

  it('shows no rows while the components in stock are still being checked', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const base = vi.mocked(axiosClient.get).getMockImplementation()!;
    vi.mocked(axiosClient.get).mockImplementation((async (url: string, config?: unknown) => {
      if (url.includes('/availability')) await gate;
      return base(url, config as never);
    }) as never);
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add stock for Laptop X' }));
    const entry = await screen.findByRole('region', { name: 'Stock entry for Laptop X' });
    expect(within(entry).getByLabelText('Units to add')).toBeDisabled();
    expect(within(entry).queryByRole('table')).not.toBeInTheDocument();
    release();
    expect(await within(entry).findByRole('table')).toBeInTheDocument();
  });
});
