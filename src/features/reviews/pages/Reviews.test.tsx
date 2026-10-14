import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { ReviewsPage } from './ReviewsPage';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { AdminReview } from '../types/review.types';

vi.mock('../../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { get: vi.fn(), patch: vi.fn() } }));
const ecom = vi.mocked(ecommerceAxiosClient);

const ok = <T,>(data: T, message = 'OK') => ({ data: { success: true, message, data } });
const page = (content: AdminReview[]) =>
  ok({ content, number: 0, size: 20, totalElements: content.length, totalPages: 1, first: true, last: true, empty: !content.length });
const axiosError = (status: number, data: Record<string, unknown> = {}) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message ?? 'Request failed'), String(status), response.config, {}, response);
};

const review = (overrides: Partial<AdminReview> = {}): AdminReview => ({
  id: 7,
  productId: 12,
  productTitle: 'Smart Plug',
  rating: 4,
  comment: 'Works well.\nSecond line <b>not bold</b>',
  reviewerName: 'Asha K',
  customerId: 3,
  customerEmail: 'asha@example.com',
  orderNumber: 'ORD-1001',
  active: true,
  moderationReason: null,
  moderatedBy: null,
  moderatedAt: null,
  editedAt: '2026-10-02T09:00:00',
  createdAt: '2026-10-01T10:00:00',
  createdBy: 'asha@example.com',
  updatedAt: '2026-10-02T09:00:00',
  updatedBy: 'asha@example.com',
  ...overrides,
});

const PRODUCTS = [
  { id: 12, title: 'Smart Plug', price: 999, enabled: true, stockQuantity: 5 },
  { id: 13, title: 'Smart Bulb', price: 499, enabled: true, stockQuantity: 5 },
];

let reviews: AdminReview[];

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
};

const renderPage = (url = '/reviews') => {
  const user = userEvent.setup();
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter initialEntries={[url]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/reviews" element={<ReviewsPage />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </Provider>
  );
  return { user };
};

/** The query params of the most recent review-list request. */
const lastListParams = () => {
  const calls = ecom.get.mock.calls.filter(([url]) => url === '/admin/reviews');
  return calls[calls.length - 1]?.[1]?.params;
};

beforeEach(() => {
  vi.clearAllMocks();
  reviews = [review(), review({ id: 8, rating: 1, comment: 'Broke after a week', active: false, editedAt: null })];
  ecom.get.mockImplementation(async (url: string) => {
    if (url === '/products') return ok(PRODUCTS);
    if (url === '/admin/reviews') return page(reviews);
    const id = Number(url.split('/').pop());
    const found = reviews.find((r) => r.id === id);
    if (found) return ok(found);
    throw axiosError(404, { message: 'Review not found.', errorCode: 'REVIEW_NOT_FOUND' });
  });
});

