import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../api/services/authService';
import { RequireAuth } from '../../auth/RouteGuards';
import { saveSession } from '../../auth/session';
import { ResetPasswordPage } from './ResetPasswordPage';

vi.mock('../../api/services/authService', () => ({
  authService: { setFirstLoginPassword: vi.fn(), changePassword: vi.fn(), logout: vi.fn() },
}));
const api = vi.mocked(authService);

const STRONG = 'Tinqa@2026ok';

const signInFirstTime = () => {
  const user = { userId: 1, username: 'newadmin', email: 'n@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: true };
  saveSession('token', Date.now() + 60_000, user);
  useAuthStore.setState({ token: 'token', user, isAuthenticated: true });
};

const renderAt = (path: string) => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Provider store={store}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route element={<RequireAuth allowFirstLogin />}>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/analytics" element={<p>Dashboard</p>} />
            <Route path="/" element={<p>Dashboard</p>} />
          </Route>
        </Routes>
      </Provider>
    </MemoryRouter>
  );
  return userEvent.setup();
};

beforeEach(() => {
  vi.clearAllMocks();
  signInFirstTime();
});

describe('First-login password', () => {
  it('keeps a first-time user on the password page', async () => {
    renderAt('/analytics');
    expect(await screen.findByRole('heading', { name: 'Set your new password' })).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('asks only for the new password and its confirmation', () => {
    renderAt('/reset-password');
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
    expect(screen.queryByLabelText(/current/i)).not.toBeInTheDocument();
  });

  it('ticks the rules as they are met and only enables submit for a strong, matching password', async () => {
    const user = renderAt('/reset-password');
    const submit = screen.getByRole('button', { name: 'Set password & continue' });
    const rules = within(screen.getByRole('list', { name: 'Password requirements' }));
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('New password'), 'tinqa2026');
    expect(rules.getByText(/12–128 characters/).closest('li')).toHaveAttribute('data-met', 'false');
    expect(rules.getByText(/lowercase/).closest('li')).toHaveAttribute('data-met', 'true');
    expect(rules.getByText(/uppercase/).closest('li')).toHaveAttribute('data-met', 'false');

    await user.clear(screen.getByLabelText('New password'));
    await user.type(screen.getByLabelText('New password'), STRONG);
    expect(rules.getAllByRole('listitem').every((li) => li.getAttribute('data-met') === 'true')).toBe(true);

    await user.type(screen.getByLabelText('Confirm new password'), 'Tinqa@2026');
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Confirm new password'), 'ok');
    expect(screen.queryByText("Passwords don't match.")).not.toBeInTheDocument();
    expect(submit).toBeEnabled();
  });

  it('sets the password and opens the dashboard', async () => {
    api.setFirstLoginPassword.mockResolvedValue({ success: true, message: 'Password updated.' });
    const user = renderAt('/reset-password');
    await user.type(screen.getByLabelText('New password'), STRONG);
    await user.type(screen.getByLabelText('Confirm new password'), STRONG);
    await user.click(screen.getByRole('button', { name: 'Set password & continue' }));

    expect(api.setFirstLoginPassword).toHaveBeenCalledWith({ newPassword: STRONG, confirmNewPassword: STRONG });
    expect(api.changePassword).not.toHaveBeenCalled();
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.isFirstLogin).toBe(false);
  });

  it('sends the user to sign in again when the backend asks for it', async () => {
    api.setFirstLoginPassword.mockResolvedValue({ success: true, message: 'Password set. Sign in with your new password.', requiresLogin: true });
    const user = renderAt('/reset-password');
    await user.type(screen.getByLabelText('New password'), STRONG);
    await user.type(screen.getByLabelText('Confirm new password'), STRONG);
    await user.click(screen.getByRole('button', { name: 'Set password & continue' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('shows the backend error and stays on the page', async () => {
    const response = {
      status: 400,
      statusText: '400',
      data: { success: false, message: 'New password must be different from your temporary password.', errorCode: 'PASSWORD_REUSED', errors: [] },
      headers: {},
      config: { headers: new AxiosHeaders() },
    } as AxiosResponse;
    api.setFirstLoginPassword.mockRejectedValue(new AxiosError('400', '400', response.config, {}, response));
    const user = renderAt('/reset-password');
    await user.type(screen.getByLabelText('New password'), STRONG);
    await user.type(screen.getByLabelText('Confirm new password'), STRONG);
    await user.click(screen.getByRole('button', { name: 'Set password & continue' }));

    expect(await screen.findByText('New password must be different from your temporary password.')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.isFirstLogin).toBe(true);
  });

  it('can sign out instead', async () => {
    api.logout.mockResolvedValue();
    const user = renderAt('/reset-password');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(api.logout).toHaveBeenCalled();
  });
});
