import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
import type { ProductComponentRequest, ProductComponentResponse, ProductResponseDto } from '../types/product.types';
import { fillGst } from './gstTestUtil';
import { noBarcodes, scanAllBarcodes, scanUnitBarcodes, openFormTab, fillFrontImage } from './barcodeTestUtil';
import { DIORAMAS, fillCategory } from './categoryTestUtil';
import { signInAsSuperAdmin } from '../../../test/access';
import { DRAFT_SAVED_MESSAGE } from '../hooks/useProductActions';

/**
 * Drafts and versions against fake backends (HTTP clients only):
 *  - Ecommerce: POST/PUT /products with `draft`, POST /products/{id}/new-version.
 *  - Procurement: approvals (the sold laptop is approved), item stock for the barcodes.
 */
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
const ecom = vi.mocked(ecommerceAxiosClient);
const procurement = vi.mocked(axiosClient);
type User = ReturnType<typeof userEvent.setup>;

const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, data, timestamp: '', path: '' } });
const httpError = (status: number, data: Record<string, unknown>) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message), String(status), response.config, {}, response);
};

let db: ProductResponseDto[];
/** Products whose CREATE request was rejected (their pieces were returned). */
let rejected: number[];
let nextId: number;
const toComponents = (requests: ProductComponentRequest[]): ProductComponentResponse[] =>
  requests.map((c, i) => ({ ...c, id: 700 + i, warranties: c.warranties.map((w, j) => ({ ...w, id: 7000 + j })) }));

const SOLD_LAPTOP: ProductResponseDto = {
  id: 1,
  title: 'Laptop X',
  modelName: 'LX-1',
  category: DIORAMAS,
  price: 59999,
  hsnSac: '8471',
  gstRate: 18,
  image1Url: 'https://cdn.tinqa.com/laptop.png',
  image1Description: 'The laptop open, screen and keyboard from the front.',
  enabled: true,
  stockQuantity: 0,
  specs: [],
  userGuide: [],
  warranties: [],
  components: [
    { id: 50, itemId: 7, itemName: 'Motherboard', itemSku: 'MB-1', quantity: 1, warranties: [] },
    { id: 51, itemId: 8, itemName: 'USB Cable', itemSku: 'USB-C', quantity: 2, warranties: [] },
  ],
  draft: false,
  versionNumber: 1,
  previousVersionId: null,
  sold: true,
};

