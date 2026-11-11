import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import companyProfileReducer from '../../store/companyProfileSlice';
import { useAuthStore } from '../../store/useAuthStore';
import type { Permission } from '../../config/access';
import { warrantyClaimsApi } from './api/warrantyClaimsApi';
import { WarrantyClaimDetailPage } from './pages/WarrantyClaimDetailPage';
import { WarrantyClaimsPage } from './pages/WarrantyClaimsPage';
import type { WarrantyClaim } from './types/warrantyClaim.types';

vi.mock('./api/warrantyClaimsApi', () => ({
  warrantyClaimsApi: { list: vi.fn(), detail: vi.fn(), review: vi.fn(), decide: vi.fn(), resolve: vi.fn() },
}));
const api = vi.mocked(warrantyClaimsApi);

const ok = <T,>(data: T, message = 'OK') => ({ success: true, message, errorCode: null, timestamp: '', path: '', data });

const CLAIM: WarrantyClaim = {
  referenceNumber: 'TQ-W-000007',
  status: 'SUBMITTED',
  resolution: null,
  serial: 'TQ-SX-0001',
  productTitle: 'SummitX',
  orderNumber: 'ORD-1001',
  customerName: 'Asha Verma',
  customerEmail: 'asha@example.com',
  createdAt: '2026-11-10T10:00:00',
  description: 'The weather display stopped updating after two weeks.',
  warrantyTitle: '1 year manufacturer warranty',
  coverageStartsOn: '2026-11-01',
  coverageEndsOn: '2027-10-31',
  coverageStatus: 'ACTIVE',
  diagnosis: null,
  reviewedBy: null,
  reviewedAt: null,
  decisionNote: null,
  decidedBy: null,
  decidedAt: null,
  resolutionNote: null,
  resolvedBy: null,
  resolvedAt: null,
};

const signIn = (permissions: Permission[], username = 'care1') =>
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username, email: `${username}@tinqa.com`, role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderAt = (url: string) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer, companyProfile: companyProfileReducer } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/warranty-claims" element={<WarrantyClaimsPage />} />
          <Route path="/warranty-claims/:referenceNumber" element={<WarrantyClaimDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Warranty claims', () => {
  it('lists new claims first and filters by status', async () => {
    signIn(['WARRANTY_CLAIM_VIEW']);
    api.list.mockResolvedValue(ok({ content: [CLAIM], number: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true, empty: false }) as never);
    renderAt('/warranty-claims');

    expect(await screen.findByRole('link', { name: 'TQ-W-000007' })).toHaveAttribute('href', '/warranty-claims/TQ-W-000007');
    expect(api.list).toHaveBeenCalledWith('SUBMITTED', 0, 20);
    await userEvent.click(screen.getByRole('button', { name: 'Waiting for decision' }));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith('IN_REVIEW', 0, 20));
  });

  it('loads nothing without the permission', () => {
    signIn([]);
    renderAt('/warranty-claims');
    expect(api.list).not.toHaveBeenCalled();
  });

  it('customer care sends a new claim for a decision with the diagnosis', async () => {
    signIn(['WARRANTY_CLAIM_VIEW', 'WARRANTY_CLAIM_UPDATE']);
    api.detail.mockResolvedValue(ok(CLAIM) as never);
    api.review.mockResolvedValue(ok({ ...CLAIM, status: 'IN_REVIEW', diagnosis: 'Sensor board loose', reviewedBy: 'care1' }) as never);
    renderAt('/warranty-claims/TQ-W-000007');

    expect(await screen.findByText(CLAIM.description)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Send for decision/ }));
    expect(api.review).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Diagnosis'), 'Sensor board loose');
    await userEvent.click(screen.getByRole('button', { name: /Send for decision/ }));
    await waitFor(() => expect(api.review).toHaveBeenCalledWith('TQ-W-000007', 'Sensor board loose'));
    expect(api.detail).toHaveBeenCalledTimes(2);
  });

  it('an approver rejects with the reason the customer sees, but never decides a claim they reviewed', async () => {
    signIn(['WARRANTY_CLAIM_VIEW', 'WARRANTY_CLAIM_DECIDE'], 'manager1');
    const waiting = { ...CLAIM, status: 'IN_REVIEW' as const, diagnosis: 'Water damage', reviewedBy: 'care1', reviewedAt: '2026-11-10T12:00:00' };
    api.detail.mockResolvedValue(ok(waiting) as never);
    api.decide.mockResolvedValue(ok({ ...waiting, status: 'REJECTED' }) as never);
    const view = renderAt('/warranty-claims/TQ-W-000007');

    await userEvent.click(await screen.findByRole('radio', { name: 'Reject' }));
    await userEvent.click(screen.getByRole('button', { name: /Reject claim/ }));
    expect(api.decide).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Decision note'), 'Water damage is not covered.');
    await userEvent.click(screen.getByRole('button', { name: /Reject claim/ }));
    await waitFor(() =>
      expect(api.decide).toHaveBeenCalledWith('TQ-W-000007', { approve: false, resolution: null, note: 'Water damage is not covered.' })
    );

    view.unmount();
    signIn(['WARRANTY_CLAIM_VIEW', 'WARRANTY_CLAIM_DECIDE'], 'care1');
    renderAt('/warranty-claims/TQ-W-000007');
    expect(await screen.findByText(/someone else must approve or reject it/)).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Reject' })).toBeNull();
  });
});
