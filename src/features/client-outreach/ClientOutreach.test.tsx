import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import type { ApiResponse } from '../../types/common.types';
import { createEndpointMatcher, PROCUREMENT_ENDPOINTS } from '../../config/endpointAccess';
import { outreachApi } from './api/outreachApi';
import { ClientOutreachPage } from './pages/ClientOutreachPage';
import { OutreachBusinessPage } from './pages/OutreachBusinessPage';
import type { OutreachBusiness, OutreachContact, OutreachPage, OutreachSummary } from './types/outreach.types';
import { checkProofFiles, fromLocalInput, validateContact, newContactForm } from './utils/outreach';

vi.mock('./api/outreachApi', () => ({
  outreachApi: {
    businesses: vi.fn(),
    business: vi.fn(),
    createBusiness: vi.fn(),
    updateBusiness: vi.fn(),
    contacts: vi.fn(),
    logContact: vi.fn(),
    updateContact: vi.fn(),
    uploadProof: vi.fn(),
    proofFile: vi.fn(),
    removeProof: vi.fn(),
    summary: vi.fn(),
    followUps: vi.fn(),
  },
}));

const api = vi.mocked(outreachApi);
const ok = <T,>(data: T, message = ''): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });
const pageOf = <T,>(content: T[]): OutreachPage<T> => ({ content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 20 });

const VIEWER: Permission[] = ['OUTREACH_VIEW'];
const LOGGER: Permission[] = ['OUTREACH_VIEW', 'OUTREACH_LOG'];

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: null,
    isAuthenticated: true,
    user: { userId: 9, username: 'exec', email: 'exec@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
  });

const SUMMARY: OutreachSummary = {
  totalContacts: 12, businessesContacted: 9, newBusinesses: 4, demoRequests: 2, followUpsDue: 3,
  byDay: [{ date: '2026-10-30', contacts: 5, businesses: 4 }],
  byExecutive: [{ userId: 9, name: 'Neha Sharma', contacts: 12, businesses: 9, interested: 3 }],
  byChannel: { CALL: 10, WHATSAPP: 2 },
  byInterest: { INTERESTED: 3 },
};

const BUSINESS: OutreachBusiness = {
  id: 7, name: 'Radisson Blu', businessType: 'HOTEL', city: 'Jaipur', address: null, googleMapsUrl: null, phone: '9876543210',
  email: 'gm@radisson.test', contactPerson: 'Mr Rao', notes: null, contactCount: 2, demoRequestCount: 1, lastContactAt: '2026-10-30T11:00:00+05:30',
  lastContactByName: 'Neha Sharma', latestInterest: 'INTERESTED', latestRating: 'GOOD', nextFollowUpAt: null, createdByName: 'Neha Sharma',
  createdAt: '2026-10-01T10:00:00+05:30',
};

const contact = (extra: Partial<OutreachContact>): OutreachContact => ({
  id: 70, businessId: 7, businessName: 'Radisson Blu', contactedAt: '2026-10-30T11:00:00+05:30', channel: 'CALL', contactPerson: 'Mr Rao',
  contactPhone: null, summary: 'Pitched the smart panels.', response: 'Send a quote.', rating: 'GOOD', interest: 'INTERESTED',
  nextAction: 'NONE', followUpAt: null, proofs: [], loggedById: 9, loggedByName: 'Neha Sharma', createdAt: '', updatedAt: null, editable: true,
  ...extra,
});

