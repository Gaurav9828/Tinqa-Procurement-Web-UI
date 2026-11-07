import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import alertReducer from '../../../store/alertSlice';
import { SupplierManagementPage } from './SupplierManagementPage';
import { axiosClient } from '../../../api/axiosClient';
import type { SupplierResponse } from '../types/supplier.types';
import { signInAsSuperAdmin } from '../../../test/access';

/**
 * Search and every filter of the supplier list are applied by the backend across all suppliers
 * (GET /v1/admin/suppliers?search=&categoryId=&city=&isActive=&page=&size=); the City filter offers every
 * supplier city (GET /v1/admin/suppliers/cities). The fake below filters and pages like SupplierServiceImpl.
 */
vi.mock('../../../api/axiosClient', () => ({
  axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const http = vi.mocked(axiosClient);
const ok = <T,>(data: T) => ({ data: { success: true, message: 'OK', data, timestamp: '', path: '' } });

const supplier = (id: number, overrides: Partial<SupplierResponse> = {}): SupplierResponse => ({
  id,
  name: `Supplier ${String(id).padStart(2, '0')}`,
  email: `d${id}@example.com`,
  phoneNumber: `98000000${String(id).padStart(2, '0')}`,
  street: '1 Main Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  pincode: '560001',
  categories: [{ id: 1, name: 'Retail', code: 'RET' }],
  isActive: true,
  ...overrides,
});

// 23 suppliers: more than one page. The interesting ones sit on page 2.
const DIRECTORY: SupplierResponse[] = [
  ...Array.from({ length: 21 }, (_, i) => supplier(i + 1)),
  supplier(22, { name: 'Zen Traders', city: 'Pune', categories: [{ id: 2, name: 'Wholesale', code: 'WHL' }] }),
  supplier(23, { name: 'Zoom Supplies', isActive: false }),
];

let queries: URLSearchParams[];

const installFakeBackend = () => {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/v1/admin/suppliers/categories') return ok([{ id: 1, name: 'Retail' }, { id: 2, name: 'Wholesale' }]);
    if (url === '/v1/admin/suppliers/cities') return ok(['Bengaluru', 'Pune']);
    if (url.startsWith('/v1/admin/suppliers?')) {
      const q = new URLSearchParams(url.split('?')[1]);
      queries.push(q);
      const search = (q.get('search') ?? '').toLowerCase();
      const categories = q.getAll('categoryId').map(Number);
      const cities = q.getAll('city').map((c) => c.toLowerCase());
      const active = q.get('isActive');
      const rows = DIRECTORY.filter(
        (d) =>
          (!search || d.name.toLowerCase().includes(search) || d.email.includes(search)) &&
          (categories.length === 0 || d.categories.some((c) => categories.includes(c.id))) &&
          (cities.length === 0 || cities.includes(d.city.toLowerCase())) &&
          (active === null || String(d.isActive) === active)
      );
      const page = Number(q.get('page'));
      const size = Number(q.get('size'));
      return ok({
        content: rows.slice(page * size, page * size + size),
        totalPages: Math.ceil(rows.length / size),
        totalElements: rows.length,
      });
    }
    throw new Error(`Unexpected GET ${url}`);
  });
};

const renderPage = () => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/suppliers']}>
      <Provider store={store}>
        <SupplierManagementPage />
      </Provider>
    </MemoryRouter>
  );
  return { user };
};

const lastQuery = () => queries[queries.length - 1];
const rowNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).queryByText(/^(Supplier \d+|Z\w+ \w+)$/)?.textContent)
    .filter(Boolean);

beforeEach(() => {
  signInAsSuperAdmin('ADMIN_L2');
  vi.clearAllMocks();
  queries = [];
  installFakeBackend();
});

describe('Supplier list search and filters', () => {
  it('pages through every supplier instead of stopping at the first page', async () => {
    const { user } = renderPage();
    expect(await screen.findByText('Supplier 01')).toBeInTheDocument();
    expect(screen.queryByText('Zen Traders')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Zen Traders')).toBeInTheDocument();
    expect(lastQuery().get('page')).toBe('1');
  });

  it('sends the search to the backend, so matches on later pages are found', async () => {
    const { user } = renderPage();
    await screen.findByText('Supplier 01');

    await user.type(screen.getByPlaceholderText(/search suppliers/i), 'zen{Enter}');
    await waitFor(() => expect(rowNames()).toEqual(['Zen Traders']));
    expect(lastQuery().get('search')).toBe('zen');
  });

  it('offers every supplier city and filters by it on the server', async () => {
    const { user } = renderPage();
    await screen.findByText('Supplier 01');

    await user.click(screen.getByRole('button', { name: /City \/ State/ }));
    await user.click(screen.getByLabelText('Pune'));
    await waitFor(() => expect(rowNames()).toEqual(['Zen Traders']));
    expect(lastQuery().getAll('city')).toEqual(['Pune']);
  });

  it('applies the category and status filters on the server', async () => {
    const { user } = renderPage();
    await screen.findByText('Supplier 01');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Wholesale');
    await waitFor(() => expect(rowNames()).toEqual(['Zen Traders']));
    expect(lastQuery().getAll('categoryId')).toEqual(['2']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), '');
    await user.click(screen.getByRole('button', { name: /^Status/ }));
    await user.click(screen.getByLabelText('Inactive'));
    await waitFor(() => expect(rowNames()).toEqual(['Zoom Supplies']));
    expect(lastQuery().get('isActive')).toBe('false');
  });
});
