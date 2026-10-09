import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { ProductManagementPage } from './ProductManagementPage';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import { axiosClient } from '../../../api/axiosClient';
import type { ItemResponse, ItemWarrantyResponse } from '../../item-management/types/item.types';
import type { ProductComponentRequest, ProductComponentResponse, ProductResponseDto } from '../types/product.types';

/**
 * Two fake backends, HTTP clients only:
 *  - Procurement (axiosClient): item list + GET /v1/admin/items/{id}/warranties.
 *  - Ecommerce (ecommerceAxiosClient): products; `components` on PUT replaces all when present,
 *    is left untouched when the key is omitted (ProductService.replaceComponents).
 */
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../api/axiosClient', () => ({ axiosClient: { get: vi.fn() } }));
const ecom = vi.mocked(ecommerceAxiosClient);
const procurement = vi.mocked(axiosClient);
type User = ReturnType<typeof userEvent.setup>;

const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, data, timestamp: '', path: '' } });
const httpError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message), String(status), response.config, {}, response);
};

// ---------- Procurement items ----------
const iw = (id: number, itemId: number, title: string, extra: Partial<ItemWarrantyResponse> = {}): ItemWarrantyResponse => ({
  id,
  itemId,
  warrantyType: 'MANUFACTURER',
  title,
  durationValue: 3,
  durationUnit: 'YEARS',
  provider: 'ASUS',
  coverage: 'Board defects',
  exclusions: null,
  termsAndConditions: null,
  isActive: true,
  ...extra,
});
const item = (id: number, name: string, sku: string, isActive = true): ItemResponse => ({
  id,
  categoryId: 1,
  name,
  sku,
  unitOfMeasure: 'PCS',
  mrp: 100,
  countryOfOrigin: 'India',
  isActive,
});
const ITEMS = [
  item(7, 'Motherboard', 'MB-1'),
  item(8, 'USB Cable', 'USB-C'),
  item(9, 'Display', 'DSP-14'),
  item(10, 'Old Fan', 'FAN-0', false),
  item(11, 'GPU', 'GPU-1'),
];
// Stock list (cached by the app for 60s, so constant here): GPU has none, Old Fan is inactive.
const STOCK_LIST = [
  { id: 1, itemId: 7, availableUnits: 4, approvalStatus: 'APPROVED', isActive: true },
  { id: 2, itemId: 8, availableUnits: 10, approvalStatus: 'APPROVED', isActive: true },
  { id: 3, itemId: 9, availableUnits: 3, approvalStatus: 'APPROVED', isActive: true },
  { id: 4, itemId: 10, availableUnits: 6, approvalStatus: 'APPROVED', isActive: true },
  { id: 5, itemId: 11, availableUnits: 0, approvalStatus: 'APPROVED', isActive: true },
  { id: 6, itemId: 11, availableUnits: 9, approvalStatus: 'PENDING', isActive: true }, // not usable yet
];
/** Exact consumable units per item (GET /v1/stocks/items/{id}/availability). */
let available: Record<number, number>;
let itemWarranties: Record<number, ItemWarrantyResponse[]>;
let warrantyDelays: Record<number, Promise<void>>;

// ---------- Ecommerce products ----------
let db: ProductResponseDto[];
let nextComponentId: number;
const toComponents = (requests: ProductComponentRequest[]): ProductComponentResponse[] =>
  requests.map((c) => ({ ...c, id: nextComponentId++, warranties: c.warranties.map((w, i) => ({ ...w, id: 1000 + i })) }));

const LAPTOP: ProductResponseDto = {
  id: 1,
  title: 'Laptop X',
  price: 59999,
  image1Url: 'https://cdn.tinqa.com/laptop.png',
  enabled: true,
  stockQuantity: 3,
  specs: [],
  userGuide: [],
  warranties: [],
  components: [
    {
      id: 50,
      itemId: 7,
      itemName: 'Motherboard',
      itemSku: 'MB-1',
      quantity: 1,
      // Stored snapshot: differs from the item's current warranties on purpose.
      warranties: [{ id: 500, sourceWarrantyId: 70, warrantyType: 'MANUFACTURER', title: '2 Years Manufacturer Warranty', durationValue: 2, durationUnit: 'YEARS', provider: 'ASUS', coverage: null, exclusions: null, termsAndConditions: null }],
    },
    { id: 51, itemId: 8, itemName: 'USB Cable', itemSku: 'USB-C', quantity: 2, warranties: [] },
  ],
};

