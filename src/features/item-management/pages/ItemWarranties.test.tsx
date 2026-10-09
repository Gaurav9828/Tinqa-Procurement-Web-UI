import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { ItemManagementPage } from './ItemManagementPage';
import { axiosClient } from '../../../api/axiosClient';
import type { ItemResponse, ItemWarrantyRequest, ItemWarrantyResponse } from '../types/item.types';

/**
 * Only the HTTP client is mocked, with a small fake of the Procurement BE ItemAdminController /
 * ItemServiceImpl warranty rules: create adds every warranty; update leaves warranties alone when
 * the key is omitted, otherwise syncs (id = update, no id = create, missing = delete) and rejects
 * foreign or duplicate ids with 400.
 */
vi.mock('../../../api/axiosClient', () => ({
  axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const http = vi.mocked(axiosClient);
type User = ReturnType<typeof userEvent.setup>;

const httpError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message), String(status), response.config, {}, response);
};
const badRequest = (message: string, errors: { field: string; message: string }[] = []) =>
  httpError(400, { success: false, message, errorCode: errors.length ? 'VALIDATION_FAILED' : 'BAD_REQUEST', errors });
const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, data, timestamp: '', path: '' } });

// ---------- fake backend ----------
type ItemBody = Omit<ItemResponse, 'id' | 'warranties' | 'isActive' | 'sku'> & { sku?: string; isActive?: boolean; warranties?: ItemWarrantyRequest[] | null };
let db: ItemResponse[];
let nextWarrantyId: number;
const HOURS_AGO = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const toResponse = (itemId: number, w: ItemWarrantyRequest, existing?: ItemWarrantyResponse): ItemWarrantyResponse => ({
  id: existing?.id ?? nextWarrantyId++,
  itemId,
  warrantyType: w.warrantyType,
  title: w.title,
  durationValue: w.durationValue,
  durationUnit: w.durationUnit,
  provider: w.provider ?? null,
  coverage: w.coverage ?? null,
  exclusions: w.exclusions ?? null,
  termsAndConditions: w.termsAndConditions ?? null,
  isActive: w.isActive ?? existing?.isActive ?? true,
  createdAt: existing?.createdAt ?? HOURS_AGO(0),
  updatedAt: HOURS_AGO(0),
  createdBy: existing?.createdBy ?? 7,
  updatedBy: 7,
});

const saved = (id: number, overrides: Partial<ItemWarrantyResponse> = {}): ItemWarrantyResponse => ({
  id,
  itemId: 1,
  warrantyType: 'MANUFACTURER',
  title: '3 Years Manufacturer Warranty',
  durationValue: 3,
  durationUnit: 'YEARS',
  provider: 'ASUS',
  coverage: 'Motherboard and display defects',
  exclusions: 'Liquid damage',
  termsAndConditions: 'Keep the invoice',
  isActive: true,
  createdAt: HOURS_AGO(48),
  updatedAt: HOURS_AGO(3),
  createdBy: 7,
  updatedBy: 7,
  ...overrides,
});

const LAPTOP: ItemResponse = {
  id: 1,
  categoryId: 1,
  categoryName: 'Electronics',
  name: 'Zenbook 14',
  brand: 'ASUS',
  sku: 'ZB-14',
  unitOfMeasure: 'PCS',
  mrp: 89999,
  countryOfOrigin: 'Taiwan',
  termsAndCondition: 'No returns after 7 days',
  isActive: true,
  warranties: [
    saved(10),
    saved(11, { warrantyType: 'EXTENDED', title: '1 Year Extended Warranty', durationValue: 1, provider: 'TinQa', coverage: null, exclusions: null, termsAndConditions: null, isActive: false, updatedBy: null }),
  ],
};
const CABLE: ItemResponse = { ...LAPTOP, id: 2, name: 'USB Cable', sku: 'USB-C', warranties: [] };

