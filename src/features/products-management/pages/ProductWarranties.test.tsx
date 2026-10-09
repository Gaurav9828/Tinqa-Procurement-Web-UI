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
import type { ProductResponseDto, WarrantyRequest, WarrantyResponse } from '../types/product.types';

/**
 * Only the HTTP client is mocked, with a small fake of the Ecommerce BE ProductController/ProductService
 * warranty rules (typed warranties): POST rejects ids; PUT leaves warranties alone when the key is
 * omitted, otherwise syncs (id = update, no id = create, missing = delete) and rejects foreign ids.
 */
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const http = vi.mocked(ecommerceAxiosClient);
// The product form also loads the Procurement item/stock lists (components); keep them off the network.
vi.mock('../../../api/axiosClient', () => ({
  axiosClient: { get: vi.fn(async () => ({ data: { success: true, message: 'OK', data: { content: [], totalPages: 0, totalElements: 0 } } })) },
}));
type User = ReturnType<typeof userEvent.setup>;

const httpError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message), String(status), response.config, {}, response);
};
const badRequest = (message: string, errors: { field: string; message: string }[] = []) =>
  httpError(400, { success: false, message, errorCode: errors.length ? 'VALIDATION_FAILED' : 'BAD_REQUEST', errors, path: '/api/products' });
const okBody = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, errorCode: null, data, timestamp: '', path: '' } });

// ---------- fake backend ----------
type Body = Omit<ProductResponseDto, 'id' | 'warranties'> & { warranties?: WarrantyRequest[] };
let db: ProductResponseDto[];
let nextWarrantyId: number;
const STAMP = '2026-10-08T09:15:00Z';

const toResponse = (w: WarrantyRequest, existing?: WarrantyResponse): WarrantyResponse => ({
  id: existing?.id ?? nextWarrantyId++,
  warrantyType: w.warrantyType,
  title: w.title,
  durationValue: w.durationValue,
  durationUnit: w.durationUnit,
  provider: w.provider ?? null,
  coverage: w.coverage ?? null,
  exclusions: w.exclusions ?? null,
  termsAndConditions: w.termsAndConditions ?? null,
  isActive: w.isActive ?? existing?.isActive ?? true,
  createdAt: existing?.createdAt ?? STAMP,
  updatedAt: '2026-10-08T10:00:00+05:30',
  createdBy: existing?.createdBy ?? 7,
  updatedBy: 7,
});

const saved = (id: number, title: string, overrides: Partial<WarrantyResponse> = {}): WarrantyResponse => ({
  id,
  warrantyType: 'MANUFACTURER',
  title,
  durationValue: 1,
  durationUnit: 'YEARS',
  provider: 'Acme Electronics',
  coverage: 'Manufacturing defects',
  exclusions: 'Physical/liquid damage',
  termsAndConditions: 'Invoice required',
  isActive: true,
  createdAt: STAMP,
  updatedAt: STAMP,
  createdBy: 7,
  updatedBy: 7,
  ...overrides,
});

// #11 is a warranty migrated from the old model: inactive placeholder, old description in coverage, no admin ids.
const MIGRATED = saved(11, '6 Month Extended Warranty', {
  durationValue: 1,
  durationUnit: 'YEARS',
  provider: null,
  coverage: 'Extended cover for the motor (old description)',
  exclusions: null,
  termsAndConditions: 'Old general terms',
  isActive: false,
  createdBy: null,
  updatedBy: null,
});

const LAMP: ProductResponseDto = {
  id: 1,
  title: 'SummitX',
  tagline: 'Smart lamp',
  description: 'A lamp',
  price: 1999,
  discountPercentage: 10,
  image1Url: 'https://cdn.tinqa.com/1.png',
  enabled: true,
  stockQuantity: 12,
  specs: [{ label: 'Power', value: '9W' }],
  userGuide: [],
  warranties: [saved(10, '1 Year Manufacturer Warranty'), MIGRATED],
};
const PLUG: ProductResponseDto = { ...LAMP, id: 2, title: 'Smart Plug', specs: [], warranties: [saved(20, 'Plug Warranty')] };