const installBackends = () => {
  procurement.get.mockImplementation(async (url: string) => {
    if (url.startsWith('/v1/admin/items?')) return ok({ content: ITEMS, totalPages: 1, totalElements: ITEMS.length });
    if (url === '/v1/stocks') return ok(STOCK_LIST);
    const availability = /^\/v1\/stocks\/items\/(\d+)\/availability$/.exec(url);
    if (availability) {
      const id = Number(availability[1]);
      return ok({ itemId: id, itemName: '', itemSku: '', unitOfMeasure: 'PCS', totalAvailableUnits: available[id] ?? 0, stocks: [] });
    }
    const match = /^\/v1\/admin\/items\/(\d+)\/warranties$/.exec(url);
    if (match) {
      const id = Number(match[1]);
      await warrantyDelays[id];
      if (!(id in itemWarranties)) throw httpError(500, { success: false, message: 'Procurement service unavailable' });
      return ok(structuredClone(itemWarranties[id]));
    }
    throw httpError(404, { success: false, message: 'Not found' });
  });
  ecom.get.mockImplementation(async (url: string) => {
    if (url === '/products') return ok(structuredClone(db));
    throw httpError(405, { success: false, message: 'Method not allowed' });
  });
  ecom.post.mockImplementation(async (_url: string, raw: unknown) => {
    const body = raw as ProductResponseDto & { components?: ProductComponentRequest[] };
    const product = { ...body, id: 100 + db.length, warranties: [], components: toComponents(body.components ?? []) } as ProductResponseDto;
    db.push(product);
    return ok(product, 'Product created successfully!');
  });
  ecom.put.mockImplementation(async (url: string, raw: unknown) => {
    const body = raw as ProductResponseDto & { components?: ProductComponentRequest[] };
    const index = db.findIndex((p) => `/products/${p.id}` === url);
    const { components, warranties: _w, ...fields } = body;
    void _w;
    db[index] = { ...db[index], ...fields, components: components === undefined ? db[index].components : toComponents(components) };
    return ok(db[index], 'Product updated successfully!');
  });
};

const renderPage = () => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <GlobalAlertContainer />
      <ProductManagementPage />
    </Provider>
  );
  return { user };
};

// ---------- helpers ----------
const section = () => screen.getByRole('group', { name: 'Components' });
const rows = () => within(section()).queryAllByRole('group', { name: /^Component \d+$/ });
const row = (n: number) => within(section()).getByRole('group', { name: `Component ${n}` });
const itemSelect = (n: number) => within(row(n)).getByLabelText('Item *');
/** Each component row shows a one-line load status; the item's warranties are listed in the product Warranties section. */
const statusOf = (n: number) => within(row(n)).getByTestId('component-status');
const itemLoaded = (n: number) => waitFor(() => expect(statusOf(n)).not.toHaveTextContent('Loading'));

const addComponent = async (user: User, itemId?: string) => {
  await user.click(within(section()).getByRole('button', { name: 'Add Component' }));
  const n = rows().length;
  await waitFor(() => expect(within(itemSelect(n)).getAllByRole('option').length).toBeGreaterThan(1));
  if (itemId) await user.selectOptions(itemSelect(n), itemId);
  return n;
};

const openCreate = async (user: User) => {
  await screen.findByText('Laptop X');
  await user.click(screen.getByRole('button', { name: /Create Product/ }));
  await user.type(screen.getByPlaceholderText('Product Title'), 'Laptop Y');
  await user.type(screen.getByPlaceholderText('0.00'), '64999');
  expect(screen.getByTestId('new-product-stock')).toHaveTextContent('1'); // fixed on creation
  await user.type(screen.getByPlaceholderText('Image Address'), 'https://cdn.tinqa.com/y.png');
};
const submitCreate = (user: User) => user.click(screen.getAllByRole('button', { name: 'Create Product' }).at(-1)!);

