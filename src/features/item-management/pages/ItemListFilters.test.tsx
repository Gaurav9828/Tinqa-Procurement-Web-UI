import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import alertReducer from '../../../store/alertSlice';
import { ItemManagementPage } from './ItemManagementPage';
import { axiosClient } from '../../../api/axiosClient';
import type { ItemResponse } from '../types/item.types';
import { signInAsSuperAdmin } from '../../../test/access';

/**
 * Search and every filter of the item list are applied by the backend across the whole catalog
 * (GET /v1/admin/items?search=&categoryId=&unitOfMeasure=&isActive=&page=&size=), never only to the loaded page.
 * The fake below filters and pages like ItemServiceImpl.
 */
vi.mock('../../../api/axiosClient', () => ({
  axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const http = vi.mocked(axiosClient);
const ok = <T,>(data: T) => ({ data: { success: true, message: 'OK', data, timestamp: '', path: '' } });

const item = (id: number, overrides: Partial<ItemResponse> = {}): ItemResponse => ({
  id,
  categories: [{ id: 1, name: 'Electronics' }],
  name: `Item ${String(id).padStart(2, '0')}`,
  sku: `SKU-${id}`,
  unitOfMeasure: 'PCS',
  mrp: 100,
  countryOfOrigin: 'India',
  isActive: true,
  warranties: [],
  ...overrides,
});

// 25 items: more than one page. The interesting ones sit on page 2.
const CATALOG: ItemResponse[] = [
  ...Array.from({ length: 22 }, (_, i) => item(i + 1)),
  item(23, { name: 'Zinc Wire', sku: 'ZW-1', unitOfMeasure: 'KG', categories: [{ id: 2, name: 'Hardware' }] }),
  item(24, { name: 'Zeta Bolt', sku: 'ZB-1', isActive: false, categories: [{ id: 2, name: 'Hardware' }] }),
  item(25, { name: 'Zulu Lamp', sku: 'ZL-1' }),
];

let queries: URLSearchParams[];

const installFakeBackend = () => {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/v1/admin/items/categories') return ok([{ id: 1, name: 'Electronics' }, { id: 2, name: 'Hardware' }]);
    if (url.startsWith('/v1/admin/items?')) {
      const q = new URLSearchParams(url.split('?')[1]);
      queries.push(q);
      const search = (q.get('search') ?? '').toLowerCase();
      const categories = q.getAll('categoryId').map(Number);
      const units = q.getAll('unitOfMeasure');
      const active = q.get('isActive');
      const rows = CATALOG.filter(
        (i) =>
          (!search || i.name.toLowerCase().includes(search) || (i.sku ?? '').toLowerCase().includes(search)) &&
          (categories.length === 0 || i.categories.some((c) => categories.includes(c.id))) &&
          (units.length === 0 || units.includes(i.unitOfMeasure)) &&
          (active === null || String(i.isActive) === active)
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
    <MemoryRouter initialEntries={['/item']}>
      <Provider store={store}>
        <ItemManagementPage />
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
    .map((row) => within(row).queryByText(/^(Item \d+|Z\w+ \w+)$/)?.textContent)
    .filter(Boolean);
const openHeaderFilter = async (user: ReturnType<typeof userEvent.setup>, title: string) =>
  user.click(screen.getByTitle(`Filter by ${title}`));

beforeEach(() => {
  signInAsSuperAdmin('ADMIN_L1');
  vi.clearAllMocks();
  queries = [];
  installFakeBackend();
});

describe('Item list search and filters', () => {
  it('pages through the whole catalog instead of stopping at the first page', async () => {
    const { user } = renderPage();
    expect(await screen.findByText('Item 01')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.queryByText('Zulu Lamp')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Zulu Lamp')).toBeInTheDocument();
    expect(lastQuery().get('page')).toBe('1');
  });

  it('sends the search to the backend, so matches on later pages are found', async () => {
    const { user } = renderPage();
    await screen.findByText('Item 01');

    await user.type(screen.getByPlaceholderText(/search items/i), 'zulu{Enter}');
    expect(await screen.findByText('Zulu Lamp')).toBeInTheDocument();
    expect(lastQuery().get('search')).toBe('zulu');
    expect(lastQuery().get('page')).toBe('0');
    expect(rowNames()).toEqual(['Zulu Lamp']);
  });

  it('does not ask the server again for a search it can already answer', async () => {
    const { user } = renderPage();
    await screen.findByText('Item 01');
    const box = screen.getByPlaceholderText(/search items/i);

    await user.type(box, 'z{Enter}');
    await waitFor(() => expect(rowNames()).toEqual(['Zinc Wire', 'Zeta Bolt', 'Zulu Lamp']));
    const requests = queries.length;

    // Narrower than a complete result: filtered locally.
    await user.type(box, 'ulu{Enter}');
    await waitFor(() => expect(rowNames()).toEqual(['Zulu Lamp']));
    // Erasing back to a term already searched: reused.
    await user.clear(box);
    await user.type(box, 'z{Enter}');
    await waitFor(() => expect(rowNames()).toEqual(['Zinc Wire', 'Zeta Bolt', 'Zulu Lamp']));
    expect(queries).toHaveLength(requests);
  });

  it('sends the category picked in the toolbar to the backend', async () => {
    const { user } = renderPage();
    await screen.findByText('Item 01');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Hardware');
    await waitFor(() => expect(rowNames()).toEqual(['Zinc Wire', 'Zeta Bolt']));
    expect(lastQuery().getAll('categoryId')).toEqual(['2']);
  });

  it('applies the Status header filter on the server, finding inactive items beyond the first page', async () => {
    const { user } = renderPage();
    await screen.findByText('Item 01');

    await openHeaderFilter(user, 'Status');
    await user.click(screen.getByText('Inactive'));
    await waitFor(() => expect(rowNames()).toEqual(['Zeta Bolt']));
    expect(lastQuery().get('isActive')).toBe('false');
  });

  it('offers every unit of measure, not only those on the loaded page, and filters by it on the server', async () => {
    const { user } = renderPage();
    await screen.findByText('Item 01');

    await openHeaderFilter(user, 'UOM');
    await user.click(screen.getByText('KG'));
    await waitFor(() => expect(rowNames()).toEqual(['Zinc Wire']));
    expect(lastQuery().getAll('unitOfMeasure')).toEqual(['KG']);
  });

  it('keeps the header filters reachable when nothing matches, so they can be cleared', async () => {
    const { user } = renderPage();
    await screen.findByText('Item 01');

    await openHeaderFilter(user, 'UOM');
    await user.click(screen.getByText('LTR'));
    expect(await screen.findByText('No Items Found')).toBeInTheDocument();

    // The unfiltered first page was already loaded, so it comes back without another request.
    const requests = queries.length;
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(await screen.findByText('Item 01')).toBeInTheDocument();
    expect(queries).toHaveLength(requests);
  });
});
