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
import { useAuthStore } from '../../../store/useAuthStore';
import type { ProductResponseDto } from '../types/product.types';
import type { ProductApprovalResponse, ProductApprovalStatus } from '../types/productApproval.types';

/**
 * Products live in the Ecommerce backend (mocked ecommerceAxiosClient); Admin L2 approval requests live in
 * the Procurement backend (mocked axiosClient, /v1/product-approvals) — the contract in
 * docs/backend-prompts/product-approval-workflow.md.
 */
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
const ecom = vi.mocked(ecommerceAxiosClient);
const procurement = vi.mocked(axiosClient);
type User = ReturnType<typeof userEvent.setup>;

const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, data, timestamp: '', path: '' } });
const httpError = (status: number, message: string) => {
  const response = { status, statusText: String(status), data: { success: false, message }, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(message, String(status), response.config, {}, response);
};

const product = (id: number, title: string, enabled: boolean): ProductResponseDto => ({
  id,
  title,
  price: 1000 + id,
  image1Url: `https://cdn.tinqa.com/${id}.png`,
  enabled,
  stockQuantity: 1,
  specs: [],
  userGuide: [],
  warranties: [],
  components: [],
});

const request = (id: number, productId: number, title: string, status: ProductApprovalStatus, decisionReason: string | null = null): ProductApprovalResponse => ({
  id,
  ecommerceProductId: productId,
  productTitle: title,
  requestType: 'CREATE',
  status,
  snapshot: {
    title,
    price: 1000 + productId,
    stockQuantity: 1,
    components: [{ itemId: 7, itemName: 'Motherboard', quantity: 2 }],
    warranties: [{ title: 'Motherboard', warrantyType: 'MANUFACTURER', durationValue: 1, durationUnit: 'YEARS', isActive: true }],
    specificationCount: 0,
  },
  requestedBy: 4,
  requestedByUsername: 'admin_l1',
  requestedAt: '2026-10-12T10:00:00Z',
  decidedBy: null,
  decidedByUsername: null,
  decidedAt: null,
  decisionReason,
});

let products: ProductResponseDto[];
let approvals: ProductApprovalResponse[];
let approvalsFail: boolean;

const installBackends = () => {
  ecom.get.mockImplementation(async (url: string) => {
    if (url === '/products') return ok(structuredClone(products));
    throw httpError(405, 'Method not allowed');
  });
  ecom.post.mockImplementation(async (_url: string, body: unknown) => {
    const created = { ...product(100, (body as { title: string }).title, (body as { enabled: boolean }).enabled) };
    products.push(created);
    return ok(created, 'Product created');
  });
  ecom.patch.mockImplementation(async (url: string, body: unknown) => {
    const id = Number(/\/products\/(\d+)\/status/.exec(url)![1]);
    const target = products.find((p) => p.id === id)!;
    target.enabled = (body as { isEnabled: boolean }).isEnabled;
    return ok(target, 'Status updated');
  });
  ecom.put.mockImplementation(async (url: string, body: unknown) => {
    const id = Number(/\/products\/(\d+)$/.exec(url)![1]);
    const index = products.findIndex((p) => p.id === id);
    products[index] = { ...products[index], ...(body as object), id } as ProductResponseDto;
    return ok(products[index], 'Product updated');
  });

  procurement.get.mockImplementation(async (url: string, config?: { params?: unknown }) => {
    if (url === '/v1/product-approvals/latest') {
      if (approvalsFail) throw httpError(503, 'Procurement service unavailable');
      const ids = String((config?.params as { productIds?: string } | undefined)?.productIds ?? '').split(',').map(Number);
      return ok(approvals.filter((a) => ids.includes(a.ecommerceProductId)));
    }
    if (url === '/v1/product-approvals') return ok(approvals.filter((a) => a.status === 'PENDING'));
    return ok({ content: [], totalPages: 0, totalElements: 0 }); // item / stock lookups used by the form
  });
  procurement.post.mockImplementation(async (url: string, body: unknown) => {
    if (url !== '/v1/product-approvals') throw httpError(404, 'Not found');
    const b = body as Partial<ProductApprovalResponse> & { ecommerceProductId: number; productTitle: string };
    const previous = approvals.filter((a) => a.ecommerceProductId === b.ecommerceProductId);
    const created = {
      ...request(900 + approvals.length, b.ecommerceProductId, b.productTitle, 'PENDING'),
      requestType: b.requestType ?? (previous.length ? 'RESUBMISSION' : 'CREATE'),
      ...(b.requestType === 'UPDATE'
        ? { snapshot: b.snapshot, proposedChanges: b.proposedChanges, previousSnapshot: b.previousSnapshot, changeSummary: b.changeSummary, appliedAt: null }
        : {}),
    } as ProductApprovalResponse;
    approvals = [...approvals.filter((a) => a.ecommerceProductId !== b.ecommerceProductId), created];
    return ok(created, 'Submitted');
  });
  procurement.patch.mockImplementation(async (url: string, body: unknown) => {
    const applied = /\/v1\/product-approvals\/(\d+)\/applied/.exec(url);
    if (applied) {
      approvals = approvals.map((a) => (a.id === Number(applied[1]) ? { ...a, appliedAt: '2026-10-13T10:05:00Z' } : a));
      return ok(approvals.find((a) => a.id === Number(applied[1])), 'Marked applied');
    }
    const id = Number(/\/v1\/product-approvals\/(\d+)\/decision/.exec(url)![1]);
    const b = body as { decision: ProductApprovalStatus; reason?: string };
    approvals = approvals.map((a) => (a.id === id ? { ...a, status: b.decision, decisionReason: b.reason ?? null, decidedByUsername: 'admin_l2' } : a));
    return ok(approvals.find((a) => a.id === id), 'Decision recorded');
  });
};

const signIn = (role: 'ADMIN_L1' | 'ADMIN_L2') =>
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: { userId: 4, username: role.toLowerCase(), email: 'a@tinqa.com', role, authClient: 'web', isFirstLogin: false },
  });

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
const stateOf = (id: number) => within(row(id)).getByTestId('product-approval-state');
const waitForStates = () => waitFor(() => expect(stateOf(1)).not.toHaveAttribute('data-state', 'UNKNOWN'));