const openEdit = async (user: User) => {
  await screen.findByText('Laptop X');
  await user.click(screen.getAllByRole('button', { name: 'Edit Product' })[0]);
};
const productWarranties = () => screen.getByRole('region', { name: 'Warranties' });
const productWarrantyCards = () => within(productWarranties()).queryAllByRole('group', { name: /^Warranty \d+$/ });
const quantitySelect = (n: number) => within(row(n)).getByLabelText(/^Qty per product/);
const quantityValues = (n: number) => within(quantitySelect(n)).getAllByRole('option').map((o) => o.getAttribute('value'));
const lastBody = (method: 'post' | 'put') => ecom[method].mock.calls.at(-1)?.[1] as Record<string, unknown> & { components?: ProductComponentRequest[] };

beforeEach(() => {
  vi.clearAllMocks();
  itemWarranties = {
    7: [iw(70, 7, '3 Years Manufacturer Warranty'), iw(71, 7, '6 Months Parts Warranty', { warrantyType: 'PARTS', durationValue: 6, durationUnit: 'MONTHS', provider: null }), iw(72, 7, 'Retired plan', { isActive: false })],
    8: [],
    9: [iw(90, 9, '1 Year Replacement', { warrantyType: 'REPLACEMENT', durationValue: 1, provider: 'BOE' })],
    10: [],
  };
  warrantyDelays = {};
  available = { 7: 4, 8: 10, 9: 3, 10: 6, 11: 0 };
  db = [structuredClone(LAPTOP)];
  nextComponentId = 900;
  installBackends();
});

