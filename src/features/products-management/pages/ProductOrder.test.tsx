import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { ProductManagementPage } from './ProductManagementPage';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ProductCategory, ProductResponseDto } from '../types/product.types';
import { signInAsSuperAdmin } from '../../../test/access';
import { useAuthStore } from '../../../store/useAuthStore';
import { DIORAMAS } from './categoryTestUtil';

/**
 * Storefront order (drag and drop in Products Management). Only the HTTP client is mocked, with a fake of the
 * Ecommerce BE: GET /products lists products in display order, and PUT /products/display-order puts the given
 * products in that order in the positions they already hold (ProductServiceImpl.reorderProducts).
 */
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const http = vi.mocked(ecommerceAxiosClient);
vi.mock('../../../api/axiosClient', () => ({
  axiosClient: { get: vi.fn(async () => ({ data: { success: true, message: 'OK', data: { content: [], totalPages: 0, totalElements: 0 } } })) },
}));

const ACCESSORIES: ProductCategory = { id: 2, name: 'Accessories', slug: 'accessories', sortOrder: 20 };
const okBody = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, errorCode: null, data, timestamp: '', path: '' } });

const product = (id: number, title: string, category: ProductCategory): ProductResponseDto => ({
  id,
  title,
  category,
  tagline: null,
  description: 'A product',
  price: 1000,
  discountPercentage: 0,
  hsnSac: '9405',
  gstRate: 18,
  image1Url: null,
  image2Url: null,
  image3Url: null,
  image4Url: null,
  image5Url: null,
  enabled: true,
  stockQuantity: 1,
  createdAt: '2026-10-01T09:00:00',
  specs: [],
  userGuide: [],
});

// Dioramas hold positions 1, 3 and 4; the stand (an accessory) position 2
let db: ProductResponseDto[];
let failSave: boolean;

const installFakeBackend = () => {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/admin/product-categories') return okBody([DIORAMAS, ACCESSORIES]);
    if (url === '/products') return okBody(db.map((p) => ({ ...p })));
    throw new Error(`Unexpected GET ${url}`);
  });
  http.put.mockImplementation(async (url: string, body: unknown) => {
    if (url !== '/products/display-order') throw new Error(`Unexpected PUT ${url}`);
    if (failSave) return { data: { success: false, message: 'Product not found', errorCode: 'PRODUCT_NOT_FOUND', data: null } };
    const ids = (body as { productIds: number[] }).productIds;
    const byId = new Map(db.map((p) => [p.id, p]));
    let next = 0;
    db = db.map((p) => (ids.includes(p.id) ? byId.get(ids[next++])! : p));
    return okBody(null, 'Product order saved');
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

const listedTitles = () =>
  screen.getAllByTestId(/^product-row-/).map((row) => within(row).getAllByRole('cell')[1].textContent?.trim());

const handle = (title: string) =>
  screen.getByRole('button', { name: (name) => name.startsWith(`Move ${title}, position`) });

const drag = (fromTitle: string, toTitle: string) => {
  const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '', dropEffect: '' };
  const target = handle(toTitle).closest('tr')!;
  fireEvent.dragStart(handle(fromTitle), { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  fireEvent.dragEnd(handle(fromTitle), { dataTransfer });
};

beforeEach(() => {
  signInAsSuperAdmin('ADMIN_L1');
  db = [
    product(1, 'Taj Mahal', DIORAMAS),
    product(2, 'Display stand', ACCESSORIES),
    product(3, 'Red Fort', DIORAMAS),
    product(4, 'Qutub Minar', DIORAMAS),
  ];
  failSave = false;
  installFakeBackend();
});

describe('Product storefront order', () => {
  it('drags a product to the top of the whole catalog and saves the order', async () => {
    renderPage();
    await screen.findByText('Qutub Minar');
    expect(handle('Qutub Minar')).toHaveAccessibleName('Move Qutub Minar, position 4 of 4');

    drag('Qutub Minar', 'Taj Mahal');

    expect(listedTitles()).toEqual(['Qutub Minar', 'Taj Mahal', 'Display stand', 'Red Fort']);
    expect(http.put).toHaveBeenCalledWith('/products/display-order', { productIds: [4, 1, 2, 3] });
    expect(await screen.findByText('Product order saved')).toBeInTheDocument();
    expect(db.map((p) => p.id)).toEqual([4, 1, 2, 3]);
  });

  it('reorders one category within its own positions, leaving other categories in place', async () => {
    const { user } = renderPage();
    await screen.findByText('Qutub Minar');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'dioramas');
    expect(screen.getByText(/set where it appears among Dioramas/)).toBeInTheDocument();

    // ↑ on the handle moves it one place
    handle('Red Fort').focus();
    await user.keyboard('{ArrowUp}');

    expect(http.put).toHaveBeenCalledWith('/products/display-order', { productIds: [3, 1, 4] });
    expect(listedTitles()).toEqual(['Red Fort', 'Taj Mahal', 'Qutub Minar']);
    await screen.findByText('Product order saved');
    // The stand keeps position 2 of the catalog
    expect(db.map((p) => p.id)).toEqual([3, 2, 1, 4]);
  });

  it('puts the saved order back when saving fails', async () => {
    failSave = true;
    renderPage();
    await screen.findByText('Qutub Minar');

    drag('Red Fort', 'Taj Mahal');

    expect(await screen.findByText('Product not found')).toBeInTheDocument();
    await waitFor(() => expect(listedTitles()).toEqual(['Taj Mahal', 'Display stand', 'Red Fort', 'Qutub Minar']));
  });

  it('waits for the search to be cleared before products can be dragged', async () => {
    const { user } = renderPage();
    await screen.findByText('Qutub Minar');
    await user.type(screen.getByPlaceholderText(/Search by product title/), 'Red');

    expect(screen.getByText('Clear the search to drag products into a new order.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument();
  });

  it('has no drag handles without PRODUCT_PUBLISH', async () => {
    const { user: signedIn } = useAuthStore.getState();
    useAuthStore.setState({
      user: { ...signedIn!, permissions: signedIn!.permissions!.filter((permission) => permission !== 'PRODUCT_PUBLISH') },
    });
    renderPage();
    await screen.findByText('Qutub Minar');

    expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument();
    expect(screen.queryByText(/Drag a product by its handle/)).not.toBeInTheDocument();
  });
});