const installBackends = () => {
  procurement.get.mockImplementation(async (url: string) => {
    const barcodes = noBarcodes(url);
    if (barcodes) return barcodes;
    if (url === '/v1/product-approvals/latest') {
      // The laptop was approved when it was created; drafts have no request yet
      return ok([
        { id: 11, ecommerceProductId: 1, productTitle: 'Laptop X', requestType: 'CREATE', status: 'APPROVED' },
        ...rejected.map((id) => ({ id: 100 + id, ecommerceProductId: id, productTitle: '', requestType: 'CREATE', status: 'REJECTED', decisionReason: 'Fix it' })),
      ]);
    }
    if (url.startsWith('/v1/admin/items?')) return ok({ content: [], totalPages: 1, totalElements: 0 });
    // The components' items: no warranties, plenty in stock
    if (/^\/v1\/admin\/items\/\d+\/warranties$/.test(url)) return ok([]);
    const availability = /^\/v1\/stocks\/items\/(\d+)\/availability$/.exec(url);
    if (availability) {
      return ok({ itemId: Number(availability[1]), itemName: '', itemSku: '', unitOfMeasure: 'PCS', totalAvailableUnits: 10, stocks: [] });
    }
    if (url === '/v1/stocks') return ok([]);
    throw httpError(404, { success: false, message: 'Not found' });
  });
  procurement.post.mockImplementation(async (url: string, raw: unknown) => {
    const body = raw as { ecommerceProductId: number; productTitle: string };
    if (url !== '/v1/product-approvals') throw httpError(404, { success: false, message: 'Not found' });
    return ok({ id: 900, ecommerceProductId: body.ecommerceProductId, productTitle: body.productTitle, requestType: 'CREATE', status: 'PENDING' });
  });
  ecom.get.mockImplementation(async (url: string) => {
    if (url === '/admin/product-categories') return ok([DIORAMAS]);
    if (url === '/products') return ok(structuredClone(db));
    throw httpError(405, { success: false, message: 'Method not allowed' });
  });
  ecom.post.mockImplementation(async (url: string, raw: unknown) => {
    const version = /^\/products\/(\d+)\/new-version$/.exec(url);
    if (version) {
      const source = db.find((p) => p.id === Number(version[1]))!;
      if (db.some((p) => p.previousVersionId === source.id && p.draft)) {
        throw httpError(409, {
          success: false,
          errorCode: 'PRODUCT_VERSION_EXISTS',
          message: 'A new version copied from Laptop X v0.1 (#1) is already waiting as a draft: Laptop X v0.2 (#2). Finish that one instead.',
        });
      }
      // The name's next version, without a model name (each version has its own)
      const versionNumber = Math.max(...db.filter((p) => p.title === source.title).map((p) => p.versionNumber ?? 1)) + 1;
      const copy: ProductResponseDto = { ...structuredClone(source), id: nextId++, draft: true, enabled: false, sold: false, modelName: null, versionNumber, previousVersionId: source.id };
      db.push(copy);
      return ok(copy, `v0.${versionNumber} of Laptop X created as a draft`);
    }
    const body = raw as ProductResponseDto & { components?: ProductComponentRequest[] };
    const product = { ...body, id: nextId++, category: DIORAMAS, warranties: [], components: toComponents(body.components ?? []) } as ProductResponseDto;
    db.push(product);
    return ok(product, 'Product created successfully');
  });
  ecom.put.mockImplementation(async (url: string, raw: unknown) => {
    const body = raw as ProductResponseDto & { components?: ProductComponentRequest[] };
    const index = db.findIndex((p) => `/products/${p.id}` === url);
    // Warranties are left as they are (not under test here)
    const fields: Partial<ProductResponseDto> & { components?: ProductComponentRequest[] } = { ...body };
    delete fields.warranties;
    delete fields.components;
    db[index] = { ...db[index], ...fields, components: body.components === undefined ? db[index].components : toComponents(body.components) };
    return ok(db[index], 'Product updated successfully');
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

const row = (id: number) => screen.getByTestId(`product-row-${id}`);
const lastBody = (method: 'post' | 'put') => ecom[method].mock.calls.at(-1)?.[1] as Record<string, unknown>;

const startDraft = async (user: User, title = 'Diorama Z') => {
  await screen.findByText('Laptop X');
  await user.click(screen.getByRole('button', { name: /Create Product/ }));
  await user.type(screen.getByPlaceholderText('Product Title'), title);
};

beforeEach(() => {
  signInAsSuperAdmin('ADMIN_L1');
  vi.clearAllMocks();
  db = [structuredClone(SOLD_LAPTOP)];
  rejected = [];
  nextId = 2;
  installBackends();
});

describe('Save as draft', () => {
  it('needs only a title and a category, holds no stock and is not sent for approval', async () => {
    const { user } = renderPage();
    await startDraft(user);
    const saveDraft = screen.getByRole('button', { name: 'Save as Draft' });
    expect(saveDraft).toBeDisabled(); // no category yet
    expect(screen.getAllByRole('button', { name: 'Create Product' }).at(-1)).toBeDisabled(); // price, GST… missing

    await fillCategory(user);
    expect(saveDraft).toBeEnabled();
    await user.click(saveDraft);

    await waitFor(() => expect(ecom.post).toHaveBeenCalledTimes(1));
    const body = lastBody('post');
    expect(body).toMatchObject({ title: 'Diorama Z', categoryName: 'Dioramas', draft: true, enabled: false, stockQuantity: 0 });
    expect(body).not.toHaveProperty('price');
    expect(body.newUnits).toBeUndefined();
    expect(procurement.post).not.toHaveBeenCalled(); // no approval request for a draft
    expect(await screen.findByText(DRAFT_SAVED_MESSAGE)).toBeInTheDocument();
    // The form closed and the draft is listed as one, with nothing to stock or activate
    expect(screen.queryByPlaceholderText('Product Title')).not.toBeInTheDocument();
    await waitFor(() => expect(within(row(2)).getByTestId('product-approval-state')).toHaveAttribute('data-state', 'DRAFT'));
    expect(within(row(2)).getByRole('button', { name: 'Add stock for Diorama Z' })).toBeDisabled();
  });

  it('still checks what was filled in, e.g. an HSN/SAC of the wrong length', async () => {
    const { user } = renderPage();
    await startDraft(user);
    await fillCategory(user);
    await openFormTab(user, 'Price & GST');
    await user.type(screen.getByLabelText('HSN / SAC code *'), '94');
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeDisabled();
    await user.type(screen.getByLabelText('HSN / SAC code *'), '05');
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeEnabled();
  });

  it('opens a draft filled in, saves it again, then submits it: its first unit is built and it goes for approval', async () => {
    db.push({ ...structuredClone(SOLD_LAPTOP), id: 5, title: 'Diorama Draft', modelName: null, price: null, hsnSac: null, gstRate: null, image1Url: null, enabled: false, components: [], draft: true, sold: false });
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Continue draft Diorama Draft' }));
    expect(screen.getByRole('heading', { name: /Finish Draft #5/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Product Title')).toHaveValue('Diorama Draft');
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(null); // no price saved yet

    await user.type(screen.getByPlaceholderText('Product Title'), ' Pro');

    await user.type(screen.getByLabelText(/Model name/), 'MDL-8');
    await user.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    expect(ecom.put.mock.calls[0][0]).toBe('/products/5');
    expect(lastBody('put')).toMatchObject({ title: 'Diorama Draft Pro', draft: true, stockQuantity: 0, components: [], warranties: [] });

    await user.click(await screen.findByRole('button', { name: 'Continue draft Diorama Draft Pro' }));
    await openFormTab(user, 'Price & GST');
    await user.type(screen.getByPlaceholderText('0.00'), '4999');
    await fillFrontImage(user);
    await fillGst(user);
    await scanUnitBarcodes(user);
    await user.click(screen.getByRole('button', { name: 'Submit for Approval' }));
    await user.click(screen.getByRole('button', { name: 'Confirm & Submit' }));

    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(2));
    expect(ecom.put.mock.calls[1][0]).toBe('/products/5');
    const body = lastBody('put');
    expect(body).toMatchObject({ draft: false, stockQuantity: 1, price: 4999, gstRate: 18, hsnSac: '9405', enabled: false });
    expect(body.newUnits).toHaveLength(1);
    await waitFor(() => expect(procurement.post).toHaveBeenCalledWith('/v1/product-approvals', expect.objectContaining({ ecommerceProductId: 5 })));
    expect(ecom.post).not.toHaveBeenCalled(); // the draft was finished, not created again
  });
});

describe('Sold products keep their components', () => {
  it('locks the components of a sold product and offers a new version, which opens as a draft', async () => {
    const { user } = renderPage();
    await screen.findByText('Laptop X');
    expect(within(row(1)).getByText('Sold')).toBeInTheDocument();
    await user.click(within(row(1)).getByRole('button', { name: 'Edit Product' }));
    await openFormTab(user, 'Components & barcodes');

    const note = screen.getByTestId('components-sold-locked');
    expect(note).toHaveTextContent('already been sold, so its components are locked');
    await user.click(within(screen.getByRole('group', { name: 'Components' })).getByRole('button', { name: 'Remove component 2' }));
    expect(screen.getByTestId('components-sold-locked')).toHaveTextContent(
      "Laptop X has already been sold, so its components can't change — past orders, warranties and costs depend on them. Create v0.2"
    );
    expect(screen.getByRole('button', { name: 'Review & Request Approval' })).toBeDisabled();

    await user.click(within(screen.getByTestId('components-sold-locked')).getByRole('button', { name: 'Create v0.2' }));
    await waitFor(() => expect(ecom.post).toHaveBeenCalledWith('/products/1/new-version'));
    expect(await screen.findByText(/v0\.2 of "Laptop X" created as a draft \(#2\)\. Give it its own model name/)).toBeInTheDocument();
    // The new version opens in the draft form, components editable, waiting for its own model name
    expect(screen.getByRole('heading', { name: /Finish Draft #2/ })).toHaveTextContent('v0.2');
    expect(screen.getByTestId('new-version-note')).toHaveTextContent('Give it its own model name.');
    expect(screen.getByTestId('new-version-note')).toHaveTextContent('The version it came from keeps selling until this one is approved and turned on');
    expect(screen.getByLabelText(/Model name/)).toHaveValue('');
    expect(screen.getByTestId('product-version')).toHaveTextContent('v0.2');
    expect(screen.queryByTestId('components-sold-locked')).not.toBeInTheDocument();
  });

  it('shows the server’s reason when a new version can’t be made', async () => {
    db.push({ ...structuredClone(SOLD_LAPTOP), id: 2, enabled: false, draft: true, sold: false, versionNumber: 2, previousVersionId: 1 });
    // Stale list: the second version isn't known to this page yet
    ecom.get.mockImplementationOnce(async () => ok(structuredClone(db.slice(0, 1))));
    const { user } = renderPage();
    await screen.findByText('Laptop X');
    await user.click(within(row(1)).getByRole('button', { name: 'Create a new version of Laptop X' }));
    expect(
      await screen.findByText('A new version copied from Laptop X v0.1 (#1) is already waiting as a draft: Laptop X v0.2 (#2). Finish that one instead.')
    ).toBeInTheDocument();
  });

  it('marks versions and model names in the list and waits for a draft copy to be finished before another', async () => {
    db.push({ ...structuredClone(SOLD_LAPTOP), id: 2, modelName: null, enabled: false, draft: true, sold: false, versionNumber: 2, previousVersionId: 1 });
    renderPage();
    await screen.findAllByText('Laptop X');
    expect(within(row(1)).getByTestId('product-version-1')).toHaveTextContent('v0.1');
    expect(within(row(1)).getByTestId('product-model-1')).toHaveTextContent('Model LX-1');
    expect(within(row(1)).getByText('Newer: v0.2 (#2) — draft')).toBeInTheDocument();
    expect(within(row(2)).getByTestId('product-version-2')).toHaveTextContent('v0.2');
    expect(within(row(2)).getByTestId('product-model-2')).toHaveTextContent('No model name yet');
    const create = within(row(1)).getByRole('button', { name: 'Create a new version of Laptop X' });
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'v0.2 (#2), copied from this version, is still a draft. Finish that one first.');
  });

  it('copies a version again once its earlier copy was submitted: the next version of the name', async () => {
    db.push({ ...structuredClone(SOLD_LAPTOP), id: 2, modelName: 'LX-2', enabled: false, sold: false, versionNumber: 2, previousVersionId: 1 });
    nextId = 3;
    const { user } = renderPage();
    await screen.findAllByText('Laptop X');
    const create = within(row(1)).getByRole('button', { name: 'Create a new version of Laptop X' });
    expect(create).toHaveAttribute('title', 'Create v0.3 (to change components)');
    await user.click(create);
    expect(await screen.findByRole('heading', { name: /Finish Draft #3/ })).toHaveTextContent('v0.3');
  });
});

describe('Unsold, switched-off product with 1 unit', () => {
  const OFF_UNIT: ProductResponseDto = { ...SOLD_LAPTOP, id: 3, title: 'Rudraa X', modelName: 'RX-3', enabled: false, stockQuantity: 1, sold: false };
  const removeCable = async (user: User) => {
    await user.click(await screen.findByRole('button', { name: 'Edit Product' }));
    await openFormTab(user, 'Components & barcodes');
    await user.click(within(screen.getByRole('group', { name: 'Components' })).getByRole('button', { name: 'Remove component 2' }));
  };

  it('changes its components freely once a rejection returned its pieces; they are scanned again on resubmission', async () => {
    db = [structuredClone(OFF_UNIT)];
    rejected = [3];
    const { user } = renderPage();
    await removeCable(user);
    expect(screen.queryByTestId('components-locked')).not.toBeInTheDocument();
    expect(screen.getByTestId('components-released')).toHaveTextContent('you scan its unit again with the new components');
    expect(screen.queryByTestId('components-rebuild')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));
    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    const body = lastBody('put');
    expect(body.components as unknown[]).toHaveLength(1);
    expect(body.newUnits).toBeUndefined();
    expect(body.stockQuantity).toBe(1);
  });

  it('rebuilds its unit with the new components: the new barcodes are scanned in the same save', async () => {
    db = [structuredClone(OFF_UNIT)]; // never submitted: its unit and pieces are held
    const { user } = renderPage();
    await removeCable(user);
    expect(screen.queryByTestId('components-locked')).not.toBeInTheDocument();
    const rebuild = screen.getByTestId('components-rebuild');
    expect(rebuild).toHaveTextContent('its current pieces go back to item stock');
    expect(screen.getByRole('button', { name: 'Review & Update' })).toBeDisabled(); // barcodes missing

    await scanAllBarcodes(user, rebuild);
    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));
    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    const [unit] = lastBody('put').newUnits as { barcode: string; parts: { itemId: number; barcodes: string[] }[] }[];
    expect(unit.parts.map((part) => [part.itemId, part.barcodes.length])).toEqual([[7, 1]]); // only the motherboard is left
    expect(lastBody('put').stockQuantity).toBe(1);
  });

  it('refuses while it is on sale, and with more than 1 unit, saying what to do', async () => {
    db = [{ ...structuredClone(OFF_UNIT), enabled: true }, { ...structuredClone(OFF_UNIT), id: 4, title: 'Rudraa Y', stockQuantity: 2 }];
    const { user } = renderPage();
    const editAndRemoveCable = async (id: number) => {
      await user.click(within(await screen.findByTestId(`product-row-${id}`)).getByRole('button', { name: 'Edit Product' }));
      await openFormTab(user, 'Components & barcodes');
      await user.click(within(screen.getByRole('group', { name: 'Components' })).getByRole('button', { name: 'Remove component 2' }));
    };
    await editAndRemoveCable(3);
    expect(screen.getByTestId('components-locked')).toHaveTextContent('Turn it off first, then change the components');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await editAndRemoveCable(4);
    expect(screen.getByTestId('components-locked')).toHaveTextContent('Reduce the stock to 1 (or 0) first');
    expect(screen.getByRole('button', { name: 'Review & Update' })).toBeDisabled();
  });
});

describe('Model names and versions', () => {
  it('adapts a new version from one picked in the title: every value is copied, it gets its own model name and the next version', async () => {
    const { user } = renderPage();
    await screen.findByText('Laptop X');
    await user.click(screen.getByRole('button', { name: /Create Product/ }));
    await user.type(screen.getByPlaceholderText('Product Title'), 'lap');
    // Matching versions are listed from the products already loaded; adapting only loads the version's cost sheet
    // (PRODUCT_COST_VIEW), whose unit and extra costs come along
    const getCalls = ecom.get.mock.calls.length;
    await user.click(within(screen.getByRole('listbox', { name: 'Versions to adapt from' })).getByRole('option', { name: /Laptop X\s*v0\.1\s*Model LX-1/ }));
    const loaded = ecom.get.mock.calls.slice(getCalls).map(([url]) => url);
    expect(loaded.filter((url) => url !== '/admin/costing/settings')).toEqual(['/admin/costing/products/1']);

    expect(screen.getByTestId('adapted-from-note')).toHaveTextContent('Adapted from Laptop X v0.1 (model LX-1): every value was copied in.');
    expect(screen.getByPlaceholderText('Product Title')).toHaveValue('Laptop X');
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(59999);
    expect(screen.getByTestId('product-version')).toHaveTextContent('v0.2');
    // The model name is the one thing not copied: each version has its own
    const model = screen.getByLabelText(/Model name/);
    expect(model).toHaveValue('');
    const create = screen.getAllByRole('button', { name: 'Create Product' }).at(-1)!;
    await scanUnitBarcodes(user);
    expect(create).toBeDisabled();
    await openFormTab(user, 'Basics');
    await user.type(model, 'lx-1');
    expect(screen.getByText('lx-1 is already the model name of Laptop X v0.1 (#1). Each version needs its own.')).toBeInTheDocument();
    expect(create).toBeDisabled();
    await user.clear(model);
    await user.type(model, 'LX-2');
    expect(screen.getByTestId('description-model-line')).toHaveTextContent('Model LX-2 · Version v0.2');

    await user.click(create);
    expect(screen.getByTestId('preview-model')).toHaveTextContent('LX-2 · v0.2 (adapted from Laptop X v0.1)');
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    await waitFor(() => expect(ecom.post).toHaveBeenCalledWith('/products', expect.anything()));
    const body = lastBody('post');
    expect(body).toMatchObject({ title: 'Laptop X', modelName: 'LX-2', parentProductId: 1, price: 59999, hsnSac: '8471', gstRate: 18, categoryName: 'Dioramas' });
    expect(body.components).toEqual([
      expect.objectContaining({ itemId: 7, itemName: 'Motherboard', quantity: 1 }),
      expect.objectContaining({ itemId: 8, itemName: 'USB Cable', quantity: 2 }),
    ]);
    // The approver sees the model name
    await waitFor(() =>
      expect(procurement.post).toHaveBeenCalledWith('/v1/product-approvals', expect.objectContaining({ snapshot: expect.objectContaining({ modelName: 'LX-2' }) }))
    );
  });

  it('a typed name keeps the form as it is, and "Start blank" undoes an adaptation', async () => {
    const { user } = renderPage();
    await screen.findByText('Laptop X');
    await user.click(screen.getByRole('button', { name: /Create Product/ }));
    await user.type(screen.getByPlaceholderText('Product Title'), 'Rudra');
    expect(screen.queryByRole('listbox', { name: 'Versions to adapt from' })).not.toBeInTheDocument();
    expect(screen.getByTestId('product-version')).toHaveTextContent('v0.1');

    await user.clear(screen.getByPlaceholderText('Product Title'));
    await user.type(screen.getByPlaceholderText('Product Title'), 'LX-1');
    await user.keyboard('{Enter}'); // picks the version whose model name matches
    expect(screen.getByTestId('adapted-from-note')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start blank' }));
    expect(screen.queryByTestId('adapted-from-note')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Product Title')).toHaveValue('');
  });

  it('edits the model name, which the approver sees in the changes', async () => {
    const { user } = renderPage();
    await screen.findByText('Laptop X');
    await user.click(within(row(1)).getByRole('button', { name: 'Edit Product' }));
    const model = screen.getByLabelText(/Model name/);
    expect(model).toHaveValue('LX-1');
    expect(screen.getByTestId('product-version')).toHaveTextContent('v0.1');
    await user.clear(model);
    expect(screen.getByText('Model name is required.')).toBeInTheDocument();
    await user.type(model, 'LX-1 Pro');
    await user.click(screen.getByRole('button', { name: 'Review & Request Approval' }));
    await user.click(screen.getByRole('button', { name: 'Send for Approval' }));
    await waitFor(() => expect(procurement.post).toHaveBeenCalledWith('/v1/product-approvals', expect.anything()));
    const request = procurement.post.mock.calls.at(-1)?.[1] as { proposedChanges: { modelName: string }; changeSummary: { label: string; oldValue: string; newValue: string }[] };
    expect(request.proposedChanges.modelName).toBe('LX-1 Pro');
    expect(request.changeSummary).toContainEqual({ label: 'Model name', oldValue: 'LX-1', newValue: 'LX-1 Pro' });
  });

  it('adds the software and its version in an edit, which the approver sees in the changes and the snapshot', async () => {
    const { user } = renderPage();
    await screen.findByText('Laptop X');
    await user.click(within(row(1)).getByRole('button', { name: 'Edit Product' }));
    expect(screen.getByLabelText('Software name')).toHaveValue('');
    await user.type(screen.getByLabelText('Software name'), 'TinQa OS');
    // Only the name: the version is still needed before the change can be sent
    expect(screen.getByRole('button', { name: 'Review & Request Approval' })).toBeDisabled();
    await user.type(screen.getByLabelText('Software version'), '2.1.0');
    await user.click(screen.getByRole('button', { name: 'Review & Request Approval' }));
    await user.click(screen.getByRole('button', { name: 'Send for Approval' }));
    await waitFor(() => expect(procurement.post).toHaveBeenCalledWith('/v1/product-approvals', expect.anything()));
    const request = procurement.post.mock.calls.at(-1)?.[1] as {
      proposedChanges: { softwareName: string; softwareVersion: string };
      snapshot: { softwareName: string | null; softwareVersion: string | null };
      changeSummary: { label: string; oldValue: string; newValue: string }[];
    };
    expect(request.proposedChanges).toMatchObject({ softwareName: 'TinQa OS', softwareVersion: '2.1.0' });
    expect(request.snapshot).toMatchObject({ softwareName: 'TinQa OS', softwareVersion: '2.1.0' });
    expect(request.changeSummary).toContainEqual({ label: 'Software', oldValue: 'None', newValue: 'TinQa OS 2.1.0' });
  });
});