// ---------- create ----------
describe('Create product: components auto-add their item warranties', () => {
  it('adds the selected items’ active warranties grouped per item and sends them with the product', async () => {
    const { user } = renderPage();
    await openCreate(user);
    expect(within(section()).getByText('No components added.')).toBeInTheDocument();

    await addComponent(user, '7');
    await itemLoaded(1);
    expect(statusOf(1)).toHaveTextContent('2 item warranties added to the product warranties below');
    const titles = () => productWarrantyCards().map((c) => c.textContent);
    expect(titles()).toEqual([
      expect.stringContaining('Motherboard'),
      expect.stringContaining('Motherboard'),
    ]);
    expect(productWarrantyCards()).toHaveLength(2); // the inactive item warranty ("Retired plan") is not carried over
    // The title is the item name, filled in and read-only.
    const copyTitle = within(productWarrantyCards()[0]).getByRole('button', { name: /Expand warranty 1/ });
    expect(copyTitle).toHaveTextContent('Motherboard');
    expect(copyTitle).not.toHaveTextContent('3 Years Manufacturer Warranty');
    expect(procurement.get).toHaveBeenCalledWith('/v1/admin/items/7/warranties');

    await addComponent(user, '8');
    await itemLoaded(2);
    expect(statusOf(2)).toHaveTextContent('This item has no active warranties.');
    // Quantity choices stop at the item's stock: 1…10 for the cable, 1…4 for the board.
    expect(quantityValues(2)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(quantityValues(1)).toEqual(['1', '2', '3', '4']);
    expect(within(row(1)).getByTestId('component-stock')).toHaveTextContent('Max 4 (4 in stock)');
    await user.selectOptions(quantitySelect(2), '3');

    // Already-used items can't be picked twice; inactive or out-of-stock items aren't offered.
    const options = within(itemSelect(2)).getAllByRole('option');
    expect(options.find((o) => o.textContent?.startsWith('Motherboard'))).toBeDisabled();
    expect(options.find((o) => o.textContent?.startsWith('USB Cable'))).toHaveTextContent('10 in stock');
    expect(options.some((o) => o.textContent?.startsWith('Old Fan'))).toBe(false);
    expect(options.some((o) => o.textContent?.startsWith('GPU'))).toBe(false);
    expect(within(section()).getByTestId('component-warranty-total')).toHaveTextContent('2 items · 2 component warranties');

    await submitCreate(user);
    const preview = within(screen.getByRole('list', { name: 'Components preview' }));
    expect(preview.getByText('Motherboard')).toBeInTheDocument();
    expect(preview.getByText('3 Years Manufacturer Warranty')).toBeInTheDocument();
    expect(preview.getByText('No item warranties')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));

    await waitFor(() => expect(ecom.post).toHaveBeenCalledTimes(1));
    expect(lastBody('post').components).toEqual([
      {
        itemId: 7,
        itemName: 'Motherboard',
        itemSku: 'MB-1',
        quantity: 1,
        warranties: [
          { sourceWarrantyId: 70, warrantyType: 'MANUFACTURER', title: '3 Years Manufacturer Warranty', durationValue: 3, durationUnit: 'YEARS', provider: 'ASUS', coverage: 'Board defects', exclusions: null, termsAndConditions: null },
          { sourceWarrantyId: 71, warrantyType: 'PARTS', title: '6 Months Parts Warranty', durationValue: 6, durationUnit: 'MONTHS', provider: null, coverage: 'Board defects', exclusions: null, termsAndConditions: null },
        ],
      },
      { itemId: 8, itemName: 'USB Cable', itemSku: 'USB-C', quantity: 3, warranties: [] },
    ]);
    expect(lastBody('post').stockQuantity).toBe(1);
  });

  it('swapping or removing an item swaps or removes its warranties', async () => {
    const { user } = renderPage();
    await openCreate(user);
    await addComponent(user, '7');
    await itemLoaded(1);

    await user.selectOptions(itemSelect(1), '9');
    await itemLoaded(1);
    expect(productWarrantyCards().map((c) => c.textContent)).toEqual([expect.stringContaining('Display')]);

    await addComponent(user, '7');
    await itemLoaded(2);
    await user.click(within(section()).getByRole('button', { name: 'Remove component 2' }));
    expect(productWarrantyCards().map((c) => c.textContent)).toEqual([expect.stringContaining('Display')]);

    await submitCreate(user);
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await waitFor(() => expect(ecom.post).toHaveBeenCalledTimes(1));
    expect(lastBody('post').components!.map((c) => [c.itemId, c.warranties.map((w) => w.title)])).toEqual([[9, ['1 Year Replacement']]]);
  });

  it('ignores a slow response for an item that was already replaced', async () => {
    let release: () => void = () => {};
    warrantyDelays[7] = new Promise((r) => (release = r));
    const { user } = renderPage();
    await openCreate(user);
    await addComponent(user, '7');
    expect(within(row(1)).getByRole('status')).toHaveTextContent('Loading item details');
    await user.selectOptions(itemSelect(1), '9');
    await itemLoaded(1);
    release();
    await new Promise((r) => setTimeout(r, 0));
    expect(productWarrantyCards().map((c) => c.textContent)).toEqual([expect.stringContaining('Display')]);
  });

  it('blocks saving with no item, or with item details that failed to load — then retry works', async () => {
    delete itemWarranties[9]; // fake Procurement error for item 9
    const { user } = renderPage();
    await openCreate(user);
    await addComponent(user);
    await addComponent(user, '9');
    expect(await within(row(2)).findByText('Procurement service unavailable')).toBeInTheDocument();
    expect(quantitySelect(2)).toBeDisabled();

    await submitCreate(user);
    expect(within(row(1)).getByText('Select an item.')).toBeInTheDocument();
    expect(within(row(2)).getByText('Procurement service unavailable')).toBeInTheDocument(); // row stays flagged
    expect(screen.queryByRole('button', { name: 'Confirm & Create' })).not.toBeInTheDocument();
    expect(ecom.post).not.toHaveBeenCalled();

    itemWarranties[9] = [iw(90, 9, '1 Year Replacement')];
    await user.click(within(row(2)).getByRole('button', { name: /Retry/ }));
    await waitFor(() => expect(statusOf(2)).toHaveTextContent('1 item warranty added to the product warranties below'));
  });

  it('treats an item as out of stock when its exact availability is 0, even if the stock list suggested otherwise', async () => {
    available[9] = 0; // e.g. its stock came from an order that isn't delivered yet
    const { user } = renderPage();
    await openCreate(user);
    await addComponent(user, '9');
    expect(await within(row(1)).findByTestId('component-stock')).toHaveTextContent('Out of stock');
    expect(quantitySelect(1)).toBeDisabled();
    await submitCreate(user);
    expect(within(row(1)).getByText('This item is out of stock.')).toBeInTheDocument();
    expect(ecom.post).not.toHaveBeenCalled();
  });

  it('copies the selected items’ warranties into the product warranties and sends them with the product', async () => {
    const { user } = renderPage();
    await openCreate(user);
    await addComponent(user, '7');
    await itemLoaded(1);
    await addComponent(user, '9');
    await itemLoaded(2);

    // The product Warranties section now has the items' warranties, marked with their item.
    const copies = productWarrantyCards();
    expect(copies.map((c) => c.textContent)).toEqual([
      expect.stringContaining('From Motherboard'),
      expect.stringContaining('From Motherboard'),
      expect.stringContaining('From Display'),
    ]);
    expect(within(copies[0]).getByTestId('warranty-summary')).toHaveTextContent('Manufacturer · 3 Years · ASUS');

    // Plus one product-only warranty.
    await user.click(within(productWarranties()).getByRole('button', { name: 'Add warranty' }));
    const own = within(productWarranties()).getByRole('group', { name: 'Warranty 4' });
    await user.type(within(own).getByLabelText('Duration'), '1');
    await user.selectOptions(within(own).getByLabelText('Duration unit'), 'YEARS');

    await submitCreate(user);
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await waitFor(() => expect(ecom.post).toHaveBeenCalledTimes(1));
    expect(lastBody('post').warranties).toEqual([
      // Item warranties become product warranties titled with the item name…
      expect.objectContaining({ warrantyType: 'MANUFACTURER', title: 'Motherboard', durationValue: 3, durationUnit: 'YEARS', provider: 'ASUS', coverage: 'Board defects', isActive: true }),
      expect.objectContaining({ warrantyType: 'PARTS', title: 'Motherboard', durationValue: 6, durationUnit: 'MONTHS' }),
      expect.objectContaining({ warrantyType: 'REPLACEMENT', title: 'Display', provider: 'BOE' }),
      // …the admin's own warranty keeps its title.
      expect.objectContaining({ warrantyType: 'MANUFACTURER', title: '1 Year Manufacturer Warranty' }),
    ]);
    expect((lastBody('post').warranties as { id?: number }[]).every((w) => !('id' in w))).toBe(true);
    // The component keeps its own copy too, with the item's original titles.
    expect(lastBody('post').components![0].warranties.map((w) => w.title)).toEqual(['3 Years Manufacturer Warranty', '6 Months Parts Warranty']);
  });

  it('changing or removing an item removes the product warranties it added', async () => {
    const { user } = renderPage();
    await openCreate(user);
    await addComponent(user, '7');
    await itemLoaded(1);
    await addComponent(user, '9');
    await itemLoaded(2);
    const summaries = () => productWarrantyCards().map((c) => within(c).getByTestId('warranty-summary').textContent);
    expect(summaries()).toEqual(['Manufacturer · 3 Years · ASUS', 'Parts · 6 Months', 'Replacement · 1 Year · BOE']);

    // Removing the Motherboard component removes its copies.
    await user.click(within(section()).getByRole('button', { name: 'Remove component 1' }));
    expect(summaries()).toEqual(['Replacement · 1 Year · BOE']);

    // Changing the Display row's item swaps its copies.
    await user.selectOptions(itemSelect(1), '7');
    await itemLoaded(1);
    expect(productWarrantyCards().map((c) => c.textContent)).toEqual([
      expect.stringContaining('From Motherboard'),
      expect.stringContaining('From Motherboard'),
    ]);
  });

  it('copied item warranties are read-only: no editing, no toggling, no removing them directly', async () => {
    const { user } = renderPage();
    await openCreate(user);
    await addComponent(user, '9');
    await itemLoaded(1);
    const copy = productWarrantyCards()[0];
    await user.click(within(copy).getByRole('button', { name: /Expand warranty 1/ }));

    for (const label of ['Type *', 'Duration', 'Duration unit', 'Title *', 'Provider', 'Coverage', 'Exclusions', 'Terms & Conditions']) {
      expect(within(copy).getByLabelText(label)).toBeDisabled();
    }
    expect(within(copy).getByRole('switch')).toBeDisabled();
    const remove = within(copy).getByRole('button', { name: 'Remove warranty 1' });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'Remove the item from Components to remove its warranties');
    expect(within(copy).getByTestId('read-only-note')).toHaveTextContent('Copied from the item');

    // The admin's own warranties stay editable.
    await user.click(within(productWarranties()).getByRole('button', { name: 'Add warranty' }));
    const own = within(productWarranties()).getByRole('group', { name: 'Warranty 2' });
    expect(within(own).getByLabelText('Title *')).toBeEnabled();
    expect(within(own).queryByTestId('read-only-note')).not.toBeInTheDocument();
  });
});