describe('Reviews: list and filters', () => {
  it('shows every column for each review, with plain-text excerpts and links', async () => {
    renderPage();
    const row = await screen.findByTestId('review-row-7');

    expect(within(row).getByRole('link', { name: 'Smart Plug' })).toHaveAttribute('href', '/products?search=Smart%20Plug');
    expect(within(row).getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument();
    // Markup in a review is shown as text, never rendered.
    expect(within(row).getByText('Works well. Second line <b>not bold</b>')).toBeInTheDocument();
    expect(row.querySelector('b')).toBeNull();
    expect(within(row).getByText('Asha K')).toBeInTheDocument();
    expect(within(row).getByText('asha@example.com')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'ORD-1001' })).toHaveAttribute('href', '/order-tracking/ORD-1001');
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(within(row).getByText('Edited')).toBeInTheDocument();
    expect(within(screen.getByTestId('review-row-8')).getByText('Hidden')).toBeInTheDocument();
    expect(screen.getByText('2 reviews')).toBeInTheDocument();
  });

  it('reads the filters from the URL and sends them to the API', async () => {
    renderPage('/reviews?product=12&rating=4&status=hidden');
    await screen.findByTestId('review-row-7');
    expect(lastListParams()).toEqual({ page: 0, size: 20, productId: 12, rating: 4, active: false });
    expect(screen.getByRole('combobox', { name: 'Filter by product' })).toHaveValue('Smart Plug');
  });

  it('Hidden asks only for deactivated reviews, Active only for visible ones, and keeps that in the URL', async () => {
    const { user } = renderPage();
    await screen.findByTestId('review-row-7');
    expect(lastListParams()).toEqual({ page: 0, size: 20 });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'Hidden');
    await waitFor(() => expect(lastListParams()).toEqual({ page: 0, size: 20, active: false }));
    expect(screen.getByTestId('location')).toHaveTextContent('/reviews?status=hidden');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'Active');
    await waitFor(() => expect(lastListParams()).toEqual({ page: 0, size: 20, active: true }));
    expect(screen.getByTestId('location')).toHaveTextContent('/reviews?status=active');
  });

  it('filters by a product picked from the searchable list, and by rating', async () => {
    const { user } = renderPage();
    await screen.findByTestId('review-row-7');

    await user.click(screen.getByRole('combobox', { name: 'Filter by product' }));
    await user.type(screen.getByRole('combobox', { name: 'Filter by product' }), 'bulb');
    expect(screen.queryByRole('option', { name: 'Smart Plug' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Smart Bulb' }));
    await waitFor(() => expect(lastListParams()).toEqual({ page: 0, size: 20, productId: 13 }));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by rating' }), '5 stars');
    await waitFor(() => expect(lastListParams()).toEqual({ page: 0, size: 20, productId: 13, rating: 5 }));
    expect(screen.getByTestId('location')).toHaveTextContent('/reviews?product=13&rating=5');
  });

  it('explains a 403 instead of showing an empty list', async () => {
    ecom.get.mockImplementation(async (url: string) => {
      if (url === '/products') return ok(PRODUCTS);
      throw axiosError(403, { message: 'Forbidden', errorCode: 'FORBIDDEN' });
    });
    renderPage();
    expect(await screen.findByText('No access')).toBeInTheDocument();
    expect(screen.getByText(/do not have access to moderate reviews/)).toBeInTheDocument();
  });
});

describe('Reviews: moderation', () => {
  it('deactivates with an internal reason, updates the badge and shows the audit trail', async () => {
    ecom.patch.mockImplementation(async (_url: string, body?: unknown) => {
      const { reason } = body as { reason?: string };
      reviews = reviews.map((r) =>
        r.id === 7 ? { ...r, active: false, moderationReason: reason ?? null, moderatedBy: 'admin_l1', moderatedAt: '2026-10-13T11:30:00' } : r
      );
      return ok(reviews[0], 'Review deactivated.');
    });
    const { user } = renderPage();
    const row = await screen.findByTestId('review-row-7');

    await user.click(within(row).getByRole('button', { name: 'Deactivate' }));
    const dialog = screen.getByRole('dialog', { name: 'Deactivate review?' });
    await user.type(within(dialog).getByLabelText(/Reason \(internal\)/), '  Shares a phone number  ');
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() =>
      expect(ecom.patch).toHaveBeenCalledWith('/admin/reviews/7/status', { active: false, reason: 'Shares a phone number' })
    );
    expect(await screen.findByText('Review deactivated.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Deactivate review?' })).not.toBeInTheDocument();
    expect(within(row).getByText('Hidden')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Activate' })).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'View review 7' }));
    const drawer = await screen.findByRole('dialog', { name: /Review #7/ });
    expect(within(drawer).getByTestId('moderation-reason')).toHaveTextContent('Shares a phone number');
    expect(within(drawer).getByText('by admin_l1')).toBeInTheDocument();
  });

  it('activates a hidden review without a reason', async () => {
    ecom.patch.mockResolvedValue(ok({ ...reviews[1], active: true }, 'Review activated.'));
    const { user } = renderPage();
    const row = await screen.findByTestId('review-row-8');

    await user.click(within(row).getByRole('button', { name: 'Activate' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Activate review?' })).getByRole('button', { name: 'Activate' }));

    await waitFor(() => expect(ecom.patch).toHaveBeenCalledWith('/admin/reviews/8/status', { active: true }));
    expect(await screen.findByText('Review activated.')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
  });

  it('shows a 400 VALIDATION_FAILED on the reason field and keeps the dialog open', async () => {
    ecom.patch.mockRejectedValue(
      axiosError(400, {
        message: 'Request validation failed.',
        errorCode: 'VALIDATION_FAILED',
        errors: [{ field: 'reason', message: 'Reason must be plain text.' }],
      })
    );
    const { user } = renderPage();
    const row = await screen.findByTestId('review-row-7');

    await user.click(within(row).getByRole('button', { name: 'Deactivate' }));
    const dialog = screen.getByRole('dialog', { name: 'Deactivate review?' });
    await user.type(within(dialog).getByLabelText(/Reason \(internal\)/), '<script>');
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await within(dialog).findByText('Reason must be plain text.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Reason \(internal\)/)).toHaveAttribute('aria-invalid', 'true');
    expect(within(row).getByText('Active')).toBeInTheDocument();
  });

  it('on 404 REVIEW_NOT_FOUND shows the error and reloads the list', async () => {
    ecom.patch.mockImplementation(async () => {
      reviews = reviews.filter((r) => r.id !== 7);
      throw axiosError(404, { message: 'Review not found.', errorCode: 'REVIEW_NOT_FOUND' });
    });
    const { user } = renderPage();
    const row = await screen.findByTestId('review-row-7');

    await user.click(within(row).getByRole('button', { name: 'Deactivate' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Deactivate review?' })).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Review not found.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('review-row-7')).not.toBeInTheDocument());
    expect(screen.getByTestId('review-row-8')).toBeInTheDocument();
  });

  it('shows a no-access message when moderation is forbidden', async () => {
    ecom.patch.mockRejectedValue(axiosError(403, { message: 'Forbidden', errorCode: 'FORBIDDEN' }));
    const { user } = renderPage();
    const row = await screen.findByTestId('review-row-7');

    await user.click(within(row).getByRole('button', { name: 'Deactivate' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Deactivate review?' })).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText(/do not have access to moderate reviews/)).toBeInTheDocument();
  });
});

describe('Reviews: detail drawer is read-only', () => {
  it('shows the full comment as text with line breaks and the audit trail, and offers no way to edit content', async () => {
    const { user } = renderPage();
    const row = await screen.findByTestId('review-row-7');
    await user.click(within(row).getByRole('button', { name: 'View review 7' }));

    const drawer = await screen.findByRole('dialog', { name: /Review #7/ });
    await waitFor(() => expect(ecom.get).toHaveBeenCalledWith('/admin/reviews/7'));
    const comment = within(drawer).getByTestId('review-comment');
    expect(comment.textContent).toBe('Works well.\nSecond line <b>not bold</b>');
    expect(comment).toHaveClass('whitespace-pre-line');
    expect(comment.querySelector('b')).toBeNull();
    expect(within(drawer).getByText('Created')).toBeInTheDocument();
    expect(within(drawer).getByText('Edited by customer')).toBeInTheDocument();
    expect(within(drawer).getByText('Last updated')).toBeInTheDocument();
    expect(within(drawer).getByText('Moderated')).toBeInTheDocument();

    // Nothing anywhere on the screen can change a review's text or rating, or delete it.
    expect(screen.queryByRole('textbox', { name: /comment|review|rating/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
  });

  it('closes and reloads the list when the review no longer exists', async () => {
    const { user } = renderPage();
    const row = await screen.findByTestId('review-row-7');
    reviews = reviews.filter((r) => r.id !== 7);

    await user.click(within(row).getByRole('button', { name: 'View review 7' }));

    expect(await screen.findByText('Review not found.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Review #7/ })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByTestId('review-row-7')).not.toBeInTheDocument());
  });
});
