import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../../store/useAuthStore';
import { SupportTicketsPage } from './SupportTicketsPage';
import { SupportTicketDetailPage } from './SupportTicketDetailPage';
import { supportTicketsApi } from '../api/supportTicketsApi';
import { OrderTrackingDetailPage } from '../../order-tracking/pages/OrderTrackingDetailPage';
import { orderTrackingApi } from '../../order-tracking/api/orderTrackingApi';
import type { AdminOrderDetail, OrderReturnInfo } from '../../order-tracking/types/orderTracking.types';
import type { Permission } from '../../../config/access';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type { TicketDetail, TicketMessage, TicketSummary } from '../types/supportTicket.types';
import { superAdminPermissions } from '../../../test/access';
import { DECENCY_ERROR, DECENCY_HINT } from '../../../utils/decency';

// Only the network layer is mocked.
vi.mock('../api/supportTicketsApi', () => ({
  supportTicketsApi: { listTickets: vi.fn(), getTicket: vi.fn(), reply: vi.fn(), updateStatus: vi.fn() },
}));
const api = vi.mocked(supportTicketsApi);
// The real admin order page is mounted for the navigation test; only its API is mocked.
vi.mock('../../order-tracking/api/orderTrackingApi', () => ({
  orderTrackingApi: {
    getOrder: vi.fn(),
    getTrackingStatuses: vi.fn(),
    listOrders: vi.fn(),
    updateTracking: vi.fn(),
    enableReturn: vi.fn(),
    approveReturn: vi.fn(),
    rejectReturn: vi.fn(),
    changeReturnCharge: vi.fn(),
    withdrawReturn: vi.fn(),
    recordInspection: vi.fn(),
  },
}));
const orderApi = vi.mocked(orderTrackingApi);
// Its refund and profit panels are not part of these tests: they stay loading, without a network call
vi.mock('../../refunds/api/refundApi', () => ({
  refundApi: { getOrderRefunds: vi.fn(() => new Promise(() => {})) },
}));
vi.mock('../../products-management/api/costingApi', () => ({
  costingApi: { getOrderProfit: vi.fn(() => new Promise(() => {})) },
}));

// ---------- fixtures ----------
const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });

const TICKET: TicketSummary = {
  id: 7,
  referenceNumber: 'TQ-Q-000007',
  subject: 'LEDs flicker',
  issueType: 'WARRANTY_CLAIM',
  productId: 3,
  productName: 'SummitX',
  status: 'AWAITING_CUSTOMER',
  unreadByCustomer: true,
  lastMessagePreview: 'Could you share a short video?',
  lastMessageAt: '2026-10-05T10:00:00',
  createdAt: '2026-10-04T09:00:00',
  updatedAt: '2026-10-05T10:00:00',
  closedAt: null,
};

const TICKET_2: TicketSummary = {
  ...TICKET,
  id: 8,
  referenceNumber: 'TQ-Q-000008',
  subject: 'Where is my order?',
  issueType: 'ORDER_SHIPPING',
  productId: null,
  productName: null,
  status: 'OPEN',
  unreadByCustomer: false,
  lastMessagePreview: 'It has been a week.',
};

const msg = (id: number, authorType: string, message: string, createdAt: string, authorName: string | null = null): TicketMessage => ({
  id,
  authorType,
  authorName,
  message,
  createdAt,
});

// Deliberately out of order to prove the conversation is shown oldest-first.
const MESSAGES: TicketMessage[] = [
  msg(3, 'SUPPORT', 'Could you share a short video?', '2026-10-05T10:00:00', 'TinQa Support - Ravi'),
  msg(1, 'CUSTOMER', 'The LEDs flicker after 10 minutes.', '2026-10-04T09:00:00', 'Asha Rao'),
  msg(2, 'SYSTEM', 'Marked as in progress by support', '2026-10-04T12:00:00', 'TinQa Support'),
];

const DETAIL: TicketDetail = {
  ...TICKET,
  status: 'IN_PROGRESS',
  customerEmail: 'asha@example.com',
  messages: MESSAGES,
  canReply: true,
  canClose: true,
  // Our reply at 10:00 is unanswered: staff may close it 24 hours later
  awaitingCustomerSince: '2026-10-05T10:00:00',
  closableAt: '2026-10-06T10:00:00',
  closeReason: null,
  closedByType: null,
  closedBy: null,
};

const CLOSED: TicketDetail = {
  ...DETAIL,
  status: 'CLOSED',
  closedAt: '2026-10-06T08:00:00',
  canReply: false,
  canClose: false,
  closableAt: null,
  closeReason: 'Customer confirmed the LEDs work now',
  closedByType: 'SUPPORT',
  closedBy: 'ravi@tinqa.com',
  messages: [...MESSAGES, msg(4, 'SYSTEM', 'Ticket closed by support', '2026-10-06T08:00:00')],
};

const page = (content: TicketSummary[], overrides: Partial<PageResponse<TicketSummary>> = {}) =>
  ok<PageResponse<TicketSummary>>({
    content,
    number: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    first: true,
    last: true,
    empty: content.length === 0,
    ...overrides,
  });

const axiosError = (status: number, data: Record<string, unknown> = {}) => {
  const response = { status, statusText: String(status), data, headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(String(data.message ?? 'Request failed'), String(status), response.config, {}, response);
};

// ---------- helpers ----------
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
};

const renderAt = (entry = '/support-tickets') => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  const user = userEvent.setup();
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[entry]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/support-tickets" element={<SupportTicketsPage />} />
          <Route path="/support-tickets/:referenceNumber" element={<SupportTicketDetailPage />} />
          <Route path="/order-tracking/:orderNumber" element={<OrderTrackingDetailPage />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </Provider>
  );
  return { user };
};

const currentUrl = () => screen.getByTestId('location').textContent;
const lastListParams = () => api.listTickets.mock.calls.at(-1)?.[0];
const ticketPage = (ref = 'TQ-Q-000007') => screen.getByRole('region', { name: `Ticket ${ref}` });

const openDetail = async (detail: TicketDetail = DETAIL) => {
  api.getTicket.mockResolvedValue(ok(detail));
  const ctx = renderAt(`/support-tickets/${detail.referenceNumber}`);
  await within(ticketPage(detail.referenceNumber)).findByRole('list', { name: 'Conversation' });
  return ctx;
};