// ---------- edit ----------
describe('Edit product components', () => {
  it('shows the stored snapshot and omits `components` when they were not changed', async () => {
    const { user } = renderPage();
    await openEdit(user);
    expect(rows()).toHaveLength(2);
    expect(itemSelect(1)).toHaveValue('7');
    expect(statusOf(1)).toHaveTextContent('1 item warranty saved with this component'); // stored snapshot, not refetched
    expect(procurement.get).not.toHaveBeenCalledWith('/v1/admin/items/7/warranties');

    // Stock is fixed by components: changed only through Add/Reduce stock.
    const stockInput = screen.getByDisplayValue('3');
    expect(stockInput).toHaveAttribute('readonly');
    expect(screen.getByText(/change it with Add\/Reduce stock/)).toBeInTheDocument();

    // Limits count the stock this product already uses: saved per-unit + what 3 more units' worth of stock allows.
    await waitFor(() => expect(quantityValues(1)).toEqual(['1', '2'])); // 1 + floor(4 / 3)
    expect(quantityValues(2)).toEqual(['1', '2', '3', '4', '5']); // 2 + floor(10 / 3)

    const title = screen.getByDisplayValue('Laptop X');
    await user.clear(title);
    await user.type(title, 'Laptop X Pro');
    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    expect(screen.queryByText('Components & item warranties', { selector: 'span.font-bold' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));

    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    expect(lastBody('put')).not.toHaveProperty('components');
    expect(db[0].components).toEqual(LAPTOP.components);
  });

  it('saved components don’t add copies; a component added while editing does', async () => {
    const { user } = renderPage();
    await openEdit(user);
    expect(productWarrantyCards()).toHaveLength(0);
    await addComponent(user, '9');
    await itemLoaded(3);
    expect(productWarrantyCards()).toHaveLength(1);
    expect(productWarrantyCards()[0]).toHaveTextContent('From Display');
    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    expect(await screen.findByText(/Add Replacement warranty \(1 Year\) from Display/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm & Update' }));
    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    expect(lastBody('put').warranties).toEqual([expect.objectContaining({ title: 'Display', warrantyType: 'REPLACEMENT' })]);
  });

  it('adding an item fetches its warranties; removing one drops it; existing snapshots are re-sent unchanged', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await user.click(within(section()).getByRole('button', { name: 'Remove component 2' }));
    await addComponent(user, '9');
    await itemLoaded(2);

    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    const review = await screen.findByText(/Add Display × 1 \(1 warranty\)/);
    expect(review).toHaveTextContent('Remove USB Cable and its warranties');
    await user.click(screen.getByRole('button', { name: 'Confirm & Update' }));

    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    expect(lastBody('put').components!.map((c) => [c.itemId, c.warranties.map((w) => w.title)])).toEqual([
      [7, ['2 Years Manufacturer Warranty']], // stored snapshot kept
      [9, ['1 Year Replacement']],
    ]);
    expect(db[0].components!.map((c) => c.itemName)).toEqual(['Motherboard', 'Display']);
  });

  it('"Refresh from item" replaces a stored snapshot with the item’s current warranties', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await user.click(within(row(1)).getByRole('button', { name: /Refresh from item/ }));
    await waitFor(() => expect(statusOf(1)).toHaveTextContent('2 item warranties saved with this component'));

    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    expect(await screen.findByText(/Update Motherboard: warranties refreshed \(2 warranties\)/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm & Update' }));
    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    expect(lastBody('put').components![0].warranties.map((w) => w.sourceWarrantyId)).toEqual([70, 71]);
  });

  it('removing every component sends components: []', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await user.click(within(section()).getByRole('button', { name: 'Remove component 2' }));
    await user.click(within(section()).getByRole('button', { name: 'Remove component 1' }));
    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));
    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    expect(lastBody('put').components).toEqual([]);
    expect(db[0].components).toEqual([]);
  });

  it('maps backend component field errors onto the row', async () => {
    ecom.put.mockRejectedValueOnce(
      httpError(400, {
        success: false,
        message: 'Request validation failed.',
        errorCode: 'VALIDATION_FAILED',
        errors: [{ field: 'components[1].quantity', message: 'Component quantity can have at most 11 digits and 3 decimal places' }],
      })
    );
    const { user } = renderPage();
    await openEdit(user);
    await waitFor(() => expect(quantitySelect(2)).toBeEnabled());
    await user.selectOptions(quantitySelect(2), '3');
    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));
    expect(await within(row(2)).findByText('Component quantity can have at most 11 digits and 3 decimal places')).toBeInTheDocument();
    expect(screen.getByText('Request validation failed.')).toBeInTheDocument();
  });
});

