import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../ui/GlobalAlertContainer';
import { authService } from '../../api/services/authService';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { SetPasswordPage } from './SetPasswordPage';
import { LoginPage } from './LoginPage';

vi.mock('../../api/services/authService', () => ({
  authService: { forgotPassword: vi.fn(), checkPasswordLink: vi.fn(), setPasswordFromLink: vi.fn(), login: vi.fn() },
}));
// The sign-in pages show the default company branding, without asking the storefront backend
vi.mock('./loginPageContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./loginPageContent')>();
  return { ...actual, loadAdminLoginContent: vi.fn(async () => actual.DEFAULT_ADMIN_LOGIN) };
});
const api = vi.mocked(authService);

const ok = <T,>(data: T, message = '') => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });
const STRONG = 'Tinqa@2026ok';

const renderAt = (path: string) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
        </Routes>
      </Provider>
    </MemoryRouter>
  );
  return userEvent.setup();
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Forgot password', () => {
  it('is offered on the sign-in page and emails a link for a username or email', async () => {
    api.forgotPassword.mockResolvedValue(ok(undefined, "If an account matches, we've emailed it a link to choose a new password."));
    const user = renderAt('/login');

    await user.click(screen.getByRole('link', { name: 'Forgot password?' }));
    await user.type(screen.getByLabelText('Username or email'), ' priya ');
    await user.click(screen.getByRole('button', { name: /Email me a link/ }));

    expect(api.forgotPassword).toHaveBeenCalledWith({ identifier: 'priya' });
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByText(/works once, for 15 minutes/)).toBeInTheDocument();
  });
});

describe('Set password from an emailed link', () => {
  it('welcomes a new employee and saves the password without asking for an old one', async () => {
    api.checkPasswordLink.mockResolvedValue(ok({ purpose: 'SETUP' as const, username: 'priya', expiresAt: '' }));
    api.setPasswordFromLink.mockResolvedValue(ok(undefined, 'Your password is saved. Sign in with your new password.'));
    const user = renderAt('/set-password#token=abc123');

    expect(await screen.findByRole('heading', { name: 'Welcome, priya' })).toBeInTheDocument();
    expect(api.checkPasswordLink).toHaveBeenCalledWith('abc123');
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('New password'), STRONG);
    await user.type(screen.getByLabelText('Confirm new password'), STRONG);
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    expect(api.setPasswordFromLink).toHaveBeenCalledWith({ token: 'abc123', newPassword: STRONG, confirmNewPassword: STRONG });
    expect(await screen.findByText('Staff & Dealer Sign-in')).toBeInTheDocument();
    expect(screen.getByText('Your password is saved. Sign in with your new password.')).toBeInTheDocument();
  });

  it('explains an expired link and offers a new one', async () => {
    api.checkPasswordLink.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { success: false, errorCode: 'PASSWORD_LINK_EXPIRED', message: 'This link has expired.' } },
    });
    renderAt('/set-password?token=old');

    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get a new link' })).toHaveAttribute('href', '/forgot-password');
    expect(api.setPasswordFromLink).not.toHaveBeenCalled();
  });

  it('refuses a page opened without a token', async () => {
    renderAt('/set-password');
    expect(await screen.findByText('This link is incomplete. Open it again from your email.')).toBeInTheDocument();
    expect(api.checkPasswordLink).not.toHaveBeenCalled();
  });
});
