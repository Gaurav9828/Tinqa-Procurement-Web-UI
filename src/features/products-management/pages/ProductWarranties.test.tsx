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
 * warranty rules: POST rejects ids; PUT leaves warranties alone when the key is omitted, otherwise syncs
 * (id = update, no id = create, missing = delete) and rejects ids from another product.
 */
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const http = vi.mocked(ecommerceAxiosClient);
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
const STAMP = '2026-10-08T13:45:00';

const newWarranty = (w: WarrantyRequest): WarrantyResponse => ({
  id: nextWarrantyId++,
  title: w.title,
  description: w.description,
  generalTermsAndConditions: w.generalTermsAndConditions,
  isActive: w.isActive ?? true,
  createdAt: STAMP,
  updatedAt: STAMP,
});

const w = (id: number, title: string, isActive = true): WarrantyResponse => ({
  id,
  title,
  description: `${title} covers manufacturing defects.`,
  generalTermsAndConditions: 'Physical/liquid damage not covered.',
  isActive,
  createdAt: STAMP,
  updatedAt: STAMP,
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
  warranties: [w(10, '1 Year Manufacturer Warranty'), w(11, '6 Month Extended Warranty', false)],
};
const PLUG: ProductResponseDto = { ...LAMP, id: 2, title: 'Smart Plug', specs: [], warranties: [w(20, 'Plug Warranty')] };

const installFakeBackend = () => {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/products') return okBody(structuredClone(db));
    throw httpError(405, { success: false, message: 'Method not allowed' });
  });
  http.post.mockImplementation(async (_url: string, raw: unknown) => {
    const body = raw as Body;
    if (body.warranties?.some((item) => item.id !== undefined)) throw badRequest('Warranty id must not be sent when creating a product.');
    const product: ProductResponseDto = { ...body, id: 100 + db.length, warranties: (body.warranties ?? []).map(newWarranty) };
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
        if (item.id === undefined) return newWarranty(item);
        const existing = byId.get(item.id);
        if (!existing) throw badRequest(`Warranty ${item.id} does not belong to this product.`);
        return { ...existing, ...item, id: existing.id, isActive: item.isActive ?? existing.isActive, updatedAt: '2026-10-08T15:00:00' };
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

const warrantyRows = () => within(screen.getByRole('group', { name: 'Warranties' })).queryAllByRole('group', { name: /^Warranty \d+$/ });
const row = (n: number) => within(screen.getByRole('group', { name: 'Warranties' })).getByRole('group', { name: `Warranty ${n}` });
const field = (n: number, label: RegExp) => within(row(n)).getByLabelText(label);

const fillWarranty = async (user: User, n: number, title: string, description = `${title} description`, terms = `${title} terms`) => {
  await user.type(field(n, /^Title/), title);
  await user.type(field(n, /^Description/), description);
  await user.type(field(n, /^General Terms/), terms);
};

const openEdit = async (user: User, index = 0) => {
  await screen.findByText('SummitX');
  await user.click(screen.getAllByRole('button', { name: 'Edit Product' })[index]);
};

const saveEdit = async (user: User) => {
  await user.click(screen.getByRole('button', { name: 'Review & Update' }));
  await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));
};

/** The page header and the modal footer both have a "Create Product" button; the modal's is last. */
const submitCreate = (user: User) => user.click(screen.getAllByRole('button', { name: 'Create Product' }).at(-1)!);

const lastPutBody = () => http.put.mock.calls.at(-1)?.[1] as Body;

beforeEach(() => {
  vi.clearAllMocks();
  db = [structuredClone(LAMP), structuredClone(PLUG)];
  nextWarrantyId = 500;
  installFakeBackend();
});