beforeEach(() => {
  vi.clearAllMocks();
  approvalsFail = false;
  products = [
    product(1, 'Legacy Lamp', true), // created before the workflow
    product(2, 'Pending Panel', false),
    product(3, 'Rejected Router', false),
    product(4, 'Cancelled Cable', false),
    product(5, 'Unsubmitted Switch', false),
    product(6, 'Approved Adapter', true),
  ];
  approvals = [
    request(20, 2, 'Pending Panel', 'PENDING'),
    request(30, 3, 'Rejected Router', 'REJECTED', 'Price is too high'),
    request(40, 4, 'Cancelled Cable', 'CANCELLED', 'Discontinued supplier'),
    request(60, 6, 'Approved Adapter', 'APPROVED'),
  ];
  installBackends();
  signIn('ADMIN_L1');
});

describe('Creating a product needs Admin L2 approval', () => {
  const fillCreate = async (user: User) => {
    await screen.findByText('Legacy Lamp');
    await user.click(screen.getByRole('button', { name: /Create Product/ }));
    await user.type(screen.getByPlaceholderText('Product Title'), 'Touch Panel');
    await user.type(screen.getByPlaceholderText('0.00'), '2999');
    await user.type(screen.getByPlaceholderText('Image Address'), 'https://cdn.tinqa.com/panel.png');
  };
  const confirmCreate = async (user: User) => {
    await user.click(screen.getAllByRole('button', { name: 'Create Product' }).at(-1)!);
    await user.click(await screen.findByRole('button', { name: 'Confirm & Create' }));
  };

  it('creates the product inactive, sends it for approval and says so', async () => {
    const { user } = renderPage();
    await fillCreate(user);
    expect(screen.queryByLabelText('Enable product immediately')).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('created inactive and sent to Admin L2 for approval');
    await confirmCreate(user);

    await waitFor(() => expect(procurement.post).toHaveBeenCalledTimes(1));
    expect(ecom.post.mock.calls[0][1]).toMatchObject({ title: 'Touch Panel', enabled: false });
    expect(procurement.post).toHaveBeenCalledWith(
      '/v1/product-approvals',
      expect.objectContaining({ ecommerceProductId: 100, productTitle: 'Touch Panel', snapshot: expect.objectContaining({ title: 'Touch Panel', price: 2999 }) })
    );
    expect(await screen.findByText('Product created and sent for Admin L2 approval. It stays inactive until Admin L2 approves it.')).toBeInTheDocument();
    await waitFor(() => expect(stateOf(100)).toHaveAttribute('data-state', 'PENDING'));
  });

  it('keeps the product (inactive) and offers "Submit for approval" if sending the request fails', async () => {
    procurement.post.mockRejectedValueOnce(httpError(503, 'Procurement service unavailable'));
    const { user } = renderPage();
    await fillCreate(user);
    await confirmCreate(user);
    expect(await screen.findByText(/Product created \(inactive\), but sending it for approval failed: Procurement service unavailable/)).toBeInTheDocument();
    await waitFor(() => expect(stateOf(100)).toHaveAttribute('data-state', 'NOT_SUBMITTED'));
    await user.click(within(row(100)).getByRole('button', { name: 'Submit Touch Panel for approval' }));
    await waitFor(() => expect(stateOf(100)).toHaveAttribute('data-state', 'PENDING'));
  });
});