const installFakeBackend = () => {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/v1/admin/items/categories') return ok([{ id: 1, name: 'Electronics' }]);
    if (url.startsWith('/v1/admin/items?')) {
      return ok({ content: structuredClone(db), totalPages: 1, totalElements: db.length });
    }
    const warrantiesMatch = /^\/v1\/admin\/items\/(\d+)\/warranties$/.exec(url);
    if (warrantiesMatch) return ok(structuredClone(db.find((i) => i.id === Number(warrantiesMatch[1]))!.warranties));
    throw httpError(404, { success: false, message: 'Not found' });
  });
  http.post.mockImplementation(async (_url: string, raw: unknown) => {
    const body = raw as ItemBody;
    if (body.warranties?.some((w) => w.id !== undefined)) throw badRequest('Warranty 1 does not belong to item 100');
    const id = 100 + db.length;
    const item = { ...body, id, sku: body.sku!, isActive: true, warranties: (body.warranties ?? []).map((w) => toResponse(id, w)) };
    db.push(item);
    return ok(item, 'Item created successfully');
  });
  http.put.mockImplementation(async (url: string, raw: unknown) => {
    const body = raw as ItemBody;
    const index = db.findIndex((i) => `/v1/admin/items/${i.id}` === url);
    const current = db[index];
    let warranties = current.warranties ?? [];
    if (body.warranties != null) {
      const byId = new Map(warranties.map((w) => [w.id, w]));
      const seen = new Set<number>();
      for (const w of body.warranties) {
        if (w.id === undefined) continue;
        if (!byId.has(w.id)) throw badRequest(`Warranty ${w.id} does not belong to item ${current.id}`);
        if (seen.has(w.id)) throw badRequest(`Duplicate warranty ID in request: ${w.id}`);
        seen.add(w.id);
      }
      warranties = body.warranties.map((w) => toResponse(current.id, w, w.id !== undefined ? byId.get(w.id) : undefined));
    }
    const { warranties: _w, ...fields } = body;
    void _w;
    db[index] = { ...current, ...fields, id: current.id, sku: current.sku, isActive: body.isActive ?? current.isActive, warranties };
    return ok(db[index], 'Item updated successfully');
  });
};

const renderPage = () => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <GlobalAlertContainer />
      <ItemManagementPage />
    </Provider>
  );
  return { user };
};

// ---------- helpers ----------
const section = () => screen.getByRole('region', { name: 'Warranties' });
const cards = () => within(section()).queryAllByRole('group', { name: /^Warranty \d+$/ });
const card = (n: number) => within(section()).getByRole('group', { name: `Warranty ${n}` });
const rowFor = (name: string) => screen.getByText(name, { selector: 'span.font-semibold' }).closest('tr')!;
const lastBody = (method: 'post' | 'put') => http[method].mock.calls.at(-1)?.[1] as ItemBody;

const expand = async (user: User, n: number) => {
  const toggle = within(card(n)).getByRole('button', { name: new RegExp(`(Expand|Collapse) warranty ${n}`) });
  if (toggle.getAttribute('aria-expanded') === 'false') await user.click(toggle);
};

const fillCard = async (user: User, n: number, { type, duration, unit, title, provider }: { type?: string; duration?: string; unit?: string; title?: string; provider?: string }) => {
  const c = within(card(n));
  if (type) await user.selectOptions(c.getByLabelText('Type *'), type);
  if (duration !== undefined) {
    await user.clear(c.getByLabelText('Duration'));
    if (duration) await user.type(c.getByLabelText('Duration'), duration);
  }
  if (unit) await user.selectOptions(c.getByLabelText('Duration unit'), unit);
  if (title !== undefined) {
    await user.clear(c.getByLabelText('Title *'));
    if (title) await user.type(c.getByLabelText('Title *'), title);
  }
  if (provider) await user.type(c.getByLabelText('Provider'), provider);
};

const openCreate = async (user: User) => {
  await screen.findByText('Zenbook 14');
  await user.click(screen.getByRole('button', { name: 'Add Item' }));
  await user.type(screen.getByPlaceholderText('e.g. ESP32-WROOM-32'), 'MOUSE-1');
  await user.type(screen.getByPlaceholderText('e.g. ESP32 Microcontroller Board'), 'Wireless Mouse');
  await user.type(screen.getByPlaceholderText('499.00'), '1299');
};
const submitCreate = (user: User) => user.click(screen.getByRole('button', { name: 'Create Item' }));

const openEdit = async (user: User, name = 'Zenbook 14') => {
  await screen.findByText(name);
  await user.click(within(rowFor(name)).getByTitle('Edit Item'));
};
const submitEdit = (user: User) => user.click(screen.getByRole('button', { name: 'Update Item' }));

const openPreview = async (user: User, name = 'Zenbook 14') => {
  await screen.findByText(name);
  await user.click(within(rowFor(name)).getByTitle('Preview Item Details'));
};

beforeEach(() => {
  vi.clearAllMocks();
  db = [structuredClone(LAPTOP), structuredClone(CABLE)];
  nextWarrantyId = 500;
  installFakeBackend();
});