describe('Product preview', () => {
  it('lists components with their warranties', async () => {
    const { user } = renderPage();
    await screen.findByText('Laptop X');
    await user.click(screen.getAllByTitle('View details')[0]);
    const preview = within(await screen.findByRole('list', { name: 'Components preview' }));
    expect(preview.getByText('Motherboard')).toBeInTheDocument();
    expect(preview.getByText('2 Years Manufacturer Warranty')).toBeInTheDocument();
    expect(preview.getByText('× 2')).toBeInTheDocument();
  });
});

describe('Add stock for a product built from components', () => {
  const openAddStock = async (user: User) => {
    await screen.findByText('Laptop X');
    await user.click(screen.getByRole('button', { name: 'Add stock for Laptop X' }));
    return screen.getByRole('dialog', { name: 'Adjust stock for Laptop X' });
  };

  it('caps additions by the most limiting component and re-checks item stock before saving', async () => {
    const { user } = renderPage();
    const dialog = await openAddStock(user);
    const capacity = await within(dialog).findByTestId('component-capacity');
    await within(capacity).findByText('Motherboard × 1 — 4 in stock');
    expect(capacity).toHaveTextContent('USB Cable × 2 — 10 in stock');
    expect(capacity).toHaveTextContent('Limited by Motherboard (4 available, 1 per product).');
    expect(within(dialog).getByText('Up to 4 can be added with the current item stock.')).toBeInTheDocument();

    // A calculated field: only 1…4 can be chosen.
    const quantity = within(dialog).getByLabelText('Quantity to add');
    expect(quantity.tagName).toBe('SELECT');
    expect(within(quantity).getAllByRole('option').slice(1).map((o) => o.getAttribute('value'))).toEqual(['1', '2', '3', '4']);
    expect(within(dialog).getByRole('button', { name: 'Add stock' })).toBeDisabled();

    await user.selectOptions(quantity, '3');
    available[7] = 2; // stock used elsewhere while the dialog was open
    await user.click(within(dialog).getByRole('button', { name: 'Add stock' }));
    expect(await within(dialog).findByText('You can add at most 2 (limited by item stock).')).toBeInTheDocument();
    expect(ecom.put).not.toHaveBeenCalled();

    await user.selectOptions(within(dialog).getByLabelText('Quantity to add'), '2');
    await user.click(within(dialog).getByRole('button', { name: 'Add stock' }));
    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    expect(lastBody('put')).toMatchObject({ stockQuantity: 5 });
    expect(lastBody('put')).not.toHaveProperty('components'); // components untouched
  });
});
