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
import type { ProductResponseDto, SpecificationDTO } from '../types/product.types';

/**
 * Only the HTTP client is mocked, with a tiny fake of the real Ecommerce BE ProductController:
 * it supports exactly GET /products, GET /products/active, POST /products, PUT /products/{id} and
 * PATCH /products/{id}/status, returns the real read shape (specs / userGuide /
 * last_update_description), replaces all specifications on PUT like ProductService does, and
 * answers anything else (e.g. GET /products/1) with 405 METHOD_NOT_ALLOWED.
 */
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const http = vi.mocked(ecommerceAxiosClient);

const httpError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message), String(status), response.config, {}, response);
};
const methodNotAllowed = (method: string, path: string) =>
  httpError(405, { success: false, message: `Request method '${method}' is not supported`, errorCode: 'METHOD_NOT_ALLOWED', path: `/api${path}` });
const okBody = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, errorCode: null, data, timestamp: '', path: '' } });

// ---------- fake backend state (stored the way the DB stores it) ----------
interface StoredProduct extends Omit<ProductResponseDto, 'specs' | 'userGuide' | 'last_update_description'> {
  specRows: SpecificationDTO[];
  lastUpdateDescription: string | null;
}
let db: StoredProduct[];

/** Mirrors ProductService.mapToResponseDto: "Guide - X" rows become userGuide sections. */
const toReadDto = (p: StoredProduct): ProductResponseDto => {
  const specs = p.specRows.filter((r) => !r.specKey.startsWith('Guide - ')).map((r) => ({ label: r.specKey, value: r.specValue }));
  const guide = new Map<string, string[]>();
  p.specRows
    .filter((r) => r.specKey.startsWith('Guide - '))
    .forEach((r) => {
      const title = r.specKey.replace('Guide - ', '').trim();
      guide.set(title, [...(guide.get(title) ?? []), r.specValue]);
    });
  const { specRows: _rows, lastUpdateDescription, ...rest } = p;
  void _rows;
  return { ...rest, last_update_description: lastUpdateDescription, specs, userGuide: [...guide].map(([title, content]) => ({ title, content })) };
};

const LAMP: StoredProduct = {
  id: 1,
  title: 'SummitX',
  tagline: 'Smart lamp',
  description: 'A lamp',
  price: 1999,
  discountPercentage: 10,
  image1Url: 'https://cdn.tinqa.com/1.png',
  image2Url: null,
  image3Url: null,
  image4Url: null,
  image5Url: null,
  enabled: true,
  stockQuantity: 12,
  lastUpdateDescription: null,
  createdAt: '2026-10-01T09:00:00',
  specRows: [
    { specKey: 'Power', specValue: '9W' },
    { specKey: 'Guide - Setup', specValue: 'Plug it in' },
    { specKey: 'Guide - Setup', specValue: 'Pair with the app' },
  ],
};
const PLUG: StoredProduct = { ...LAMP, id: 2, title: 'Sold-out Plug', stockQuantity: 0, specRows: [] };

const installFakeBackend = () => {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/products') return okBody(db.map(toReadDto), 'Products retrieved successfully');
    if (url === '/products/active') return okBody(db.filter((p) => p.enabled).map(toReadDto));
    throw methodNotAllowed('GET', url);
  });
  http.put.mockImplementation(async (url: string, body: unknown) => {
    const match = /^\/products\/(\d+)$/.exec(url);
    if (!match) throw methodNotAllowed('PUT', url);
    const req = body as Record<string, unknown> & { specifications?: SpecificationDTO[] };
    const index = db.findIndex((p) => p.id === Number(match[1]));
    db[index] = {
      ...db[index],
      title: req.title as string,
      stockQuantity: req.stockQuantity as number,
      lastUpdateDescription: (req.lastUpdateDescription as string) ?? null,
      specRows: req.specifications ?? [], // ProductService deletes all rows, then saves these
    };
    return okBody(null, 'Product updated successfully!');
  });
  http.delete.mockImplementation(async (url: string) => {
    throw methodNotAllowed('DELETE', url);
  });
};

const requestedGetUrls = () => http.get.mock.calls.map(([url]) => url);

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

const openDialog = async (user: ReturnType<typeof userEvent.setup>, action: 'Add' | 'Reduce', title = 'SummitX') => {
  await user.click(await screen.findByRole('button', { name: `${action} stock for ${title}` }));
  const dialog = screen.getByRole('dialog', { name: `Adjust stock for ${title}` });
  await within(dialog).findByTestId('current-stock');
  return dialog;
};

beforeEach(() => {
  db = [structuredClone(LAMP), structuredClone(PLUG)];
  installFakeBackend();
});

// ---------- tests ----------
describe('Product API contract (no product-detail route)', () => {
  it('loads the product list from GET /products and never requests GET /products/{id}', async () => {
    const { user } = renderPage();
    expect(await screen.findByText('SummitX')).toBeInTheDocument();
    await openDialog(user, 'Add');
    expect(requestedGetUrls().every((url) => url === '/products')).toBe(true);
    expect(http.delete).not.toHaveBeenCalled();
  });

  it('shows a clear, non-blank error state if the list request is rejected with 405', async () => {
    http.get.mockRejectedValue(methodNotAllowed('GET', '/products'));
    renderPage();
    expect(await screen.findByText(/This action isn't supported by the server/)).toBeInTheDocument();
    expect(screen.queryByText("Request method 'GET' is not supported")).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Product Management/ })).toBeInTheDocument();
  });
});

