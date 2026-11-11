import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios, { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../ui/GlobalAlertContainer';
import { authService } from '../../api/services/authService';
import { LoginPage } from './LoginPage';
import { resetAdminLoginContent } from './loginPageContent';

// The sign-in card reads the company profile for its picture and text; the defaults are enough here
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});

vi.mock('../../api/services/authService', () => ({
  authService: { login: vi.fn(), logout: vi.fn() },
}));
const api = vi.mocked(authService);

const LOCKED = 'Too many failed sign-in attempts. Try again in 15 minutes, or reset your password.';

const renderLogin = () => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Provider store={store}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Dashboard</p>} />
        </Routes>
      </Provider>
    </MemoryRouter>
  );
  return userEvent.setup();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axios.get).mockResolvedValue({ data: { success: true, data: null } });
  resetAdminLoginContent();
});

describe('Sign-in lockout', () => {
  it('tells the user the account is locked for a while after too many wrong passwords', async () => {
    // What the backend answers once a username has had five wrong passwords in 15 minutes
    const response = {
      status: 429,
      statusText: '429',
      data: { success: false, message: LOCKED, errorCode: 'TOO_MANY_LOGIN_ATTEMPTS', errors: [] },
      headers: {},
      config: { headers: new AxiosHeaders() },
    } as AxiosResponse;
    const error = new AxiosError(LOCKED, '429', response.config, {}, response);
    api.login.mockRejectedValue(error);

    const user = renderLogin();
    await user.type(screen.getByLabelText('Username'), 'asha');
    await user.type(screen.getByLabelText('Password'), 'Right!Passw0rd#1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(LOCKED)).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
