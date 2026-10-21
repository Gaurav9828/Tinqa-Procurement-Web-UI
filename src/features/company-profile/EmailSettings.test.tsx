import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import { EmailSettingsCard } from './components/EmailSettingsCard';
import { emailSettingsApi } from './api/emailSettingsApi';
import type { EmailSettings } from './types/emailSettings.types';

vi.mock('./api/emailSettingsApi', () => ({ emailSettingsApi: { get: vi.fn(), update: vi.fn(), sendTest: vi.fn() } }));
const api = vi.mocked(emailSettingsApi);

const ok = <T,>(data: T, message = 'OK') => ({ success: true, message, errorCode: null, timestamp: '', path: '', data });

const SAVED: EmailSettings = {
  enabled: false, smtpHost: 'smtp.gmail.com', smtpPort: 587, security: 'STARTTLS', username: 'orders@tinqa.com', passwordSet: true,
  fromAddress: 'orders@tinqa.com', fromName: 'TinQa', replyTo: null, ready: false, updatedBy: 'owner', updatedAt: '2026-10-21T09:00:00',
  pendingEmails: 2, failedEmails: 0,
};

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: 't', isAuthenticated: true,
    user: { userId: 1, username: 'owner', email: 'owner@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderCard = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <GlobalAlertContainer />
      <EmailSettingsCard />
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(ok(SAVED));
});

describe('Company profile › Email', () => {
  it('is hidden from, and never loads for, anyone without SYSTEM_SETTINGS_MANAGE', () => {
    signIn(['COMPANY_PROFILE_VIEW', 'COMPANY_PROFILE_EDIT']);
    renderCard();
    expect(screen.queryByRole('region', { name: 'Email' })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('keeps the saved password unless a new one is typed, and switches sending on', async () => {
    signIn(['SYSTEM_SETTINGS_MANAGE']);
    api.update.mockResolvedValue(ok({ ...SAVED, enabled: true, ready: true, updatedAt: '2026-10-21T10:00:00' }, 'Email settings saved'));
    const user = userEvent.setup();
    renderCard();

    expect(await screen.findByTestId('email-status')).toHaveTextContent('Not sending');
    expect(screen.getByRole('note')).toHaveTextContent('2 emails waiting to be sent');
    expect(screen.getByLabelText('Password or app password')).toHaveAttribute('placeholder', 'Saved — leave blank to keep it');

    await user.click(screen.getByRole('checkbox', { name: /Send customer emails/ }));
    await user.click(screen.getByRole('button', { name: 'Save email settings' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, password: '', clearPassword: false, smtpHost: 'smtp.gmail.com' })));
    expect(await screen.findByTestId('email-status')).toHaveTextContent('Sending');
  });

  it('needs a server, port and sender to switch on, and sends a test to a valid address', async () => {
    signIn(['SYSTEM_SETTINGS_MANAGE']);
    api.get.mockResolvedValue(ok({ ...SAVED, smtpHost: null, smtpPort: null, fromAddress: null, passwordSet: false, pendingEmails: 0 }));
    api.sendTest.mockResolvedValue(ok(undefined, 'Test email sent'));
    const user = userEvent.setup();
    renderCard();

    const form = await screen.findByRole('form', { name: 'Email settings' });
    await user.click(within(form).getByRole('checkbox', { name: /Send customer emails/ }));
    await user.click(within(form).getByRole('button', { name: 'Save email settings' }));
    expect(within(form).getAllByText('Needed to send email.')).toHaveLength(3);
    expect(api.update).not.toHaveBeenCalled();

    const send = within(form).getByRole('button', { name: 'Send test' });
    expect(send).toBeDisabled();
    await user.type(within(form).getByLabelText('Send a test to'), 'me@tinqa.com');
    await user.click(send);
    await waitFor(() => expect(api.sendTest).toHaveBeenCalledWith('me@tinqa.com'));
  });
});