const installFakeBackend = () => {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/products') return okBody(structuredClone(db));
    throw httpError(405, { success: false, message: 'Method not allowed' });
  });
  http.post.mockImplementation(async (_url: string, raw: unknown) => {
    const body = raw as Body;
    if (body.warranties?.some((item) => item.id !== undefined)) throw badRequest('Warranty id must not be sent when creating a product.');
    const product: ProductResponseDto = { ...body, id: 100 + db.length, warranties: (body.warranties ?? []).map((w) => toResponse(w)) };
    db.push(product);
    return okBody(product, 'Product created successfully!');
  });
  http.put.mockImplementation(async (url: string, raw: unknown) => {
    const body = raw as Body;
    const index = db.findIndex((p) => `/products/${p.id}` === url);
    const current = db[index];
    let warranties = current.warranties ?? [];
    if (body.warranties !== undefined) {
      const byId = new Map(warranties.map((item) => [item.id, item]));
      warranties = body.warranties.map((item) => {
        if (item.id === undefined) return toResponse(item);
        const existing = byId.get(item.id);
        if (!existing) throw badRequest(`Warranty ${item.id} does not belong to this product.`);
        return toResponse(item, existing);
      });
    }
    const { warranties: _ignored, ...fields } = body;
    void _ignored;
    db[index] = { ...current, ...fields, id: current.id, warranties };
    return okBody(db[index], 'Product updated successfully!');
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
const section = () => screen.getByRole('region', { name: 'Warranties' });
const cards = () => within(section()).queryAllByRole('group', { name: /^Warranty \d+$/ });
const card = (n: number) => within(section()).getByRole('group', { name: `Warranty ${n}` });
const field = (n: number, label: string | RegExp) => within(card(n)).getByLabelText(label);
const expand = async (user: User, n: number) => {
  const toggle = within(card(n)).getByRole('button', { name: new RegExp(`(Expand|Collapse) warranty ${n}`) });
  if (toggle.getAttribute('aria-expanded') === 'false') await user.click(toggle);
};
const addWarranty = async (user: User) => {
  await user.click(within(section()).getByRole('button', { name: 'Add warranty' }));
  return cards().length;
};
const fill = async (user: User, n: number, values: { type?: string; duration?: string; unit?: string; title?: string; provider?: string; coverage?: string }) => {
  if (values.type) await user.selectOptions(field(n, 'Type *'), values.type);
  if (values.duration !== undefined) {
    await user.clear(field(n, 'Duration'));
    if (values.duration) await user.type(field(n, 'Duration'), values.duration);
  }
  if (values.unit) await user.selectOptions(field(n, 'Duration unit'), values.unit);
  if (values.title !== undefined) {
    await user.clear(field(n, 'Title *'));
    if (values.title) await user.type(field(n, 'Title *'), values.title);
  }
  if (values.provider !== undefined) {
    await user.clear(field(n, 'Provider'));
    if (values.provider) await user.type(field(n, 'Provider'), values.provider);
  }
  if (values.coverage) await user.type(field(n, 'Coverage'), values.coverage);
};

const openCreate = async (user: User) => {
  await screen.findByText('SummitX');
  await user.click(screen.getByRole('button', { name: /Create Product/ }));
  await user.type(screen.getByPlaceholderText('Product Title'), 'Desk Fan');
  await user.type(screen.getByPlaceholderText('0.00'), '2499');
  await user.type(screen.getByPlaceholderText('Image Address'), 'https://cdn.tinqa.com/fan.png');
  expect(screen.getByTestId('new-product-stock')).toHaveTextContent('1'); // stock is fixed at 1 on creation
};
/** The page header and the modal footer both have a "Create Product" button; the modal's is last. */
const submitCreate = (user: User) => user.click(screen.getAllByRole('button', { name: 'Create Product' }).at(-1)!);

const openEdit = async (user: User, index = 0) => {
  await screen.findByText('SummitX');
  await user.click(screen.getAllByRole('button', { name: 'Edit Product' })[index]);
};
const saveEdit = async (user: User) => {
  await user.click(screen.getByRole('button', { name: 'Review & Update' }));
  await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));
};
const lastPutBody = () => http.put.mock.calls.at(-1)?.[1] as Body;

beforeEach(() => {
  vi.clearAllMocks();
  db = [structuredClone(LAMP), structuredClone(PLUG)];
  nextWarrantyId = 500;
  installFakeBackend();
});