// ---------- tests ----------
describe('Create item with warranties', () => {
  it('creates with no warranties without sending the key', async () => {
    const { user } = renderPage();
    await openCreate(user);
    expect(within(section()).getByText('No warranties added.')).toBeInTheDocument();
    await submitCreate(user);
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    expect(lastBody('post')).not.toHaveProperty('warranties');
    expect(lastBody('post')).not.toHaveProperty('warrantyMonths');
  });

  it('creates with several warranties (suggested + custom titles, no ids) and shows them on the detail view', async () => {
    const { user } = renderPage();
    await openCreate(user);
    await user.click(within(section()).getByRole('button', { name: 'Add warranty' }));
    expect(within(card(1)).queryByRole('switch')).not.toBeInTheDocument(); // Active toggle is edit-only
    await fillCard(user, 1, { type: 'MANUFACTURER', duration: '3', provider: 'Logitech' });
    expect(within(card(1)).getByLabelText('Title *')).toHaveValue('3 Years Manufacturer Warranty'); // suggested
    await fillCard(user, 1, { unit: 'MONTHS' });
    expect(within(card(1)).getByLabelText('Title *')).toHaveValue('3 Months Manufacturer Warranty'); // still following

    await user.click(within(section()).getByRole('button', { name: 'Add warranty' }));
    await fillCard(user, 2, { type: 'REPLACEMENT', duration: '1', unit: 'YEARS', title: 'Instant Replacement' });
    await fillCard(user, 2, { duration: '2' });
    expect(within(card(2)).getByLabelText('Title *')).toHaveValue('Instant Replacement'); // user title kept

    await user.click(within(card(1)).getByRole('button', { name: 'Collapse warranty 1' }));
    expect(within(card(1)).getByTestId('warranty-summary')).toHaveTextContent('Manufacturer · 3 Months · Logitech');

    await submitCreate(user);
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    expect(lastBody('post').warranties).toEqual([
      { warrantyType: 'MANUFACTURER', title: '3 Months Manufacturer Warranty', durationValue: 3, durationUnit: 'MONTHS', provider: 'Logitech' },
      { warrantyType: 'REPLACEMENT', title: 'Instant Replacement', durationValue: 2, durationUnit: 'YEARS' },
    ]);

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument();
    expect(within(rowFor('Wireless Mouse')).getByTestId('item-warranties')).toHaveTextContent('2 warranties');
    await openPreview(user, 'Wireless Mouse');
    const list = within(screen.getByRole('region', { name: 'Warranties' }));
    expect(list.getAllByRole('listitem')).toHaveLength(2);
    expect(list.getByText('3 Months Manufacturer Warranty')).toBeInTheDocument();
    expect(list.getByText('Instant Replacement')).toBeInTheDocument();
  });

  it('blocks invalid warranties with per-card errors and sends nothing', async () => {
    const { user } = renderPage();
    await openCreate(user);
    await user.click(within(section()).getByRole('button', { name: 'Add warranty' }));
    await user.click(within(section()).getByRole('button', { name: 'Add warranty' }));
    await fillCard(user, 2, { type: 'SELLER', duration: '0', title: 'x'.repeat(256), provider: 'p'.repeat(256) });
    await submitCreate(user);

    expect(within(card(1)).getByText('Select a warranty type.')).toBeInTheDocument();
    expect(within(card(1)).getByText('Title is required.')).toBeInTheDocument();
    expect(within(card(1)).getByText('Duration is required.')).toBeInTheDocument();
    expect(within(card(2)).getByText('Duration must be a whole number greater than 0.')).toBeInTheDocument();
    expect(within(card(2)).getByText('Title cannot exceed 255 characters.')).toBeInTheDocument();
    expect(within(card(2)).getByText('Provider cannot exceed 255 characters.')).toBeInTheDocument();
    expect(within(card(1)).getByLabelText('Type *')).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByText('Please fix the highlighted warranty fields.')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();

    // Fixing a field clears its error.
    await fillCard(user, 1, { type: 'PARTS' });
    expect(within(card(1)).queryByText('Select a warranty type.')).not.toBeInTheDocument();
  });

  it.each(['1.5', '-2'])('rejects a non-integer/negative duration %s', async (duration) => {
    const { user } = renderPage();
    await openCreate(user);
    await user.click(within(section()).getByRole('button', { name: 'Add warranty' }));
    await fillCard(user, 1, { type: 'SERVICE', duration, title: 'Service plan' });
    await submitCreate(user);
    expect(within(card(1)).getByText(/Duration (must be a whole number greater than 0|is required)\./)).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('maps backend 400 field errors onto the card and shows the message as a toast', async () => {
    http.post.mockRejectedValueOnce(
      badRequest('Request validation failed', [
        { field: 'warranties[0].title', message: 'Warranty title cannot exceed 255 characters' },
        { field: 'sku', message: 'SKU already exists' },
      ])
    );
    const { user } = renderPage();
    await openCreate(user);
    await user.click(within(section()).getByRole('button', { name: 'Add warranty' }));
    await fillCard(user, 1, { type: 'MANUFACTURER', duration: '1' });
    await submitCreate(user);

    expect(await within(card(1)).findByText('Warranty title cannot exceed 255 characters')).toBeInTheDocument();
    expect(screen.getByText('Request validation failed')).toBeInTheDocument();
    expect(screen.getByText(/SKU already exists/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument(); // form stays open
  });
});

describe('Edit item warranties', () => {
  it('pre-fills saved warranties as collapsed cards with a one-line summary', async () => {
    const { user } = renderPage();
    await openEdit(user);
    expect(cards()).toHaveLength(2);
    expect(within(card(1)).getByTestId('warranty-summary')).toHaveTextContent('Manufacturer · 3 Years · ASUS');
    expect(within(card(1)).queryByLabelText('Title *')).not.toBeInTheDocument();
    expect(card(2)).toHaveAttribute('data-inactive', 'true');
    expect(within(card(2)).getByText('Inactive')).toBeInTheDocument();

    await expand(user, 1);
    expect(within(card(1)).getByLabelText('Title *')).toHaveValue('3 Years Manufacturer Warranty');
    expect(within(card(1)).getByLabelText('Coverage')).toHaveValue('Motherboard and display defects');
    expect(within(card(1)).getByRole('switch')).toBeChecked();

    // Bulk toggles for long lists.
    await user.click(within(section()).getByRole('button', { name: 'Collapse all' }));
    expect(within(card(1)).queryByLabelText('Title *')).not.toBeInTheDocument();
    await user.click(within(section()).getByRole('button', { name: 'Expand all' }));
    expect(within(card(1)).getByLabelText('Title *')).toBeInTheDocument();
    expect(within(card(2)).getByLabelText('Title *')).toBeInTheDocument();
  });

  it('keeps ids for changed warranties, creates new ones and deletes removed ones after confirmation', async () => {
    db[0].warranties = [...db[0].warranties!, saved(12, { warrantyType: 'PARTS', title: 'Battery Warranty', durationValue: 6, durationUnit: 'MONTHS' })];
    const { user } = renderPage();
    await openEdit(user);

    // Change #10 (title) and reactivate #11.
    await expand(user, 1);
    await fillCard(user, 1, { title: '3 Years ASUS Warranty' });
    await expand(user, 2);
    await user.click(within(card(2)).getByRole('switch'));

    // Remove #12: cancel first, then confirm.
    await user.click(within(section()).getByRole('button', { name: 'Remove warranty 3' }));
    const confirm = screen.getByRole('heading', { name: 'Remove warranty?' }).parentElement!;
    expect(confirm).toHaveTextContent(/this warranty will be deleted when you save/i);
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(cards()).toHaveLength(3);
    await user.click(within(section()).getByRole('button', { name: 'Remove warranty 3' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    expect(cards()).toHaveLength(2);

    // Add a new one (no confirmation needed to remove unsaved cards).
    await user.click(within(section()).getByRole('button', { name: 'Add warranty' }));
    await fillCard(user, 3, { type: 'SERVICE', duration: '30', unit: 'DAYS' });

    await submitEdit(user);
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    const sent = lastBody('put').warranties!;
    expect(sent.map((w) => [w.id, w.title, w.isActive])).toEqual([
      [10, '3 Years ASUS Warranty', true],
      [11, '1 Year Extended Warranty', true],
      [undefined, '30 Days Service Warranty', true],
    ]);
    expect(sent[2]).not.toHaveProperty('id');
    expect(sent[0]).toMatchObject({ coverage: 'Motherboard and display defects', exclusions: 'Liquid damage', termsAndConditions: 'Keep the invoice' });

    expect(db[0].warranties!.map((w) => [w.id, w.title, w.isActive])).toEqual([
      [10, '3 Years ASUS Warranty', true],
      [11, '1 Year Extended Warranty', true],
      [500, '30 Days Service Warranty', true],
    ]);
  });

  it('removes an unsaved card immediately, without confirmation', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await user.click(within(section()).getByRole('button', { name: 'Add warranty' }));
    expect(within(card(3)).getByText('New')).toBeInTheDocument();
    await user.click(within(section()).getByRole('button', { name: 'Remove warranty 3' }));
    expect(screen.queryByText(/will be deleted when you save/i)).not.toBeInTheDocument();
    expect(cards()).toHaveLength(2);
  });

  it('sends warranties: [] when every card is removed, and the item then shows none', async () => {
    const { user } = renderPage();
    await openEdit(user);
    for (let i = 0; i < 2; i++) {
      await user.click(within(section()).getByRole('button', { name: 'Remove warranty 1' }));
      await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    }
    await submitEdit(user);
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(lastBody('put').warranties).toEqual([]);
    await waitFor(() => expect(within(rowFor('Zenbook 14')).getByTestId('item-warranties')).toHaveTextContent('—'));
    await openPreview(user);
    expect(screen.getByText('No warranties for this item.')).toBeInTheDocument();
  });

  it('saving other fields resends the unchanged warranties with their ids', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await submitEdit(user);
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(lastBody('put').warranties!.map((w) => w.id)).toEqual([10, 11]);
    expect(lastBody('put')).not.toHaveProperty('warrantyMonths');
    expect(db[0].warranties!.map((w) => [w.id, w.title, w.isActive])).toEqual([
      [10, '3 Years Manufacturer Warranty', true],
      [11, '1 Year Extended Warranty', false],
    ]);
  });

  it('surfaces a backend 400 (e.g. a duplicate or foreign id) as a toast and keeps the form open', async () => {
    http.put.mockRejectedValueOnce(badRequest('Duplicate warranty ID in request: 10'));
    const { user } = renderPage();
    await openEdit(user);
    await submitEdit(user);
    expect(await screen.findByText('Duplicate warranty ID in request: 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Item' })).toBeInTheDocument();
  });

  it('activating/inactivating an item leaves its warranties untouched (key omitted)', async () => {
    const { user } = renderPage();
    await screen.findByText('Zenbook 14');
    await user.click(within(rowFor('Zenbook 14')).getByTitle('Inactivate Item'));
    await user.click(screen.getByRole('button', { name: /Confirm Inactivation/ }));
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(lastBody('put')).not.toHaveProperty('warranties');
    expect(lastBody('put')).not.toHaveProperty('warrantyMonths');
    expect(db[0].warranties).toHaveLength(2);
  });
});

describe('Item list and detail', () => {
  it('shows a compact warranty count with a tooltip of titles, or — when there are none', async () => {
    const { user } = renderPage();
    await screen.findByText('Zenbook 14');
    expect(screen.queryByText(/Warranty \(months\)/i)).not.toBeInTheDocument();
    const cell = within(rowFor('Zenbook 14')).getByTestId('item-warranties');
    expect(cell).toHaveTextContent('2 warranties');
    expect(within(rowFor('USB Cable')).getByTestId('item-warranties')).toHaveTextContent('—');

    await user.hover(within(cell).getByText(/2 warranties/));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('3 Years Manufacturer Warranty');
    expect(tooltip).toHaveTextContent('1 Year Extended Warranty');
    expect(tooltip).toHaveTextContent('(inactive)');
  });

  it('lists warranties on the detail view with badge, duration, provider, status, expandable details and audit', async () => {
    const { user } = renderPage();
    await openPreview(user);
    const list = screen.getByRole('region', { name: 'Warranties' });
    const [first, second] = within(list).getAllByRole('listitem');

    expect(first).toHaveTextContent('Manufacturer');
    expect(first).toHaveTextContent('3 Years Manufacturer Warranty');
    expect(first).toHaveTextContent('Duration:3 Years');
    expect(first).toHaveTextContent('Provider:ASUS');
    expect(first).toHaveTextContent('Active');
    expect(first).toHaveTextContent('Updated 3 hours ago by user #7');
    expect(within(first).queryByText('Liquid damage')).not.toBeInTheDocument();
    await user.click(within(first).getByRole('button', { name: /Show coverage, exclusions, terms & conditions/ }));
    expect(within(first).getByText('Liquid damage')).toBeInTheDocument();
    expect(within(first).getByText('Keep the invoice')).toBeInTheDocument();

    expect(second).toHaveAttribute('data-inactive', 'true');
    expect(second).toHaveTextContent('Inactive');
    expect(second).toHaveTextContent('Extended');
    expect(within(second).queryByRole('button', { name: /Show/ })).not.toBeInTheDocument(); // nothing to expand
    expect(second).toHaveTextContent(/Updated 3 hours ago$/); // no updater recorded

    // Item-level general T&C is still shown separately.
    expect(screen.getByText('No returns after 7 days')).toBeInTheDocument();
  });
});