describe('Product list shows the approval state and limits actions', () => {
  it('shows each state with what can be done', async () => {
    renderPage();
    await screen.findByText('Legacy Lamp');
    await waitForStates();

    expect(stateOf(1)).toHaveAttribute('data-state', 'LEGACY');
    expect(stateOf(2)).toHaveTextContent('Pending L2 approval');
    expect(stateOf(3)).toHaveTextContent('Rejected');
    expect(stateOf(3)).toHaveTextContent('Reason: Price is too high');
    expect(stateOf(4)).toHaveTextContent('Cancelled');
    expect(stateOf(4)).toHaveTextContent('Reason: Discontinued supplier');
    expect(stateOf(5)).toHaveTextContent('Not submitted');
    expect(stateOf(6)).toHaveTextContent('Approved');

    const edit = (id: number) => within(row(id)).getByTitle(/Edit Product|Waiting for Admin L2|Cancelled by Admin L2/);
    expect(edit(2)).toBeDisabled(); // under review
    expect(edit(2)).toHaveAttribute('title', expect.stringContaining('Waiting for Admin L2 approval'));
    expect(edit(4)).toBeDisabled(); // cancelled is final
    expect(edit(3)).toBeEnabled();
    expect(edit(6)).toBeEnabled();

    expect(within(row(3)).getByRole('button', { name: 'Resubmit Rejected Router for approval' })).toBeInTheDocument();
    expect(within(row(5)).getByRole('button', { name: 'Submit Unsubmitted Switch for approval' })).toBeInTheDocument();
    expect(within(row(2)).queryByRole('button', { name: /for approval/ })).not.toBeInTheDocument();
    expect(within(row(4)).queryByRole('button', { name: /for approval/ })).not.toBeInTheDocument();

    expect(within(row(2)).getByRole('button', { name: 'Add stock for Pending Panel' })).toBeDisabled();
    expect(within(row(6)).getByRole('button', { name: 'Add stock for Approved Adapter' })).toBeEnabled();

    // Admin L1 can't review.
    expect(screen.queryByRole('button', { name: /Review approval/ })).not.toBeInTheDocument();
  });

  it('resubmits a rejected product', async () => {
    const { user } = renderPage();
    await screen.findByText('Rejected Router');
    await waitForStates();
    await user.click(within(row(3)).getByRole('button', { name: 'Resubmit Rejected Router for approval' }));
    await waitFor(() => expect(stateOf(3)).toHaveAttribute('data-state', 'PENDING'));
    expect(await screen.findByText('Product resubmitted for Admin L2 approval. It stays inactive until approved.')).toBeInTheDocument();
  });

  it('a rejected product can be edited but not switched on; the reason is shown', async () => {
    const { user } = renderPage();
    await screen.findByText('Rejected Router');
    await waitForStates();
    await user.click(within(row(3)).getByTitle('Edit Product'));
    expect(screen.getByRole('note')).toHaveTextContent('Rejected by Admin L2');
    expect(screen.getByRole('note')).toHaveTextContent('Reason: Price is too high');
    const enabled = screen.getByLabelText('Product is Enabled (Active in store)');
    expect(enabled).not.toBeChecked();
    expect(enabled).toBeDisabled();
    expect(screen.getByTestId('activation-locked')).toHaveTextContent('activated only after Admin L2 approves it');

    const title = screen.getByDisplayValue('Rejected Router');
    await user.clear(title);
    await user.type(title, 'Rejected Router v2');
    await user.click(screen.getByRole('button', { name: 'Review & Update' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm & Update' }));
    await waitFor(() => expect(ecom.put).toHaveBeenCalledTimes(1));
    expect(ecom.put.mock.calls[0][1]).toMatchObject({ title: 'Rejected Router v2', enabled: false });
  });

  it('blocks activation everywhere while approval status is unavailable', async () => {
    approvalsFail = true;
    renderPage();
    await screen.findByText('Legacy Lamp');
    expect(await screen.findByText(/Approval status couldn't be loaded \(Procurement service unavailable\)/)).toBeInTheDocument();
    expect(stateOf(5)).toHaveAttribute('data-state', 'UNKNOWN');
    expect(within(row(5)).getByRole('button', { name: 'Add stock for Unsubmitted Switch' })).toBeDisabled();
    expect(stateOf(1)).toHaveAttribute('data-state', 'LEGACY'); // already-active products are unaffected
  });
});

describe('Admin L2 review', () => {
  const openReview = async (user: User, id = 2, title = 'Pending Panel') => {
    await screen.findByText(title);
    await waitForStates();
    await user.click(within(row(id)).getByRole('button', { name: `Review approval for ${title}` }));
    return screen.getByRole('dialog', { name: 'Review product approval' });
  };

  beforeEach(() => signIn('ADMIN_L2'));

  it('shows the submitted snapshot', async () => {
    const { user } = renderPage();
    const dialog = await openReview(user);
    expect(dialog).toHaveTextContent('Pending Panel');
    expect(dialog).toHaveTextContent('requested by admin_l1');
    expect(within(dialog).getByRole('list', { name: 'Components' })).toHaveTextContent('Motherboard× 2');
    expect(dialog).toHaveTextContent('Manufacturer · 1 Year');
  });

  it('approving records the decision and activates the product', async () => {
    const { user } = renderPage();
    const dialog = await openReview(user);
    await user.click(within(dialog).getByRole('radio', { name: 'Approve' }));
    await user.click(within(dialog).getByRole('button', { name: 'Approve & activate' }));

    await waitFor(() => expect(ecom.patch).toHaveBeenCalledTimes(1));
    expect(procurement.patch).toHaveBeenCalledWith('/v1/product-approvals/20/decision', { decision: 'APPROVED' });
    expect(ecom.patch).toHaveBeenCalledWith('/products/2/status', { isEnabled: true });
    expect(procurement.patch.mock.invocationCallOrder[0]).toBeLessThan(ecom.patch.mock.invocationCallOrder[0]);
    expect(await screen.findByText('"Pending Panel" approved and activated.')).toBeInTheDocument();
    await waitFor(() => expect(stateOf(2)).toHaveAttribute('data-state', 'APPROVED'));
    expect(screen.queryByRole('dialog', { name: 'Review product approval' })).not.toBeInTheDocument();
  });

  it('reports an approval whose activation failed, so it can be activated later', async () => {
    ecom.patch.mockRejectedValueOnce(httpError(500, 'Ecommerce unavailable'));
    const { user } = renderPage();
    const dialog = await openReview(user);
    await user.click(within(dialog).getByRole('radio', { name: 'Approve' }));
    await user.click(within(dialog).getByRole('button', { name: 'Approve & activate' }));
    expect(await screen.findByText(/"Pending Panel" was approved, but activating it failed: Ecommerce unavailable/)).toBeInTheDocument();
    await waitFor(() => expect(stateOf(2)).toHaveAttribute('data-state', 'APPROVED'));
  });

  it.each([
    ['Reject', 'REJECTED', 'was rejected. It stays inactive; the creator can edit and resubmit it.'],
    ['Cancel product', 'CANCELLED', 'was cancelled. It stays inactive and can no longer be edited.'],
  ] as const)('%s needs a reason and leaves the product inactive', async (label, decision, message) => {
    const { user } = renderPage();
    const dialog = await openReview(user);
    await user.click(within(dialog).getByRole('radio', { name: label }));
    await user.click(within(dialog).getByRole('button', { name: label }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('A reason is required.');
    expect(procurement.patch).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('Reason *'), '  Missing certification  ');
    await user.click(within(dialog).getByRole('button', { name: label }));
    await waitFor(() => expect(procurement.patch).toHaveBeenCalledWith('/v1/product-approvals/20/decision', { decision, reason: 'Missing certification' }));
    expect(ecom.patch).not.toHaveBeenCalled(); // stays inactive
    expect(await screen.findByText(`"Pending Panel" ${message}`)).toBeInTheDocument();
    await waitFor(() => expect(stateOf(2)).toHaveAttribute('data-state', decision));
  });
});

describe('Updating an approved product needs Admin L2 approval', () => {
  const update = (status: ProductApprovalStatus, extra: Partial<ProductApprovalResponse> = {}): ProductApprovalResponse => ({
    ...request(70, 6, 'Approved Adapter', status),
    requestType: 'UPDATE',
    snapshot: { ...request(70, 6, 'Adapter Pro', status).snapshot, title: 'Adapter Pro' },
    previousSnapshot: request(60, 6, 'Approved Adapter', 'APPROVED').snapshot,
    proposedChanges: { title: 'Adapter Pro', price: 1006, stockQuantity: 1, enabled: true, image1Url: 'https://cdn.tinqa.com/6.png' },
    changeSummary: [{ label: 'Title', oldValue: 'Approved Adapter', newValue: 'Adapter Pro' }],
    appliedAt: null,
    ...extra,
  });

  it('sends the changes for approval instead of saving them', async () => {
    const { user } = renderPage();
    await waitForStates();
    await user.click(within(row(6)).getByTitle('Edit Product'));
    expect(screen.getByTestId('edit-needs-approval')).toBeInTheDocument();
    const title = screen.getByDisplayValue('Approved Adapter');
    await user.clear(title);
    await user.type(title, 'Adapter Pro');
    await user.click(screen.getByRole('button', { name: 'Review & Request Approval' }));
    await user.click(await screen.findByRole('button', { name: 'Send for Approval' }));

    await waitFor(() => expect(procurement.post).toHaveBeenCalledTimes(1));
    expect(ecom.put).not.toHaveBeenCalled();
    expect(procurement.post.mock.calls[0][1]).toMatchObject({
      ecommerceProductId: 6,
      requestType: 'UPDATE',
      proposedChanges: expect.objectContaining({ title: 'Adapter Pro' }),
      previousSnapshot: expect.objectContaining({ title: 'Approved Adapter' }),
      snapshot: expect.objectContaining({ title: 'Adapter Pro' }),
      changeSummary: [{ label: 'Title', oldValue: 'Approved Adapter', newValue: 'Adapter Pro' }],
    });
    expect(await screen.findByText(/Changes sent for Admin L2 approval/)).toBeInTheDocument();
    await waitFor(() => expect(stateOf(6)).toHaveAttribute('data-state', 'UPDATE_PENDING'));
    expect(within(row(6)).getByText('Approved Adapter')).toBeInTheDocument(); // live product unchanged
    expect(within(row(6)).getByTitle(/Changes are waiting for Admin L2 approval/)).toBeDisabled();
  });

  it('Admin L2 approval applies the changes, keeping the live stock', async () => {
    approvals = approvals.map((a) => (a.ecommerceProductId === 6 ? update('PENDING') : a));
    products[5].stockQuantity = 4; // sold / adjusted while the request waited
    signIn('ADMIN_L2');
    const { user } = renderPage();
    await waitFor(() => expect(stateOf(6)).toHaveAttribute('data-state', 'UPDATE_PENDING'));
    await user.click(within(row(6)).getByRole('button', { name: 'Review approval for Approved Adapter' }));
    const dialog = screen.getByRole('dialog', { name: 'Review product approval' });
    expect(within(dialog).getByRole('list', { name: 'Requested changes' })).toHaveTextContent('Adapter Pro');
    expect(within(dialog).queryByRole('radio', { name: /Cancel product/ })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: /Approve/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Approve & apply' }));

    await waitFor(() => expect(procurement.patch).toHaveBeenCalledWith('/v1/product-approvals/70/applied'));
    expect(ecom.put).toHaveBeenCalledWith('/products/6', expect.objectContaining({ title: 'Adapter Pro', stockQuantity: 4 }));
    expect(await screen.findByText('Changes to "Approved Adapter" approved and applied.')).toBeInTheDocument();
    await waitFor(() => expect(within(row(6)).getByText('Adapter Pro')).toBeInTheDocument());
    expect(stateOf(6)).toHaveAttribute('data-state', 'APPROVED');
  });

  it('a rejected update leaves the product unchanged and shows the reason', async () => {
    approvals = approvals.map((a) => (a.ecommerceProductId === 6 ? update('REJECTED', { decisionReason: 'Keep the old name' }) : a));
    renderPage();
    await waitFor(() => expect(stateOf(6)).toHaveAttribute('data-state', 'UPDATE_REJECTED'));
    expect(within(row(6)).getAllByText(/Keep the old name/).length).toBeGreaterThan(0);
    expect(within(row(6)).getByText('Approved Adapter')).toBeInTheDocument();
    expect(within(row(6)).getByTitle('Edit Product')).toBeEnabled();
    expect(ecom.put).not.toHaveBeenCalled();
  });

  it('approved changes that were not applied can be applied from the list', async () => {
    approvals = approvals.map((a) => (a.ecommerceProductId === 6 ? update('APPROVED') : a));
    const { user } = renderPage();
    await waitFor(() => expect(stateOf(6)).toHaveAttribute('data-state', 'UPDATE_NOT_APPLIED'));
    expect(within(row(6)).getByTitle(/Approved changes have not been applied/)).toBeDisabled();
    await user.click(within(row(6)).getByRole('button', { name: 'Apply approved changes to Approved Adapter' }));
    await waitFor(() => expect(procurement.patch).toHaveBeenCalledWith('/v1/product-approvals/70/applied'));
    expect(ecom.put).toHaveBeenCalledWith('/products/6', expect.objectContaining({ title: 'Adapter Pro' }));
    await waitFor(() => expect(stateOf(6)).toHaveAttribute('data-state', 'APPROVED'));
  });
});
