import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type { TicketDetail, TicketMessage, TicketSummary } from '../types/supportTicket.types';

// Only the network layer is mocked.
vi.mock('../api/supportTicketsApi', () => ({
  supportTicketsApi: { listTickets: vi.fn(), getTicket: vi.fn(), reply: vi.fn(), updateStatus: vi.fn() },
}));
const api = vi.mocked(supportTicketsApi);

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
};

const CLOSED: TicketDetail = {
  ...DETAIL,
  status: 'CLOSED',
  closedAt: '2026-10-06T08:00:00',
  canReply: false,
  canClose: false,
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
    user: { userId: 7, username: 'admin1', email: 'a@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false },
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
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(screen.getByText('Write a reply before sending.')).toBeInTheDocument();
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
    expect(await screen.findByRole('button', { name: 'Send reply' })).toBeEnabled();
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

  it('asks for confirmation before closing; dismissing sends nothing; confirming makes the ticket read-only', async () => {
    api.updateStatus.mockResolvedValue(ok(CLOSED, 'Support ticket status updated.'));
    const { user } = await openDetail();

    await user.click(screen.getByRole('button', { name: /Close ticket/ }));
    expect(screen.getByText('Close this ticket?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.updateStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Close ticket/ }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(api.updateStatus).toHaveBeenCalledWith('TQ-Q-000007', 'CLOSED');

    expect(await screen.findByRole('status', { name: 'Replies disabled' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Status locked' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Change ticket status' })).not.toBeInTheDocument();
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

  it('after the customer says thanks, offers "Thank & close" which sends the reply and then closes, after confirmation', async () => {
    api.reply.mockResolvedValue(ok(customerSays('Thanks, it works now!'), 'Support reply was added.'));
    api.updateStatus.mockResolvedValue(ok(CLOSED, 'Support ticket status updated.'));
    const { user } = await openDetail(customerSays('Thanks a lot, it works now!'));

    expect(within(suggestions()).getByTestId('assistant-summary')).toHaveTextContent('The customer says the issue is resolved.');
    await user.click(within(suggestions()).getByRole('button', { name: 'Send & close: Thank & close' }));

    expect(screen.getByText('Send this reply and close the ticket?')).toBeInTheDocument();
    expect(api.reply).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(api.updateStatus).toHaveBeenCalledWith('TQ-Q-000007', 'CLOSED'));
    expect(api.reply).toHaveBeenCalledWith('TQ-Q-000007', expect.stringContaining("You're welcome, Asha!"));
    expect(api.reply.mock.invocationCallOrder[0]).toBeLessThan(api.updateStatus.mock.invocationCallOrder[0]);
    expect(await screen.findByRole('status', { name: 'Replies disabled' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Reply suggestions' })).not.toBeInTheDocument();
  });

  it('does not close the ticket if the reply fails', async () => {
    api.reply.mockRejectedValue(axiosError(500));
    const { user } = await openDetail(customerSays('Thank you, all good now'));
    await user.click(within(suggestions()).getByRole('button', { name: 'Send & close: Thank & close' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api.reply).toHaveBeenCalled());
    expect(api.updateStatus).not.toHaveBeenCalled();
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

  it('the suggested "Close ticket" step asks for confirmation and only changes status', async () => {
    api.updateStatus.mockResolvedValue(ok(CLOSED, 'Support ticket status updated.'));
    const { user } = await openDetail(customerSays('Problem solved, you can close the ticket'));
    const next = within(suggestions()).getByRole('group', { name: 'Suggested next step' });
    await user.click(within(next).getByRole('button', { name: 'Close ticket' }));
    expect(screen.getAllByText('Close this ticket?').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(api.updateStatus).toHaveBeenCalledWith('TQ-Q-000007', 'CLOSED'));
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