beforeEach(() => {
  // The reply assistant's follow-up logic depends on "now"; pin it so tests are deterministic.
  // (Only Date.now is stubbed — real timers keep user-event working.)
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-05T12:00:00').getTime());
  api.listTickets.mockResolvedValue(page([TICKET, TICKET_2]));
  api.getTicket.mockResolvedValue(ok(DETAIL));
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: { userId: 7, username: 'admin1', email: 'a@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions: superAdminPermissions('ADMIN_L1') },
  });
});

// ---------- tests ----------
describe('Support tickets list', () => {
  it('shows a loading state, then tickets with subject, reference, issue type, product, preview, activity and indicators', async () => {
    renderAt();
    expect(screen.getByText('Loading support tickets...')).toBeInTheDocument();

    const list = await screen.findByRole('list', { name: 'Support tickets' });
    const [first, second] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('LEDs flicker');
    expect(first).toHaveTextContent('TQ-Q-000007');
    expect(first).toHaveTextContent('Warranty claim');
    expect(first).toHaveTextContent('SummitX');
    expect(within(first).getByTestId('preview')).toHaveTextContent('Could you share a short video?');
    expect(first).toHaveTextContent('Awaiting Customer');
    expect(within(first).getByText('Unread by customer')).toBeInTheDocument();
    expect(first.querySelector('time')).toHaveAttribute('dateTime', '2026-10-05T10:00:00');

    expect(second).toHaveTextContent('Open');
    expect(second).not.toHaveTextContent('Unread by customer');
    expect(second).not.toHaveTextContent('SummitX'); // no product
    expect(api.listTickets).toHaveBeenCalledWith({ status: '', page: 0, size: 20 });
  });

  it('filters by status via the URL and resets to the first page', async () => {
    const { user } = renderAt('/support-tickets?page=2');
    await screen.findByRole('list', { name: 'Support tickets' });
    expect(lastListParams()).toMatchObject({ page: 2 });

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'OPEN');
    await waitFor(() => expect(lastListParams()).toEqual({ status: 'OPEN', page: 0, size: 20 }));
    expect(currentUrl()).toBe('/support-tickets?status=OPEN');
  });

  it('reads the filter and page from the URL', async () => {
    renderAt('/support-tickets?status=RESOLVED&page=1');
    await screen.findByRole('list', { name: 'Support tickets' });
    expect(api.listTickets).toHaveBeenCalledWith({ status: 'RESOLVED', page: 1, size: 20 });
    expect(screen.getByLabelText('Filter by status')).toHaveValue('RESOLVED');
  });

  it('paginates', async () => {
    api.listTickets.mockResolvedValue(page([TICKET], { totalPages: 3, totalElements: 41, last: false }));
    const { user } = renderAt();
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 1 }));
    expect(currentUrl()).toBe('/support-tickets?page=1');
  });

  it('distinguishes "no tickets" from "no tickets with this status"', async () => {
    api.listTickets.mockResolvedValue(page([]));
    renderAt();
    expect(await screen.findByText('No support tickets yet')).toBeInTheDocument();
  });

  it('shows the filtered empty state', async () => {
    api.listTickets.mockResolvedValue(page([]));
    renderAt('/support-tickets?status=CLOSED');
    expect(await screen.findByText('No tickets with this status')).toBeInTheDocument();
  });

  it('opens a ticket when any part of the row is clicked, and Back restores the list view', async () => {
    const { user } = renderAt('/support-tickets?status=AWAITING_CUSTOMER');
    const list = await screen.findByRole('list', { name: 'Support tickets' });
    Object.defineProperty(window, 'scrollY', { value: 640, configurable: true });

    await user.click(within(list).getByText('Could you share a short video?'));
    expect(currentUrl()).toBe('/support-tickets/TQ-Q-000007');
    await within(ticketPage()).findByRole('list', { name: 'Conversation' });

    await user.click(screen.getByRole('button', { name: 'Back to tickets' }));
    expect(currentUrl()).toBe('/support-tickets?status=AWAITING_CUSTOMER');
    await screen.findByRole('list', { name: 'Support tickets' });
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 640));
  });

  it('shows a retryable error on server failure', async () => {
    api.listTickets.mockRejectedValueOnce(axiosError(500)).mockResolvedValueOnce(page([TICKET]));
    const { user } = renderAt();
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('list', { name: 'Support tickets' })).toBeInTheDocument();
  });

  it('shows permission denied on 403 without logging out', async () => {
    api.listTickets.mockRejectedValue(axiosError(403, { message: 'Access denied', errorCode: 'FORBIDDEN' }));
    renderAt();
    expect(await screen.findByText('Permission denied')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('shows the backend message for a rejected filter (VALIDATION_FAILED)', async () => {
    api.listTickets.mockRejectedValue(
      axiosError(400, { message: 'Unsupported ticket status.', errorCode: 'VALIDATION_FAILED', errors: [{ field: 'status', message: 'Unsupported ticket status.' }] })
    );
    renderAt();
    expect(await screen.findByText('Unsupported ticket status.')).toBeInTheDocument();
  });
});

describe('Support ticket detail', () => {
  it('shows customer email, issue, product, status and the conversation oldest-first by author type', async () => {
    await openDetail();
    const pageEl = ticketPage();
    expect(within(pageEl).getByRole('heading', { level: 1 })).toHaveTextContent('LEDs flicker');
    expect(within(pageEl).getByRole('link', { name: /asha@example.com/ })).toHaveAttribute('href', 'mailto:asha@example.com');
    expect(pageEl).toHaveTextContent('Warranty claim');
    expect(pageEl).toHaveTextContent('SummitX (#3)');
    expect(pageEl).toHaveTextContent('In Progress');

    const items = within(within(pageEl).getByRole('list', { name: 'Conversation' })).getAllByRole('listitem');
    expect(items.map((li) => li.getAttribute('data-author'))).toEqual(['CUSTOMER', 'SYSTEM', 'SUPPORT']);
    expect(items[0]).toHaveTextContent('Asha Rao');
    expect(items[0]).toHaveTextContent('The LEDs flicker after 10 minutes.');
    expect(items[1]).toHaveTextContent('Marked as in progress by support');
    expect(items[2]).toHaveTextContent('TinQa Support - Ravi');
  });

  it('renders message text as plain text, never as HTML', async () => {
    const payload = '<img src=x onerror="alert(1)"><b>bold</b>';
    await openDetail({ ...DETAIL, messages: [msg(1, 'CUSTOMER', payload, '2026-10-04T09:00:00', 'Eve')] });
    const conversation = within(ticketPage()).getByRole('list', { name: 'Conversation' });
    expect(conversation).toHaveTextContent(payload);
    expect(conversation.querySelector('img')).toBeNull();
    expect(conversation.querySelector('b')).toBeNull();
  });

  it('shows "Ticket not found" for TICKET_NOT_FOUND, with a way back', async () => {
    api.getTicket.mockRejectedValue(axiosError(404, { message: 'Ticket not found.', errorCode: 'TICKET_NOT_FOUND' }));
    const { user } = renderAt('/support-tickets/TQ-Q-404');
    expect(await screen.findByRole('heading', { name: 'Ticket not found' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to tickets' }));
    expect(currentUrl()).toBe('/support-tickets');
  });

  it('shows permission denied for a 403', async () => {
    api.getTicket.mockRejectedValue(axiosError(403, { message: 'Access denied' }));
    renderAt('/support-tickets/TQ-Q-000007');
    expect(await screen.findByText('Permission denied')).toBeInTheDocument();
  });
});

describe('Support ticket actions', () => {
  it('sends a trimmed reply, applies the returned detail and clears the composer', async () => {
    const afterReply: TicketDetail = {
      ...DETAIL,
      status: 'AWAITING_CUSTOMER',
      messages: [...MESSAGES, msg(5, 'SUPPORT', 'Thanks, we will replace the unit.', '2026-10-06T09:00:00', 'TinQa Support - Ravi')],
    };
    api.reply.mockResolvedValue(ok(afterReply, 'Support reply was added.'));
    const { user } = await openDetail();

    await user.type(screen.getByLabelText('Reply'), '   Thanks, we will replace the unit.   ');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(api.reply).toHaveBeenCalledWith('TQ-Q-000007', 'Thanks, we will replace the unit.');
    expect(await screen.findByText('Support reply was added.')).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Conversation' })).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[3]).toHaveAttribute('data-author', 'SUPPORT');
    expect(within(ticketPage()).getByRole('heading', { level: 1 }).parentElement).toHaveTextContent('Awaiting Customer');
    expect(screen.getByLabelText('Reply')).toHaveValue('');
    expect(api.getTicket).toHaveBeenCalledTimes(1); // used the response; no extra fetch
  });

  it('does not send an empty reply', async () => {
    const { user } = await openDetail();
    await user.type(screen.getByLabelText('Reply'), '    ');
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(api.reply).not.toHaveBeenCalled();
  });

  it('limits replies to 2000 characters', async () => {
    await openDetail();
    expect(screen.getByLabelText('Reply')).toHaveAttribute('maxLength', '2000');
  });

  it('sends with Ctrl+Enter and blocks duplicate sends while saving', async () => {
    let resolve!: (value: ApiResponse<TicketDetail>) => void;
    api.reply.mockImplementation(() => new Promise((r) => (resolve = r)));
    const { user } = await openDetail();

    await user.type(screen.getByLabelText('Reply'), 'Hello');
    await user.keyboard('{Control>}{Enter}{/Control}');
    await user.click(screen.getByRole('button', { name: /Sending/ }));
    expect(api.reply).toHaveBeenCalledTimes(1);
    resolve(ok(DETAIL, 'Support reply was added.'));
    // The draft is cleared, so the button is disabled until something new is typed.
    expect(await screen.findByRole('button', { name: 'Send reply' })).toBeDisabled();
    expect(screen.getByLabelText('Reply')).toHaveValue('');
  });

  it('checks a reply for courtesy as it is typed and never sends an offensive one', async () => {
    const { user } = await openDetail();
    expect(screen.getByText(DECENCY_HINT)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reply'), 'Stop being a chutiya');
    expect(screen.getByText(DECENCY_ERROR)).toBeInTheDocument();
    expect(screen.getByLabelText('Reply')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(api.reply).not.toHaveBeenCalled();
  });

  it("shows the server's OFFENSIVE_LANGUAGE answer under the reply box and keeps the draft", async () => {
    api.reply.mockRejectedValue(axiosError(400, { message: 'Please keep your message polite.', errorCode: 'OFFENSIVE_LANGUAGE' }));
    const { user } = await openDetail();
    await user.type(screen.getByLabelText('Reply'), 'A reply the server refuses');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    // No field named in errors[]: the courtesy message goes under the reply box
    expect(await screen.findByText(DECENCY_ERROR)).toBeInTheDocument();
    expect(screen.getByLabelText('Reply')).toHaveValue('A reply the server refuses');
  });

  it('shows field errors for VALIDATION_FAILED and keeps the draft', async () => {
    api.reply.mockRejectedValue(
      axiosError(400, {
        message: 'Message must be between 1 and 2000 characters.',
        errorCode: 'VALIDATION_FAILED',
        errors: [{ field: 'message', message: 'Message must be between 1 and 2000 characters.' }],
      })
    );
    const { user } = await openDetail();
    await user.type(screen.getByLabelText('Reply'), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    const reply = screen.getByLabelText('Reply');
    await waitFor(() => expect(reply).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getAllByText('Message must be between 1 and 2000 characters.').length).toBeGreaterThan(0);
    expect(reply).toHaveValue('Hi');
  });

  it('keeps the draft on TOO_MANY_REQUESTS and shows the server message', async () => {
    api.reply.mockRejectedValue(axiosError(429, { message: 'Too many messages. Try again later.', errorCode: 'TOO_MANY_REQUESTS' }));
    const { user } = await openDetail();
    await user.type(screen.getByLabelText('Reply'), 'Following up');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(await screen.findByText('Too many messages. Try again later.')).toBeInTheDocument();
    expect(screen.getByLabelText('Reply')).toHaveValue('Following up');
    expect(api.getTicket).toHaveBeenCalledTimes(1);
  });

  it('on TICKET_CLOSED shows the message and reloads into the read-only state', async () => {
    api.reply.mockRejectedValue(axiosError(409, { message: 'This ticket is closed and cannot receive replies.', errorCode: 'TICKET_CLOSED' }));
    const { user } = await openDetail();
    api.getTicket.mockResolvedValue(ok(CLOSED));

    await user.type(screen.getByLabelText('Reply'), 'Late reply');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(await screen.findByText('This ticket is closed and cannot receive replies.')).toBeInTheDocument();
    expect(await screen.findByRole('status', { name: 'Replies disabled' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Reply')).not.toBeInTheDocument();
    expect(api.getTicket).toHaveBeenCalledTimes(2);
  });

  it('offers only IN_PROGRESS, RESOLVED and CLOSED — never the current status', async () => {
    await openDetail(); // IN_PROGRESS
    const group = screen.getByRole('group', { name: 'Change ticket status' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual([
      expect.stringContaining('Mark resolved'),
      expect.stringContaining('Close ticket'),
    ]);
  });

  it('updates status with { status } and applies the returned detail', async () => {
    api.updateStatus.mockResolvedValue(
      ok({ ...DETAIL, status: 'RESOLVED', messages: [...MESSAGES, msg(6, 'SYSTEM', 'Marked as resolved by support', '2026-10-06T09:00:00')] }, 'Support ticket status updated.')
    );
    const { user } = await openDetail();
    await user.click(screen.getByRole('button', { name: /Mark resolved/ }));

    expect(api.updateStatus).toHaveBeenCalledWith('TQ-Q-000007', 'RESOLVED');
    expect(await screen.findByText('Support ticket status updated.')).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Conversation' })).getAllByRole('listitem');
    expect(items.at(-1)).toHaveAttribute('data-author', 'SYSTEM');
    expect(items.at(-1)).toHaveTextContent('Marked as resolved by support');
    const group = screen.getByRole('group', { name: 'Change ticket status' });
    expect(within(group).queryByRole('button', { name: /Mark resolved/ })).not.toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /Mark in progress/ })).toBeInTheDocument();
  });

  // Closing changed on 2026-11-11: it needs a reason and is possible only 24 h after our unanswered reply (closableAt).
  // The old "confirm, then close" flow is replaced by the reason dialog below.
  it('keeps Close disabled until 24 hours after our last reply, and says from when it can be closed', async () => {
    await openDetail(); // now 2026-10-05 12:00, closable from 2026-10-06 10:00
    const close = screen.getByRole('button', { name: /Close ticket/ });
    expect(close).toBeDisabled();
    expect(screen.getByTestId('close-blocked')).toHaveTextContent(/You can close this ticket from .+ if the customer still hasn't replied \(24 hours after our last reply\)\./);
    expect(api.updateStatus).not.toHaveBeenCalled();
  });

  it('keeps Close disabled while the customer is waiting for our reply', async () => {
    await openDetail({
      ...DETAIL,
      messages: [...MESSAGES, msg(5, 'CUSTOMER', 'Any news?', '2026-10-05T11:00:00', 'Asha Rao')],
      awaitingCustomerSince: null,
      closableAt: null,
    });
    expect(screen.getByRole('button', { name: /Close ticket/ })).toBeDisabled();
    expect(screen.getByTestId('close-blocked')).toHaveTextContent(
      "The customer is waiting for our reply. Reply first; you can close the ticket 24 hours after it if they don't respond."
    );
  });

  it('a CLOSED ticket shows who closed it and why', async () => {
    await openDetail(CLOSED);
    const note = screen.getByRole('note', { name: 'Ticket closed' });
    expect(note).toHaveTextContent('by ravi@tinqa.com');
    expect(within(note).getByTestId('ticket-close-reason')).toHaveTextContent('Customer confirmed the LEDs work now');
  });

  it('shows a ticket closed automatically when its return completed', async () => {
    await openDetail({ ...CLOSED, closedByType: 'SYSTEM', closedBy: null, closeReason: 'The return for order ORD-1001 was completed.' });
    const note = screen.getByRole('note', { name: 'Ticket closed' });
    expect(note).toHaveTextContent('by TinQa automatically');
    expect(note).toHaveTextContent('The return for order ORD-1001 was completed.');
  });

  describe('once 24 hours have passed without a customer reply', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-06T10:30:00'));
    });
    afterEach(() => vi.useRealTimers());

    it('closes only with a polite reason, sending CLOSED with the reason, and the ticket becomes read-only', async () => {
      api.updateStatus.mockResolvedValue(ok(CLOSED, 'Ticket closed.'));
      const { user } = await openDetail();
      expect(screen.queryByTestId('close-blocked')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Close ticket/ }));
      const dialog = screen.getByRole('dialog', { name: 'Close ticket' });
      expect(dialog).toHaveTextContent(DECENCY_HINT);

      await user.click(within(dialog).getByRole('button', { name: 'Close ticket' }));
      expect(within(dialog).getByText('Say why you are closing the ticket (at least 5 characters).')).toBeInTheDocument();

      const reason = within(dialog).getByLabelText('Reason for closing');
      await user.type(reason, 'Customer is a bastard');
      expect(within(dialog).getByText(DECENCY_ERROR)).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Close ticket' }));
      expect(api.updateStatus).not.toHaveBeenCalled();

      await user.clear(reason);
      await user.type(reason, '  Customer confirmed the LEDs work now ');
      await user.click(within(dialog).getByRole('button', { name: 'Close ticket' }));
      await waitFor(() => expect(api.updateStatus).toHaveBeenCalledWith('TQ-Q-000007', 'CLOSED', 'Customer confirmed the LEDs work now'));
      expect(await screen.findByRole('status', { name: 'Replies disabled' })).toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Status locked' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog', { name: 'Close ticket' })).not.toBeInTheDocument();
      expect(screen.getByRole('note', { name: 'Ticket closed' })).toHaveTextContent('Customer confirmed the LEDs work now');
    });

    it("shows the server's OFFENSIVE_LANGUAGE error on the reason", async () => {
      api.updateStatus.mockRejectedValue(
        axiosError(400, { message: 'Offensive language', errorCode: 'OFFENSIVE_LANGUAGE', errors: [{ field: 'reason', message: 'Please keep the reason polite.' }] })
      );
      const { user } = await openDetail();
      await user.click(screen.getByRole('button', { name: /Close ticket/ }));
      const dialog = screen.getByRole('dialog', { name: 'Close ticket' });
      await user.type(within(dialog).getByLabelText('Reason for closing'), 'Customer stopped answering');
      await user.click(within(dialog).getByRole('button', { name: 'Close ticket' }));
      expect(await within(dialog).findByText('Please keep the reason polite.')).toBeInTheDocument();
    });

    it('on TICKET_CLOSE_TOO_EARLY explains it and reloads the ticket', async () => {
      api.updateStatus.mockRejectedValue(axiosError(409, { message: 'The customer replied; reply first.', errorCode: 'TICKET_CLOSE_TOO_EARLY' }));
      const { user } = await openDetail();
      await user.click(screen.getByRole('button', { name: /Close ticket/ }));
      const dialog = screen.getByRole('dialog', { name: 'Close ticket' });
      await user.type(within(dialog).getByLabelText('Reason for closing'), 'Customer stopped answering');
      await user.click(within(dialog).getByRole('button', { name: 'Close ticket' }));
      expect(await screen.findByText('The customer replied; reply first.')).toBeInTheDocument();
      await waitFor(() => expect(api.getTicket).toHaveBeenCalledTimes(2));
    });
  });

  it('a CLOSED ticket is read-only: no composer and no status actions', async () => {
    await openDetail(CLOSED);
    expect(screen.getByRole('status', { name: 'Replies disabled' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Reply')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Change ticket status' })).not.toBeInTheDocument();
    expect(ticketPage()).toHaveTextContent('Closed');
  });

  it('on TICKET_ALREADY_CLOSED shows the message and reloads', async () => {
    api.updateStatus.mockRejectedValue(axiosError(409, { message: 'This ticket is already closed.', errorCode: 'TICKET_ALREADY_CLOSED' }));
    const { user } = await openDetail();
    api.getTicket.mockResolvedValue(ok(CLOSED));

    await user.click(screen.getByRole('button', { name: /Mark resolved/ }));
    expect(await screen.findByText('This ticket is already closed.')).toBeInTheDocument();
    expect(await screen.findByRole('status', { name: 'Status locked' })).toBeInTheDocument();
  });

  it('on 403 for an action shows the permission message and stays signed in', async () => {
    api.updateStatus.mockRejectedValue(axiosError(403, { message: 'You do not have permission to perform this action.' }));
    const { user } = await openDetail();
    await user.click(screen.getByRole('button', { name: /Mark resolved/ }));
    expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('on TICKET_NOT_FOUND during an action shows the message and reloads into "not found"', async () => {
    api.reply.mockRejectedValue(axiosError(404, { message: 'Ticket not found.', errorCode: 'TICKET_NOT_FOUND' }));
    const { user } = await openDetail();
    api.getTicket.mockRejectedValue(axiosError(404, { message: 'Ticket not found.', errorCode: 'TICKET_NOT_FOUND' }));

    await user.type(screen.getByLabelText('Reply'), 'Hello?');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(await screen.findByRole('heading', { name: 'Ticket not found' })).toBeInTheDocument();
  });
});

describe('Reply suggestions (local assistant)', () => {
  const customerSays = (text: string, overrides: Partial<TicketDetail> = {}): TicketDetail => ({
    ...DETAIL,
    status: 'AWAITING_CUSTOMER',
    messages: [...MESSAGES, msg(9, 'CUSTOMER', text, '2026-10-05T11:00:00', 'Asha Rao')],
    ...overrides,
  });
  const suggestions = () => screen.getByRole('region', { name: 'Reply suggestions' });

  // Since 2026-11-11 the assistant never closes a ticket (closing needs a reason and 24 h without a customer reply):
  // "Thank & close" became "Thank & wrap up", which only sends the reply.
  it('after the customer says thanks, "Thank & wrap up" only sends the reply; nothing closes the ticket', async () => {
    api.reply.mockResolvedValue(ok(customerSays('Thanks, it works now!'), 'Support reply was added.'));
    const { user } = await openDetail(customerSays('Thanks a lot, it works now!'));

    expect(within(suggestions()).getByTestId('assistant-summary')).toHaveTextContent('The customer says the issue is resolved.');
    expect(within(suggestions()).queryByRole('button', { name: /Send & close/ })).not.toBeInTheDocument();
    await user.click(within(suggestions()).getByRole('button', { name: 'Send: Thank & wrap up' }));

    await waitFor(() => expect(api.reply).toHaveBeenCalledWith('TQ-Q-000007', expect.stringContaining("You're welcome, Asha!")));
    expect(api.updateStatus).not.toHaveBeenCalled();
  });

  it('never offers to close from the suggestions, even when the customer asks for it', async () => {
    await openDetail(customerSays('Problem solved, you can close the ticket'));
    expect(within(suggestions()).queryByRole('button', { name: /Send & close|Close ticket/ })).not.toBeInTheDocument();
    expect(within(suggestions()).getByRole('group', { name: 'Suggested next step' })).toHaveTextContent('24 hours');
  });

  it('"Send" on a non-closing suggestion sends it immediately, without changing status', async () => {
    api.reply.mockResolvedValue(ok(DETAIL, 'Support reply was added.'));
    const { user } = await openDetail(customerSays('Thank you!'));
    await user.click(within(suggestions()).getByRole('button', { name: 'Send: Ask before closing' }));
    expect(api.reply).toHaveBeenCalledWith('TQ-Q-000007', expect.stringContaining('shall I go ahead and close this ticket?'));
    expect(api.updateStatus).not.toHaveBeenCalled();
  });

  it('"Edit" places the suggestion in the reply box for review and sends nothing', async () => {
    const { user } = await openDetail(customerSays('Thanks, but it still flickers'));
    await user.click(within(suggestions()).getByRole('button', { name: 'Edit: Start warranty check' }));
    const box = screen.getByLabelText('Reply');
    expect((box as HTMLTextAreaElement).value).toContain('Sorry the issue is still there, Asha.');
    await waitFor(() => expect(box).toHaveFocus());
    expect(api.reply).not.toHaveBeenCalled();
  });

  it('when the problem persists, never offers to close and suggests marking in progress', async () => {
    api.updateStatus.mockResolvedValue(ok({ ...DETAIL, status: 'IN_PROGRESS' }, 'Support ticket status updated.'));
    const { user } = await openDetail(customerSays('Thanks, but it still flickers'));
    expect(within(suggestions()).queryByRole('button', { name: /Send & close/ })).not.toBeInTheDocument();

    const next = within(suggestions()).getByRole('group', { name: 'Suggested next step' });
    expect(next).toHaveTextContent('Mark in progress?');
    await user.click(within(next).getByRole('button', { name: 'Mark in progress' }));
    expect(api.updateStatus).toHaveBeenCalledWith('TQ-Q-000007', 'IN_PROGRESS');
  });

  it('a close request suggests "Mark resolved", which only changes the status', async () => {
    api.updateStatus.mockResolvedValue(ok({ ...DETAIL, status: 'RESOLVED' }, 'Support ticket status updated.'));
    const { user } = await openDetail(customerSays('Problem solved, you can close the ticket'));
    const next = within(suggestions()).getByRole('group', { name: 'Suggested next step' });
    await user.click(within(next).getByRole('button', { name: 'Mark resolved' }));
    await waitFor(() => expect(api.updateStatus).toHaveBeenCalledWith('TQ-Q-000007', 'RESOLVED'));
    expect(api.reply).not.toHaveBeenCalled();
  });

  it('shows no suggestions right after support replied', async () => {
    await openDetail(DETAIL); // last message is a support reply from 2h earlier
    expect(screen.queryByRole('region', { name: 'Reply suggestions' })).not.toBeInTheDocument();
  });

  it('shows no suggestions on a closed ticket', async () => {
    await openDetail(CLOSED);
    expect(screen.queryByRole('region', { name: 'Reply suggestions' })).not.toBeInTheDocument();
  });

  it('can be collapsed, and remembers that for the next ticket', async () => {
    const { user } = await openDetail(customerSays('Thank you!'));
    await user.click(within(suggestions()).getByRole('button', { name: /Suggested replies/ }));
    expect(within(suggestions()).queryByRole('button', { name: /^Send/ })).not.toBeInTheDocument();
    expect(localStorage.getItem('tinqa.supportTickets.suggestionsCollapsed')).toBe('1');
  });
});

describe('Order-linked tickets', () => {
  const ORDER_CONTEXT = {
    status: 'OUT_FOR_DELIVERY',
    total: 2297,
    paymentStatus: 'PAID',
    items: [
      { productId: 11, title: 'Smart Plug', quantity: 2 },
      { productId: 12, title: 'LED Bulb', quantity: 1 },
    ],
  };
  const linkedOrder = () => screen.queryByRole('region', { name: 'Linked order' });

  it('shows "Order #…" in the list only for tickets linked to an order', async () => {
    api.listTickets.mockResolvedValue(page([{ ...TICKET, orderNumber: 'ORD-1001' }, { ...TICKET_2, orderNumber: null }]));
    renderAt();
    const list = await screen.findByRole('list', { name: 'Support tickets' });
    const [linked, plain] = within(list).getAllByRole('listitem');
    expect(within(linked).getByTestId('ticket-order')).toHaveTextContent('Order #ORD-1001');
    expect(within(plain).queryByTestId('ticket-order')).not.toBeInTheDocument();
    expect(plain).not.toHaveTextContent('Order #');
    expect(plain).toHaveTextContent('Where is my order?'); // still renders normally
  });

  it('renders the linked order summary: number, status, total, payment and items', async () => {
    await openDetail({ ...DETAIL, orderNumber: 'ORD-1001', order: ORDER_CONTEXT });
    const card = linkedOrder()!;
    expect(within(card).getByRole('link', { name: /Order #ORD-1001/ })).toBeInTheDocument();
    expect(card).toHaveTextContent('Out For Delivery');
    expect(card).toHaveTextContent('₹2,297.00');
    expect(card).toHaveTextContent('Paid');
    const items = within(within(card).getByRole('list', { name: 'Order items' })).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['Smart Plug×2', 'LED Bulb×1']);
  });

  it('renders no order section for tickets without an order (null or absent fields)', async () => {
    await openDetail({ ...DETAIL, orderNumber: null, order: null });
    expect(linkedOrder()).not.toBeInTheDocument();
  });

  it('renders no order section for legacy tickets that omit the fields entirely', async () => {
    const legacy = { ...DETAIL } as Partial<TicketDetail>;
    delete legacy.orderNumber;
    delete legacy.order;
    await openDetail(legacy as TicketDetail);
    expect(linkedOrder()).not.toBeInTheDocument();
  });

  it('for a deleted order keeps the number as plain text (no broken link) and says details are unavailable', async () => {
    await openDetail({ ...DETAIL, orderNumber: 'ORD-GONE', order: null });
    const card = linkedOrder()!;
    expect(within(card).getByTestId('order-number-text')).toHaveTextContent('Order #ORD-GONE');
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
    expect(card).toHaveTextContent('Order details are no longer available');
    expect(card).not.toHaveTextContent('₹'); // no misleading fallback values
  });

  it('opens the existing admin order detail page from the ticket, and Back returns to the ticket', async () => {
    const order: AdminOrderDetail = {
      id: 1,
      orderNumber: 'ORD-1001',
      orderStatus: 'OUT_FOR_DELIVERY',
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      totalAmount: 2297,
      itemCount: 2,
      createdAt: '2026-10-01T09:00:00',
      updatedAt: '2026-10-03T09:00:00',
      updatedBy: 'admin_l1',
      customer: { id: 7, name: 'Asha Rao', email: 'asha@example.com' },
      items: [],
      currentTracking: null,
      addressId: 5,
      subtotal: 2297,
      shippingFee: 0,
      notes: null,
      tracking: [],
    };
    orderApi.getOrder.mockResolvedValue(ok(order));
    orderApi.getTrackingStatuses.mockResolvedValue(ok([]));
    const { user } = await openDetail({ ...DETAIL, orderNumber: 'ORD-1001', order: ORDER_CONTEXT });

    await user.click(within(linkedOrder()!).getByRole('link', { name: /Order #ORD-1001/ }));
    expect(currentUrl()).toBe('/order-tracking/ORD-1001');
    expect(await screen.findByRole('region', { name: 'Order ORD-1001 details' })).toBeInTheDocument();
    expect(orderApi.getOrder).toHaveBeenCalledWith('ORD-1001'); // tracking comes from the order API, not the ticket

    await user.click(screen.getByRole('button', { name: 'Back to ticket' }));
    expect(currentUrl()).toBe('/support-tickets/TQ-Q-000007');
    expect(await within(ticketPage()).findByRole('list', { name: 'Conversation' })).toBeInTheDocument();
  });

  it('URL-encodes order numbers in the link', async () => {
    await openDetail({ ...DETAIL, orderNumber: 'ORD/2 #9', order: ORDER_CONTEXT });
    expect(within(linkedOrder()!).getByRole('link', { name: /Order #ORD\/2 #9/ })).toHaveAttribute('href', '/order-tracking/ORD%2F2%20%239');
  });

  it('shows the number without a link when the role cannot open order tracking', async () => {
    useAuthStore.setState({
      user: { userId: 9, username: 'viewer', email: 'v@tinqa.com', role: 'VIEWER', authClient: 'web', isFirstLogin: false, permissions: [] },
    });
    await openDetail({ ...DETAIL, orderNumber: 'ORD-1001', order: ORDER_CONTEXT });
    const card = linkedOrder()!;
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
    expect(within(card).getByTestId('order-number-text')).toHaveTextContent('Order #ORD-1001');
    expect(card).toHaveTextContent('₹2,297.00'); // summary still shown
  });
});

describe('Returns from the support chat', () => {
  const DELIVERED_ORDER = {
    status: 'DELIVERED',
    total: 1000,
    orderAmount: 500,
    shippingFee: 500,
    paymentStatus: 'PAID',
    items: [{ productId: 11, title: 'Smart Plug', quantity: 1 }],
    returnInfo: null,
  };
  const REQUESTED: OrderReturnInfo = {
    id: 3,
    state: 'REQUESTED',
    open: false,
    enabledReason: 'Rattles when shaken, please take it back',
    sourceTicketReference: 'TQ-Q-000007',
    staffNote: 'Box unopened',
    enabledBy: null,
    enabledAt: null,
    expiresAt: null,
    withdrawnBy: null,
    withdrawnAt: null,
    chargeAmount: 100,
    chargeReason: 'Pickup',
    settlement: null,
    customerReason: null,
    requestedAt: null,
    chargeStatus: 'NONE',
    chargePaidAt: null,
    trackingId: null,
    inspectionOutcome: null,
    inspectionNote: null,
    refundAmount: null,
    inspectedBy: null,
    inspectedAt: null,
    orderAmount: 500,
    shippingFee: 500,
    deductAllowed: true,
    staffRequestedBy: 'support2',
    staffRequestedAt: '2026-10-05T10:00:00',
    requestedChargeAmount: 100,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    chargeChangedBy: null,
    chargeChangedAt: null,
    chargeConsentedAt: null,
  };
  const signInWith = (permissions: Permission[]) =>
    useAuthStore.setState({
      user: { userId: 8, username: 'support1', email: 's@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
    });
  const returnPanel = () => screen.getByRole('region', { name: 'Return' });

  // The customer's own messages in the ticket: the latest (id 5) is preselected as their reason
  const WITH_REASON: TicketDetail = {
    ...DETAIL,
    orderNumber: 'ORD-1001',
    order: DELIVERED_ORDER,
    messages: [...MESSAGES, msg(5, 'CUSTOMER', 'Rattles when shaken, please take it back', '2026-10-05T11:00:00', 'Asha Rao')],
  };

  // Since 2026-11-11 staff no longer type the customer's reason: they pick one of the customer's messages, whose id is
  // sent (ticketReference + customerMessageId) instead of the old `reason` text.
  it('lets Customer Support request a return with one of the customer\'s own messages, uneditable, plus a charge and a note', async () => {
    signInWith(['SUPPORT_TICKET_VIEW', 'SUPPORT_TICKET_REPLY', 'REFUND_REQUEST']);
    orderApi.enableReturn.mockResolvedValue(ok(REQUESTED, 'Return requested. A Store Manager will review it.'));
    const { user } = await openDetail(WITH_REASON);
    const card = screen.getByRole('region', { name: 'Linked order' });
    expect(within(card).getByTestId('ticket-order-amount')).toHaveTextContent('₹500.00');
    expect(within(card).getByTestId('ticket-shipping')).toHaveTextContent('₹500.00');
    expect(card).toHaveTextContent('Total paid (incl. shipping)');

    await user.click(within(returnPanel()).getByRole('button', { name: 'Request return' }));
    const dialog = screen.getByRole('dialog', { name: 'Request return' });
    const words = within(dialog).getByRole('group', { name: /Customer's reason — their own words, sent to the Store Manager as written/ });
    const latest = within(words).getByRole('radio', { name: /Rattles when shaken, please take it back/ });
    const older = within(words).getByRole('radio', { name: /The LEDs flicker after 10 minutes\./ });
    expect(latest).toBeChecked();
    expect(older).not.toBeChecked();
    // Only the customer's messages are offered (not support replies), and their text can't be edited
    expect(within(words).getAllByRole('radio')).toHaveLength(2);
    expect(within(words).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox', { name: /Customer's reason/ })).not.toBeInTheDocument();

    // The charge and its reason are checked first
    const charge = within(dialog).getByLabelText('Return charge');
    await user.clear(charge);
    await user.type(charge, '600');
    expect(within(dialog).getByTestId('charge-hint')).toHaveTextContent('must pay it before the return starts');
    await user.click(within(dialog).getByRole('button', { name: 'Request return' }));
    expect(within(dialog).getByText('Say what the return charge is for.')).toBeInTheDocument();
    expect(orderApi.enableReturn).not.toHaveBeenCalled();
    await user.clear(charge);
    await user.type(charge, '0');

    await user.click(older);
    await user.click(latest);
    await user.type(within(dialog).getByLabelText('Staff note'), 'Box unopened');
    await user.click(within(dialog).getByRole('button', { name: 'Request return' }));
    await waitFor(() =>
      expect(orderApi.enableReturn).toHaveBeenCalledWith('ORD-1001', {
        ticketReference: 'TQ-Q-000007',
        customerMessageId: 5,
        chargeAmount: 0,
        chargeReason: null,
        staffNote: 'Box unopened',
      })
    );
    expect(await screen.findByText('Return requested. A Store Manager will review it.')).toBeInTheDocument();
    // The ticket (with its order's return) is reloaded
    await waitFor(() => expect(api.getTicket).toHaveBeenCalledTimes(2));
  });

  it('checks the staff note for courtesy and shows the server\'s OFFENSIVE_LANGUAGE error on it', async () => {
    signInWith(['SUPPORT_TICKET_VIEW', 'REFUND_REQUEST']);
    orderApi.enableReturn.mockRejectedValue(
      axiosError(400, { message: 'Offensive', errorCode: 'OFFENSIVE_LANGUAGE', errors: [{ field: 'staffNote', message: 'Please keep the note polite.' }] })
    );
    const { user } = await openDetail(WITH_REASON);
    await user.click(within(returnPanel()).getByRole('button', { name: 'Request return' }));
    const dialog = screen.getByRole('dialog', { name: 'Request return' });
    expect(within(dialog).getAllByText(DECENCY_HINT).length).toBeGreaterThan(0);
    const note = within(dialog).getByLabelText('Staff note');
    await user.type(note, 'Customer is an asshole');
    expect(within(dialog).getByText(DECENCY_ERROR)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Request return' }));
    expect(orderApi.enableReturn).not.toHaveBeenCalled();

    await user.clear(note);
    await user.type(note, 'Polite words the server still refuses');
    await user.click(within(dialog).getByRole('button', { name: 'Request return' }));
    expect(await within(dialog).findByText('Please keep the note polite.')).toBeInTheDocument();
  });

  it('can\'t request a return before the customer has written in the ticket', async () => {
    signInWith(['SUPPORT_TICKET_VIEW', 'REFUND_REQUEST']);
    const { user } = await openDetail({ ...WITH_REASON, messages: [msg(3, 'SUPPORT', 'How can we help?', '2026-10-05T10:00:00')] });
    await user.click(within(returnPanel()).getByRole('button', { name: 'Request return' }));
    const dialog = screen.getByRole('dialog', { name: 'Request return' });
    expect(dialog).toHaveTextContent("The customer hasn't written in this ticket yet.");
    expect(within(dialog).getByRole('button', { name: 'Request return' })).toBeDisabled();
  });

  it('gives a Store Manager no direct "Enable return": they request from the ticket like Customer Support', async () => {
    signInWith(['SUPPORT_TICKET_VIEW', 'REFUND_REQUEST', 'RETURN_ENABLE']);
    await openDetail(WITH_REASON);
    expect(within(returnPanel()).queryByRole('button', { name: /Enable return/ })).not.toBeInTheDocument();
    expect(within(returnPanel()).getByRole('button', { name: 'Request return' })).toBeInTheDocument();
  });

  it('lets a Store Manager approve a waiting request from the chat, showing the customer\'s own words and the staff note', async () => {
    signInWith(['SUPPORT_TICKET_VIEW', 'REFUND_REQUEST', 'RETURN_ENABLE']);
    orderApi.approveReturn.mockResolvedValue(ok({ ...REQUESTED, state: 'ENABLED' }));
    const { user } = await openDetail({ ...DETAIL, orderNumber: 'ORD-1001', order: { ...DELIVERED_ORDER, returnInfo: REQUESTED } });
    expect(returnPanel()).toHaveTextContent('Return requested by Customer Support');
    const words = within(returnPanel()).getByRole('group', { name: "Customer's reason" });
    expect(within(words).getByTestId('customer-words')).toHaveTextContent('Rattles when shaken, please take it back');
    expect(within(words).getByRole('link', { name: 'TQ-Q-000007' })).toHaveAttribute('href', '/support-tickets/TQ-Q-000007');
    expect(within(words).getByTestId('return-staff-note')).toHaveTextContent('Box unopened');
    await user.click(within(returnPanel()).getByRole('button', { name: 'Approve' }));
    const dialog = screen.getByRole('dialog', { name: 'Approve return' });
    expect(within(dialog).getByTestId('customer-words')).toHaveTextContent('Rattles when shaken, please take it back');
    expect(dialog).toHaveTextContent('support2');
    await user.click(within(dialog).getByRole('button', { name: 'Approve and enable' }));
    await waitFor(() => expect(orderApi.approveReturn).toHaveBeenCalledWith('ORD-1001', { chargeAmount: 100, chargeReason: 'Pickup' }));
  });

  it('never lets a Store Manager decide a request they raised themselves', async () => {
    signInWith(['SUPPORT_TICKET_VIEW', 'REFUND_REQUEST', 'RETURN_ENABLE']); // signed in as support1
    await openDetail({ ...DETAIL, orderNumber: 'ORD-1001', order: { ...DELIVERED_ORDER, returnInfo: { ...REQUESTED, staffRequestedBy: 'support1' } } });
    expect(returnPanel()).toHaveTextContent('You raised this request, so another Store Manager must decide it.');
    expect(within(returnPanel()).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(within(returnPanel()).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('explains a 409 RETURN_SELF_APPROVAL from the server', async () => {
    signInWith(['SUPPORT_TICKET_VIEW', 'REFUND_REQUEST', 'RETURN_ENABLE']);
    orderApi.approveReturn.mockRejectedValue(axiosError(409, { errorCode: 'RETURN_SELF_APPROVAL', message: 'x' }));
    const { user } = await openDetail({ ...DETAIL, orderNumber: 'ORD-1001', order: { ...DELIVERED_ORDER, returnInfo: REQUESTED } });
    await user.click(within(returnPanel()).getByRole('button', { name: 'Approve' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Approve return' })).getByRole('button', { name: 'Approve and enable' }));
    expect(await screen.findByText('You raised this request, so another Store Manager must decide it.')).toBeInTheDocument();
  });

  it('shows no return controls to staff who cannot request returns', async () => {
    signInWith(['SUPPORT_TICKET_VIEW', 'SUPPORT_TICKET_REPLY']);
    await openDetail({ ...DETAIL, orderNumber: 'ORD-1001', order: DELIVERED_ORDER });
    expect(screen.queryByRole('region', { name: 'Return' })).not.toBeInTheDocument();
  });
});