// ---------- create ----------
describe('Create product with typed warranties', () => {
  it('creates two warranties (no ids, blank optionals omitted) and returns them with ids and all fields', async () => {
    const { user } = renderPage();
    await openCreate(user);
    expect(cards()).toHaveLength(0); // zero is allowed

    const first = await addWarranty(user);
    // New cards default to Manufacturer / Months.
    expect(field(first, 'Type *')).toHaveValue('MANUFACTURER');
    expect(field(first, 'Duration unit')).toHaveValue('MONTHS');
    await fill(user, first, { duration: '1', unit: 'YEARS', provider: 'Acme Electronics', coverage: 'Manufacturing defects' });
    expect(field(first, 'Title *')).toHaveValue('1 Year Manufacturer Warranty'); // suggested from type + duration
    expect(within(card(first)).getByTestId('duration-preview')).toHaveTextContent('1 Year');

    const second = await addWarranty(user);
    await fill(user, second, { type: 'EXTENDED', duration: '6', title: 'Six Month Extended Cover' });
    expect(within(card(second)).getByTestId('duration-preview')).toHaveTextContent('6 Months');
    expect(within(card(second)).getByText('24/255')).toBeInTheDocument();

    await submitCreate(user);
    const preview = within(screen.getByRole('list', { name: 'Warranties preview' }));
    expect(preview.getByText('Extended · 6 Months · Active')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    const body = http.post.mock.calls[0][1] as Body;
    expect(JSON.parse(JSON.stringify(body.warranties))).toEqual([
      { warrantyType: 'MANUFACTURER', title: '1 Year Manufacturer Warranty', durationValue: 1, durationUnit: 'YEARS', provider: 'Acme Electronics', coverage: 'Manufacturing defects', isActive: true },
      { warrantyType: 'EXTENDED', title: 'Six Month Extended Cover', durationValue: 6, durationUnit: 'MONTHS', isActive: true },
    ]);
    expect(db[2].warranties!.map((w) => [w.id, w.warrantyType, w.durationValue, w.durationUnit])).toEqual([
      [500, 'MANUFACTURER', 1, 'YEARS'],
      [501, 'EXTENDED', 6, 'MONTHS'],
    ]);

    // The list reloads; the new product's edit form shows both saved warranties.
    await user.click((await screen.findAllByRole('button', { name: 'Edit Product' }))[2]);
    expect(cards()).toHaveLength(2);
    expect(within(card(2)).getByTestId('warranty-summary')).toHaveTextContent('Extended · 6 Months');
  });

  it('omits the warranties key when none were added', async () => {
    const { user } = renderPage();
    await openCreate(user);
    await submitCreate(user);
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    expect(JSON.parse(JSON.stringify(http.post.mock.calls[0][1]))).not.toHaveProperty('warranties');
  });

  it('blocks a missing duration, missing title and HTML/script text with inline errors', async () => {
    const { user } = renderPage();
    await openCreate(user);
    const n = await addWarranty(user);
    await fill(user, n, { provider: 'Acme <b>Co</b>', coverage: 'see javascript:alert(1)' });
    await submitCreate(user);

    expect(within(card(n)).getByText('Duration is required.')).toBeInTheDocument();
    expect(within(card(n)).getByText('Title is required.')).toBeInTheDocument();
    expect(within(card(n)).getByText('Provider cannot contain HTML tags.')).toBeInTheDocument();
    expect(within(card(n)).getByText(/Coverage contains a blocked script pattern/)).toBeInTheDocument();
    expect(field(n, 'Duration')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('button', { name: 'Confirm & Create' })).not.toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();

    await fill(user, n, { duration: '12' });
    expect(within(card(n)).queryByText('Duration is required.')).not.toBeInTheDocument();
  });

  it.each(['0', '1.5'])('rejects a duration of %s', async (duration) => {
    const { user } = renderPage();
    await openCreate(user);
    const n = await addWarranty(user);
    await fill(user, n, { duration, title: 'Plan' });
    await submitCreate(user);
    expect(within(card(n)).getByText('Duration must be a whole number greater than 0.')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('maps a backend 400 field error (warranties[0].durationUnit) onto that input', async () => {
    http.post.mockRejectedValueOnce(
      badRequest('Request validation failed.', [{ field: 'warranties[0].durationUnit', message: 'Warranty duration unit must be DAYS, MONTHS or YEARS' }])
    );
    const { user } = renderPage();
    await openCreate(user);
    const n = await addWarranty(user);
    await fill(user, n, { duration: '12' });
    await submitCreate(user);
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));

    expect(await within(card(n)).findByText('Warranty duration unit must be DAYS, MONTHS or YEARS')).toBeInTheDocument();
    expect(field(n, 'Duration unit')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Request validation failed.')).toBeInTheDocument();
  });
});

// ---------- edit ----------
describe('Edit product typed warranties', () => {
  it('pre-fills every field, shows migrated inactive warranties muted with a badge, and audit info when present', async () => {
    const { user } = renderPage();
    await openEdit(user);
    expect(cards()).toHaveLength(2);
    expect(within(card(1)).getByTestId('warranty-summary')).toHaveTextContent('Manufacturer · 1 Year · Acme Electronics');
    expect(card(2)).toHaveAttribute('data-inactive', 'true');
    expect(within(card(2)).getByText('Inactive')).toBeInTheDocument();

    await expand(user, 2);
    expect(field(2, 'Coverage')).toHaveValue('Extended cover for the motor (old description)');
    expect(field(2, 'Terms & Conditions')).toHaveValue('Old general terms');
    expect(within(card(2)).getByRole('switch')).not.toBeChecked();
    expect(within(card(2)).getByText(/^Last updated/)).not.toHaveTextContent('admin #'); // no admin id recorded

    await expand(user, 1);
    expect(within(card(1)).getByText(/^Last updated .* by admin #7$/)).toBeInTheDocument();
  });

  it('changes duration and provider of one, deactivates another, adds a third — ids are preserved', async () => {
    db[0].warranties = [saved(10, '1 Year Manufacturer Warranty'), saved(12, '2 Year Seller Warranty', { warrantyType: 'SELLER', durationValue: 2 })];
    const { user } = renderPage();
    await openEdit(user);

    await expand(user, 1);
    await fill(user, 1, { duration: '18', unit: 'MONTHS', provider: 'Acme India' });
    await expand(user, 2);
    await user.click(within(card(2)).getByRole('switch'));
    const n = await addWarranty(user);
    await fill(user, n, { type: 'REPLACEMENT', duration: '30', unit: 'DAYS' });

    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    const review = await screen.findByText(/Update "1 Year Manufacturer Warranty": duration → 18 Months, provider → Acme India/);
    expect(review).toHaveTextContent('Update "2 Year Seller Warranty": deactivate');
    expect(review).toHaveTextContent('Add "30 Days Replacement Warranty"');
    await user.click(screen.getByRole('button', { name: 'Confirm & Update' }));

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(lastPutBody().warranties).toEqual([
      expect.objectContaining({ id: 10, durationValue: 18, durationUnit: 'MONTHS', provider: 'Acme India', isActive: true }),
      expect.objectContaining({ id: 12, isActive: false }),
      expect.objectContaining({ warrantyType: 'REPLACEMENT', title: '30 Days Replacement Warranty', durationValue: 30, durationUnit: 'DAYS', isActive: true }),
    ]);
    expect(lastPutBody().warranties![2]).not.toHaveProperty('id');
    expect(db[0].warranties!.map((w) => [w.id, w.durationValue, w.durationUnit, w.provider, w.isActive])).toEqual([
      [10, 18, 'MONTHS', 'Acme India', true],
      [12, 2, 'YEARS', 'Acme Electronics', false],
      [500, 30, 'DAYS', null, true],
    ]);
  });

  it('lets an admin fix and re-activate a migrated warranty', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await expand(user, 2);
    await fill(user, 2, { type: 'EXTENDED', duration: '6', unit: 'MONTHS' });
    await user.click(within(card(2)).getByRole('switch'));
    expect(card(2)).toHaveAttribute('data-inactive', 'false');
    await saveEdit(user);
    await waitFor(() => expect(db[0].warranties![1]).toMatchObject({ id: 11, warrantyType: 'EXTENDED', durationValue: 6, durationUnit: 'MONTHS', isActive: true }));
  });

  it('removing a saved warranty asks for confirmation (suggesting deactivation), then it is gone after save', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await user.click(within(section()).getByRole('button', { name: 'Remove warranty 1' }));
    const confirm = screen.getByRole('heading', { name: 'Remove warranty?' }).parentElement!;
    expect(confirm).toHaveTextContent('permanently deleted when you save the product');
    expect(confirm).toHaveTextContent('turn off "Active" instead');
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(cards()).toHaveLength(2);

    await user.click(within(section()).getByRole('button', { name: 'Remove warranty 1' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    await saveEdit(user);
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(lastPutBody().warranties!.map((w) => w.id)).toEqual([11]);
    expect(db[0].warranties!.map((w) => w.id)).toEqual([11]);
  });

  it('removing every warranty sends an empty list', async () => {
    db[0].warranties = [saved(10, 'Only Warranty')];
    const { user } = renderPage();
    await openEdit(user);
    await user.click(within(section()).getByRole('button', { name: 'Remove warranty 1' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    await saveEdit(user);
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(lastPutBody().warranties).toEqual([]);
  });

  it('saving other changes sends the full, unchanged warranty list', async () => {
    const { user } = renderPage();
    await openEdit(user);
    const title = screen.getByDisplayValue('SummitX');
    await user.clear(title);
    await user.type(title, 'SummitX Pro');
    await saveEdit(user);
    await waitFor(() => expect(db[0].title).toBe('SummitX Pro'));
    expect(lastPutBody().warranties!.map((w) => [w.id, w.warrantyType, w.durationValue, w.durationUnit, w.isActive])).toEqual([
      [10, 'MANUFACTURER', 1, 'YEARS', true],
      [11, 'MANUFACTURER', 1, 'YEARS', false],
    ]);
    expect(lastPutBody().specifications).toEqual([{ specKey: 'Power', specValue: '9W' }]);
  });

  it('shows the backend message when a warranty is rejected', async () => {
    http.put.mockRejectedValueOnce(badRequest('Warranty 10 does not belong to this product.'));
    const { user } = renderPage();
    await openEdit(user);
    await expand(user, 2);
    await user.click(within(card(2)).getByRole('switch'));
    await saveEdit(user);
    expect(await screen.findByText('Warranty 10 does not belong to this product.')).toBeInTheDocument();
    expect(section()).toBeInTheDocument(); // form stays open
  });
});