const renderAt = (path: string) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter initialEntries={[path]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/client-outreach" element={<ClientOutreachPage />} />
          <Route path="/client-outreach/businesses/:id" element={<OutreachBusinessPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const conflict = (data: unknown) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Conflict', 'ERR_BAD_REQUEST', config, null, { status: 409, statusText: 'Conflict', headers: {}, config, data });
};

beforeEach(() => {
  vi.clearAllMocks();
  api.summary.mockResolvedValue(ok(SUMMARY));
  api.businesses.mockResolvedValue(ok(pageOf([BUSINESS])));
  api.followUps.mockResolvedValue(ok(pageOf([contact({ id: 71, nextAction: 'CALL_BACK', followUpAt: '2026-10-31T10:00:00+05:30' })])));
  api.business.mockResolvedValue(ok(BUSINESS));
  api.contacts.mockResolvedValue(ok(pageOf([contact({}), contact({ id: 69, editable: false, loggedByName: 'Ravi Kumar', summary: 'First call.' })])));
});

describe('client outreach endpoints', () => {
  it('reads with OUTREACH_VIEW and writes with OUTREACH_LOG', () => {
    const match = createEndpointMatcher(PROCUREMENT_ENDPOINTS);
    expect(match('get', '/v1/outreach/businesses?search=rad')).toBe('OUTREACH_VIEW');
    expect(match('get', '/v1/outreach/businesses/7/contacts')).toBe('OUTREACH_VIEW');
    expect(match('post', '/v1/outreach/businesses')).toBe('OUTREACH_LOG');
    expect(match('post', '/v1/outreach/businesses/7/contacts')).toBe('OUTREACH_LOG');
    expect(match('put', '/v1/outreach/contacts/70')).toBe('OUTREACH_LOG');
    expect(match('post', '/v1/outreach/contacts/70/proofs')).toBe('OUTREACH_LOG');
    expect(match('get', '/v1/outreach/contacts/70/proofs/3')).toBe('OUTREACH_VIEW');
    expect(match('delete', '/v1/outreach/contacts/70/proofs/3')).toBe('OUTREACH_LOG');
    expect(match('get', '/v1/outreach/summary?from=2026-10-01&to=2026-10-31')).toBe('OUTREACH_VIEW');
    expect(match('get', '/v1/outreach/follow-ups?mine=true')).toBe('OUTREACH_VIEW');
  });
});

describe('Client Outreach page', () => {
  it('loads the summary and the businesses tab only; follow-ups load when their tab opens', async () => {
    signIn(VIEWER);
    const user = userEvent.setup();
    renderAt('/client-outreach');

    expect(await screen.findByRole('link', { name: 'Radisson Blu' })).toHaveAttribute('href', '/client-outreach/businesses/7');
    const summary = screen.getByRole('region', { name: 'Outreach summary' });
    expect(within(summary).getByText('Demo requests').nextSibling).toHaveTextContent('2');
    expect(within(summary).getByRole('table', { name: 'Contacts per executive' })).toHaveTextContent('Neha Sharma');
    expect(api.summary).toHaveBeenCalledTimes(1);
    expect(api.businesses).toHaveBeenCalledTimes(1);
    expect(api.followUps).not.toHaveBeenCalled();
    // A viewer cannot add businesses
    expect(screen.queryByRole('button', { name: /add business/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'My follow-ups' }));
    await screen.findByText(/Call back/);
    expect(api.followUps).toHaveBeenCalledWith(true, 0, 10);
  });

  it('filters businesses by type, interest and due follow-ups', async () => {
    signIn(VIEWER);
    const user = userEvent.setup();
    renderAt('/client-outreach');
    await screen.findByRole('link', { name: 'Radisson Blu' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'HOTEL');
    await user.click(screen.getByRole('checkbox', { name: 'Follow-up due' }));
    await waitFor(() =>
      expect(api.businesses).toHaveBeenLastCalledWith({ search: '', businessType: 'HOTEL', interest: '', followUpDue: true, page: 0, size: 20 })
    );
  });

  it('searches at once on Enter and answers a repeated search from memory', async () => {
    signIn(VIEWER);
    const user = userEvent.setup();
    renderAt('/client-outreach');
    await screen.findByRole('link', { name: 'Radisson Blu' });
    const box = screen.getByRole('searchbox', { name: 'Search businesses' });

    await user.type(box, 'radisson{Enter}');
    await waitFor(() => expect(api.businesses).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'radisson' })));
    await user.clear(box);
    await user.type(box, 'radisson{Enter}');
    await screen.findByRole('link', { name: 'Radisson Blu' });
    expect(api.businesses.mock.calls.filter(([params]) => params.search === 'radisson')).toHaveLength(1);
  });

  it('offers to open the business already on file when the phone or email is a duplicate', async () => {
    signIn(LOGGER);
    api.createBusiness.mockRejectedValue(conflict({ success: false, message: 'Already on file.', errorCode: 'BUSINESS_EXISTS', data: { existingId: 7 } }));
    const user = userEvent.setup();
    renderAt('/client-outreach');
    await screen.findByRole('link', { name: 'Radisson Blu' });

    await user.click(screen.getByRole('button', { name: /add business/i }));
    const dialog = screen.getByRole('dialog', { name: 'Add business' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Business name' }), 'Radisson Blu Jaipur');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Type' }), 'HOTEL');
    await user.type(within(dialog).getByRole('textbox', { name: 'Phone' }), '+91 98765 43210');
    await user.click(within(dialog).getByRole('button', { name: 'Add business' }));

    await user.click(await within(dialog).findByRole('button', { name: 'Open existing business' }));
    expect(await screen.findByRole('heading', { name: 'Radisson Blu' })).toBeInTheDocument();
    expect(api.business).toHaveBeenCalledWith(7);
  });
});