describe('Create product with warranties', () => {
  const fillProduct = async (user: User) => {
    await user.click(await screen.findByRole('button', { name: /Create Product/ }));
    await user.type(screen.getByPlaceholderText('Product Title'), 'Desk Fan');
    await user.type(screen.getByPlaceholderText('0.00'), '2499');
    await user.type(screen.getAllByPlaceholderText('0')[1], '5'); // stock (discount comes first)
    await user.type(screen.getByPlaceholderText('Image Address'), 'https://cdn.tinqa.com/fan.png');
  };

  it('sends two warranties without ids, and both appear on the edit screen afterwards', async () => {
    const { user } = renderPage();
    await fillProduct(user);
    expect(warrantyRows()).toHaveLength(0); // zero is allowed
    await user.click(screen.getByRole('button', { name: 'Add Warranty' }));
    await user.click(screen.getByRole('button', { name: 'Add Warranty' }));
    await fillWarranty(user, 1, '  1 Year Manufacturer Warranty  ', ' Covers manufacturing defects ', 'Liquid damage not covered');
    await fillWarranty(user, 2, '6 Month Extended Warranty');
    await user.click(within(row(2)).getByRole('switch'));

    await submitCreate(user);
    expect(within(screen.getByRole('list', { name: 'Warranties preview' })).getAllByRole('listitem')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    const body = http.post.mock.calls[0][1] as Body;
    expect(body.warranties).toEqual([
      { title: '1 Year Manufacturer Warranty', description: 'Covers manufacturing defects', generalTermsAndConditions: 'Liquid damage not covered', isActive: true },
      { title: '6 Month Extended Warranty', description: '6 Month Extended Warranty description', generalTermsAndConditions: '6 Month Extended Warranty terms', isActive: false },
    ]);
    expect(body.warranties!.every((item) => !('id' in item))).toBe(true);
    expect(body.specifications).toBeUndefined(); // unchanged behaviour: empty specs are not sent

    // The list reloads; the new product's edit form shows both warranties from the server.
    await user.click((await screen.findAllByRole('button', { name: 'Edit Product' }))[2]);
    expect(warrantyRows()).toHaveLength(2);
    expect(field(1, /^Title/)).toHaveValue('1 Year Manufacturer Warranty');
    expect(row(2)).toHaveAttribute('data-inactive', 'true');
  });

  it('omits the warranties key when none were added', async () => {
    const { user } = renderPage();
    await fillProduct(user);
    await submitCreate(user);
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    // What actually goes over the wire (undefined keys are dropped by JSON serialisation).
    expect(JSON.parse(JSON.stringify(http.post.mock.calls[0][1]))).not.toHaveProperty('warranties');
  });

  it('blocks an empty required warranty field with an inline error and sends nothing', async () => {
    const { user } = renderPage();
    await fillProduct(user);
    await user.click(screen.getByRole('button', { name: 'Add Warranty' }));
    await user.type(field(1, /^Title/), 'Warranty');
    await user.type(field(1, /^Description/), '   ');
    await submitCreate(user);

    expect(within(row(1)).getByText('Description is required.')).toBeInTheDocument();
    expect(within(row(1)).getByText('General Terms & Conditions is required.')).toBeInTheDocument();
    expect(field(1, /^Description/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('button', { name: 'Confirm & Create' })).not.toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();

    // Fixing the field clears its error.
    await user.type(field(1, /^Description/), 'Covers defects');
    expect(within(row(1)).queryByText('Description is required.')).not.toBeInTheDocument();
  });

  it('blocks HTML tags and javascript: in warranty text', async () => {
    const { user } = renderPage();
    await fillProduct(user);
    await user.click(screen.getByRole('button', { name: 'Add Warranty' }));
    await fillWarranty(user, 1, 'Warranty <b>bold</b>', 'see javascript:alert(1)');
    await submitCreate(user);
    expect(within(row(1)).getByText('Title cannot contain HTML tags.')).toBeInTheDocument();
    expect(within(row(1)).getByText(/Description contains a blocked script pattern/)).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('shows a title character counter', async () => {
    const { user } = renderPage();
    await fillProduct(user);
    await user.click(screen.getByRole('button', { name: 'Add Warranty' }));
    await user.type(field(1, /^Title/), 'Warranty');
    expect(within(row(1)).getByText('8/255')).toBeInTheDocument();
  });

  it('shows backend 400 field errors next to the warranty and the envelope message as an alert', async () => {
    http.post.mockRejectedValueOnce(
      badRequest('Request validation failed.', [
        { field: 'warranties[0].title', message: 'Warranty title cannot exceed 255 characters' },
        { field: 'image1Url', message: 'Image URL must be a valid HTTP or HTTPS URL' },
      ])
    );
    const { user } = renderPage();
    await fillProduct(user);
    await user.click(screen.getByRole('button', { name: 'Add Warranty' }));
    await fillWarranty(user, 1, 'Warranty');
    await submitCreate(user);
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));

    expect(await within(row(1)).findByText('Warranty title cannot exceed 255 characters')).toBeInTheDocument();
    expect(screen.getByText('Request validation failed.')).toBeInTheDocument();
    expect(screen.getByText(/Image URL must be a valid HTTP or HTTPS URL/)).toBeInTheDocument();
    expect(field(1, /^Title/)).toHaveValue('Warranty'); // input kept
  });
});

describe('Edit product warranties', () => {
  it('pre-fills warranties from the admin list, including inactive ones (muted, with a badge)', async () => {
    const { user } = renderPage();
    await openEdit(user);
    expect(warrantyRows()).toHaveLength(2);
    expect(field(1, /^Title/)).toHaveValue('1 Year Manufacturer Warranty');
    expect(field(1, /^General Terms/)).toHaveValue('Physical/liquid damage not covered.');
    expect(row(1)).toHaveAttribute('data-inactive', 'false');
    expect(row(2)).toHaveAttribute('data-inactive', 'true');
    expect(within(row(2)).getByText('Inactive')).toBeInTheDocument();
    expect(within(row(2)).getByRole('switch')).not.toBeChecked();
    expect(within(row(1)).getByText(/^Last updated/)).toBeInTheDocument();
  });

  it('renames one, deactivates another, adds a third — ids are preserved', async () => {
    db[0].warranties = [w(10, '1 Year Manufacturer Warranty'), w(11, '6 Month Extended Warranty')];
    const { user } = renderPage();
    await openEdit(user);

    await user.clear(field(1, /^Title/));
    await user.type(field(1, /^Title/), '2 Year Manufacturer Warranty');
    await user.click(within(row(2)).getByRole('switch'));
    await user.click(screen.getByRole('button', { name: 'Add Warranty' }));
    await fillWarranty(user, 3, 'Accidental Damage Cover');

    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    const review = await screen.findByText(/Update "2 Year Manufacturer Warranty": rename/);
    expect(review).toHaveTextContent('Update "6 Month Extended Warranty": deactivate');
    expect(review).toHaveTextContent('Add "Accidental Damage Cover"');
    await user.click(screen.getByRole('button', { name: 'Confirm & Update' }));

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(lastPutBody().warranties).toEqual([
      expect.objectContaining({ id: 10, title: '2 Year Manufacturer Warranty', isActive: true }),
      expect.objectContaining({ id: 11, title: '6 Month Extended Warranty', isActive: false }),
      { title: 'Accidental Damage Cover', description: 'Accidental Damage Cover description', generalTermsAndConditions: 'Accidental Damage Cover terms', isActive: true },
    ]);
    expect(db[0].warranties!.map((item) => [item.id, item.title, item.isActive])).toEqual([
      [10, '2 Year Manufacturer Warranty', true],
      [11, '6 Month Extended Warranty', false],
      [500, 'Accidental Damage Cover', true],
    ]);
  });

  it('reactivates an inactive warranty', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await user.click(within(row(2)).getByRole('switch'));
    expect(row(2)).toHaveAttribute('data-inactive', 'false');
    await saveEdit(user);
    await waitFor(() => expect(db[0].warranties![1].isActive).toBe(true));
  });

  it('removing a saved warranty asks for confirmation (suggesting deactivation), then it is gone after save and reload', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await user.click(screen.getByRole('button', { name: 'Remove warranty 1' }));

    const confirm = screen.getByRole('heading', { name: 'Remove saved warranty?' }).parentElement!;
    expect(confirm).toHaveTextContent('permanently deleted when you save');
    expect(confirm).toHaveTextContent('turn off "Active" instead');
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(warrantyRows()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Remove warranty 1' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    expect(warrantyRows()).toHaveLength(1);
    await saveEdit(user);

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(lastPutBody().warranties).toEqual([expect.objectContaining({ id: 11 })]);
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Warranties' })).not.toBeInTheDocument());
    await openEdit(user);
    expect(warrantyRows()).toHaveLength(1);
    expect(field(1, /^Title/)).toHaveValue('6 Month Extended Warranty');
  });

  it('removes an unsaved warranty immediately, without a confirmation', async () => {
    const { user } = renderPage();
    await openEdit(user);
    await user.click(screen.getByRole('button', { name: 'Add Warranty' }));
    await user.click(screen.getByRole('button', { name: 'Remove warranty 3' }));
    expect(screen.queryByRole('heading', { name: 'Remove saved warranty?' })).not.toBeInTheDocument();
    expect(warrantyRows()).toHaveLength(2);
  });

  it('removing every warranty sends an empty list', async () => {
    db[0].warranties = [w(10, 'Only Warranty')];
    const { user } = renderPage();
    await openEdit(user);
    await user.click(screen.getByRole('button', { name: 'Remove warranty 1' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    expect(screen.getByText('No warranties added.')).toBeInTheDocument();
    await saveEdit(user);
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(lastPutBody().warranties).toEqual([]);
    expect(db[0].warranties).toEqual([]);
  });

  it('saving other changes sends the full, unchanged warranty list, so warranties stay as they were', async () => {
    const before = structuredClone(db[0].warranties);
    const { user } = renderPage();
    await openEdit(user);
    const title = screen.getByDisplayValue('SummitX');
    await user.clear(title);
    await user.type(title, 'SummitX Pro');
    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    expect(screen.queryByText('Warranties', { selector: 'span.font-bold' })).not.toBeInTheDocument(); // not listed as changed
    await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));

    await waitFor(() => expect(db[0].title).toBe('SummitX Pro'));
    expect(lastPutBody().warranties).toEqual(
      before!.map(({ id, title: t, description, generalTermsAndConditions, isActive }) => ({ id, title: t, description, generalTermsAndConditions, isActive }))
    );
    expect(db[0].warranties!.map((item) => [item.id, item.title, item.isActive])).toEqual(before!.map((item) => [item.id, item.title, item.isActive]));
    // Specifications are still sent exactly as before.
    expect(lastPutBody().specifications).toEqual([{ specKey: 'Power', specValue: '9W' }]);
  });

  it("only offers each product's own warranty ids", async () => {
    const { user } = renderPage();
    await openEdit(user, 1); // Smart Plug
    await user.clear(field(1, /^Title/));
    await user.type(field(1, /^Title/), 'Plug Warranty+');
    await saveEdit(user);
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(http.put.mock.calls[0][0]).toBe('/products/2');
    expect(lastPutBody().warranties!.map((item) => item.id)).toEqual([20]);
  });

  it('shows the backend message when a warranty is rejected (e.g. not part of this product)', async () => {
    http.put.mockRejectedValueOnce(badRequest('Warranty 10 does not belong to this product.'));
    const { user } = renderPage();
    await openEdit(user);
    await user.click(within(row(2)).getByRole('switch'));
    await saveEdit(user);
    expect(await screen.findByText('Warranty 10 does not belong to this product.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Warranties' })).toBeInTheDocument(); // form stays open
  });
});