describe('Product stock add/reduce', () => {
  it('shows Add and Reduce stock actions; Reduce is disabled with no stock', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'Add stock for SummitX' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reduce stock for SummitX' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reduce stock for Sold-out Plug' })).toBeDisabled();
  });

  it('adds stock from the latest data and preserves specifications and user guide through the update', async () => {
    const { user } = renderPage();
    await screen.findByText('SummitX');
    db[0].stockQuantity = 15; // another admin changed it after the list loaded
    const dialog = await openDialog(user, 'Add');

    expect(within(dialog).getByTestId('current-stock')).toHaveTextContent('15');
    await user.type(within(dialog).getByLabelText('Quantity to add'), '5');
    await user.type(within(dialog).getByLabelText(/Reason/), 'Supplier delivery');
    await user.click(within(dialog).getByRole('button', { name: 'Add stock' }));

    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    const [url, body] = http.put.mock.calls[0];
    expect(url).toBe('/products/1');
    expect(body).toMatchObject({
      title: 'SummitX',
      price: 1999,
      discountPercentage: 10,
      enabled: true,
      stockQuantity: 20,
      lastUpdateDescription: 'Stock added: +5 (15 → 20) — Supplier delivery',
      specifications: [
        { specKey: 'Power', specValue: '9W' },
        { specKey: 'Guide - Setup', specValue: 'Plug it in' },
        { specKey: 'Guide - Setup', specValue: 'Pair with the app' },
      ],
    });
    // Round trip: nothing was wiped on the server.
    expect(db[0].specRows).toEqual(LAMP.specRows);
    expect(await screen.findByText('Product updated successfully!')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('reduces stock', async () => {
    const { user } = renderPage();
    const dialog = await openDialog(user, 'Reduce');
    await user.type(within(dialog).getByLabelText('Quantity to remove'), '4');
    expect(within(dialog).getByTestId('new-stock')).toHaveTextContent('8');
    await user.click(within(dialog).getByRole('button', { name: 'Reduce stock' }));
    await waitFor(() => expect(db[0].stockQuantity).toBe(8));
    expect(db[0].lastUpdateDescription).toBe('Stock reduced: −4 (12 → 8)');
  });

  it('blocks reducing below zero and sends nothing', async () => {
    const { user } = renderPage();
    const dialog = await openDialog(user, 'Reduce');
    await user.type(within(dialog).getByLabelText('Quantity to remove'), '13');
    expect(within(dialog).getByText('You can reduce by at most 12 (current stock).')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Reduce stock' })).toBeDisabled();
    expect(http.put).not.toHaveBeenCalled();
  });

  it.each(['0', '1.5'])('rejects quantity %s', async (value) => {
    const { user } = renderPage();
    const dialog = await openDialog(user, 'Add');
    await user.type(within(dialog).getByLabelText('Quantity to add'), value);
    expect(within(dialog).getByRole('button', { name: 'Add stock' })).toBeDisabled();
  });

  it('re-checks against the latest stock at save time', async () => {
    const { user } = renderPage();
    const dialog = await openDialog(user, 'Reduce');
    db[0].stockQuantity = 3; // changed while the dialog was open
    await user.type(within(dialog).getByLabelText('Quantity to remove'), '5');
    await user.click(within(dialog).getByRole('button', { name: 'Reduce stock' }));
    expect(await within(dialog).findByText('You can reduce by at most 3 (current stock).')).toBeInTheDocument();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('explains when the product no longer exists, and does not allow saving', async () => {
    const { user } = renderPage();
    await screen.findByText('SummitX');
    db = db.filter((p) => p.id !== 1); // deleted after the list loaded
    await user.click(screen.getByRole('button', { name: 'Add stock for SummitX' }));
    const dialog = screen.getByRole('dialog', { name: 'Adjust stock for SummitX' });
    expect(await within(dialog).findByText(/Couldn't load the latest stock/)).toBeInTheDocument();
    expect(await screen.findByText('This product no longer exists.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Quantity to add'), '2');
    expect(within(dialog).getByRole('button', { name: 'Add stock' })).toBeDisabled();
  });

  it('keeps the pop-up open with the input when the update fails', async () => {
    http.put.mockRejectedValue(httpError(500, { message: 'Something went wrong. Please try again later.' }));
    const { user } = renderPage();
    const dialog = await openDialog(user, 'Add');
    await user.type(within(dialog).getByLabelText('Quantity to add'), '2');
    await user.click(within(dialog).getByRole('button', { name: 'Add stock' }));
    expect(await screen.findByText('Something went wrong. Please try again later.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Quantity to add')).toHaveValue(2);
  });
});

describe('Edit product (regression)', () => {
  it('loads existing specifications and user-guide rows and keeps them on save', async () => {
    const { user } = renderPage();
    await screen.findByText('SummitX');
    await user.click(screen.getAllByRole('button', { name: 'Edit Product' })[0]);

    // Specs and guide lines are visible in the edit form (previously they never loaded).
    expect(screen.getByDisplayValue('9W')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pair with the app')).toBeInTheDocument();

    const title = screen.getByDisplayValue('SummitX');
    await user.clear(title);
    await user.type(title, 'SummitX Pro');
    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));

    await waitFor(() => expect(db[0].title).toBe('SummitX Pro'));
    expect(db[0].specRows).toEqual(LAMP.specRows);
  });
});