describe('business detail', () => {
  it('shows the contact history; only your own contacts can be edited', async () => {
    signIn(LOGGER);
    renderAt('/client-outreach/businesses/7');
    expect(await screen.findByRole('heading', { name: 'Radisson Blu' })).toBeInTheDocument();
    const history = await screen.findByRole('region', { name: 'Contact history' });
    expect(within(history).getByText('Pitched the smart panels.')).toBeInTheDocument();
    expect(within(history).getByText(/Ravi Kumar/)).toBeInTheDocument();
    expect(within(history).getAllByRole('button', { name: 'Edit contact' })).toHaveLength(1);
  });

  it('a viewer sees the history without any write action', async () => {
    signIn(VIEWER);
    renderAt('/client-outreach/businesses/7');
    await screen.findByText('Pitched the smart panels.');
    expect(screen.queryByRole('button', { name: /log contact/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit contact' })).not.toBeInTheDocument();
  });

  it('logs a contact, needs a follow-up date unless nothing is planned, then uploads the proofs', async () => {
    signIn(LOGGER);
    api.logContact.mockResolvedValue(ok(contact({ id: 80 })));
    api.uploadProof.mockResolvedValue(ok({ id: 1, fileName: 'call.png', contentType: 'image/png', size: 10 }));
    const user = userEvent.setup();
    renderAt('/client-outreach/businesses/7');
    await screen.findByText('Pitched the smart panels.');

    await user.click(screen.getByRole('button', { name: /log contact/i }));
    const dialog = screen.getByRole('dialog', { name: 'Log contact' });
    await user.type(within(dialog).getByRole('textbox', { name: 'What was discussed' }), 'Asked for a demo next week.');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'How it went' }), 'GOOD');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Interest' }), 'INTERESTED');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Next action' }), 'DEMO_REQUESTED');
    await user.upload(within(dialog).getByLabelText('Add proof'), new File(['x'], 'call.png', { type: 'image/png' }));
    await user.click(within(dialog).getByRole('button', { name: 'Log contact' }));
    expect(within(dialog).getByText('Pick the follow-up date and time.')).toBeInTheDocument();
    expect(api.logContact).not.toHaveBeenCalled();

    const followUp = within(dialog).getByLabelText('Follow up on');
    await user.type(followUp, '2099-11-12T15:30');
    await user.click(within(dialog).getByRole('button', { name: 'Log contact' }));

    await waitFor(() => expect(api.logContact).toHaveBeenCalledTimes(1));
    const [businessId, payload] = api.logContact.mock.calls[0];
    expect(businessId).toBe(7);
    expect(payload).toMatchObject({ channel: 'CALL', summary: 'Asked for a demo next week.', rating: 'GOOD', interest: 'INTERESTED', nextAction: 'DEMO_REQUESTED' });
    expect(payload.followUpAt).toMatch(/^2099-11-12T15:30:00[+-]\d{2}:\d{2}$/);
    expect(payload.contactedAt).toMatch(/[+-]\d{2}:\d{2}$/);
    await waitFor(() => expect(api.uploadProof).toHaveBeenCalledWith(80, expect.any(File)));
    // The business and its history load again
    await waitFor(() => expect(api.business).toHaveBeenCalledTimes(2));
    expect(api.contacts).toHaveBeenCalledTimes(2);
  });

  it('edits your own contact with PUT', async () => {
    signIn(LOGGER);
    api.updateContact.mockResolvedValue(ok(contact({ summary: 'Pitched the smart panels again.' })));
    const user = userEvent.setup();
    renderAt('/client-outreach/businesses/7');
    await user.click(await screen.findByRole('button', { name: 'Edit contact' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit contact' });
    await user.type(within(dialog).getByRole('textbox', { name: 'What was discussed' }), ' again');
    await user.click(within(dialog).getByRole('button', { name: 'Save contact' }));
    await waitFor(() => expect(api.updateContact).toHaveBeenCalledWith(70, expect.objectContaining({ summary: 'Pitched the smart panels. again', nextAction: 'NONE', followUpAt: null })));
    expect(api.uploadProof).not.toHaveBeenCalled();
  });
});

describe('outreach rules', () => {
  it('accepts only images and PDFs up to 5 MB, five per contact', () => {
    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    const { accepted, problems } = checkProofFiles(
      [new File(['x'], 'a.png', { type: 'image/png' }), new File(['x'], 'b.docx', { type: 'application/msword' }), big, new File(['x'], 'c.pdf', { type: 'application/pdf' })],
      4
    );
    expect(accepted.map((f) => f.name)).toEqual(['a.png']);
    expect(problems).toEqual([
      'b.docx: only PNG, JPEG, WebP images or PDFs.',
      'big.pdf: larger than 5 MB.',
      'c.pdf: at most 5 proofs per contact.',
    ]);
  });

  it('sends times with the browser offset and needs a later follow-up', () => {
    expect(fromLocalInput('2026-11-04T15:30')).toMatch(/^2026-11-04T15:30:00[+-]\d{2}:\d{2}$/);
    const form = { ...newContactForm(new Date(2026, 10, 4, 15, 30)), summary: 'Call', rating: 'GOOD' as const, interest: 'MAYBE' as const };
    expect(validateContact(form)).toEqual({});
    expect(validateContact({ ...form, nextAction: 'CALL_BACK', followUpAt: '2026-11-04T10:00' }).followUpAt).toBe('The follow-up must come after the contact.');
  });
});
