import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import alertReducer from '../../../store/alertSlice';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Permission } from '../../../config/access';
import { OrderManagementPage } from './OrderManagementPage';
import { orderApi } from '../api/orderApi';
import { dealerApi } from '../../dealer-management/api/dealerApi';
import { itemApi } from '../../item-management/api/itemApi';
import { superAdminPermissions } from '../../../test/access';

vi.mock('../api/orderApi', () => ({
  orderApi: { getAllOrders: vi.fn(), getOrdersByDealerId: vi.fn(), getOrdersByStatus: vi.fn() },
}));
vi.mock('../../dealer-management/api/dealerApi', () => ({ dealerApi: { getAllDealers: vi.fn() } }));
vi.mock('../../item-management/api/itemApi', () => ({ itemApi: { getItems: vi.fn() } }));

const ok = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, data, timestamp: '', path: '' });
const pageOf = <T,>(content: T[]) => ({ content, totalElements: content.length, totalPages: 1, number: 0, size: 1000 });

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: { userId: 3, username: 'user', email: 'user@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderPage = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <MemoryRouter>
        <OrderManagementPage />
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.mocked(orderApi.getAllOrders).mockResolvedValue(ok([]) as never);
  vi.mocked(dealerApi.getAllDealers).mockResolvedValue(ok(pageOf([{ id: 1, name: 'Acme Dealer' }])) as never);
  vi.mocked(itemApi.getItems).mockResolvedValue(ok(pageOf([])) as never);
});

describe('OrderManagementPage access', () => {
  it('a financial auditor sees orders without asking for dealers or items they may not see', async () => {
    // Financial Auditor: PROCUREMENT_ORDER_READ among others, but no dealer or catalog groups
    signIn(['PROCUREMENT_ORDER_VIEW', 'PAYMENT_VIEW', 'REFUND_VIEW', 'CUSTOMER_ORDER_VIEW', 'DOCUMENT_VIEW', 'FINANCE_REPORT_VIEW']);
    renderPage();

    await waitFor(() => expect(orderApi.getAllOrders).toHaveBeenCalled());
    expect(dealerApi.getAllDealers).not.toHaveBeenCalled();
    expect(itemApi.getItems).not.toHaveBeenCalled();
    expect(screen.queryByRole('option', { name: 'All Dealers' })).not.toBeInTheDocument();
  });

  it('someone who manages dealers and orders gets the dealer filter and the pickers', async () => {
    signIn(superAdminPermissions('ADMIN_L1'));
    renderPage();

    expect(await screen.findByRole('option', { name: 'Acme Dealer' })).toBeInTheDocument();
    expect(itemApi.getItems).toHaveBeenCalled();
  });
});
