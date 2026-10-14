import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { ApprovalsHub } from './ApprovalsHub';
import { useAuthStore } from '../../store/useAuthStore';
import { axiosClient } from '../../api/axiosClient';

vi.mock('../../api/axiosClient', () => ({ axiosClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../api/ecommerceAxiosClient', () => ({ ecommerceAxiosClient: { patch: vi.fn() } }));
const procurement = vi.mocked(axiosClient);
const ok = <T,>(data: T) => ({ data: { success: true, message: 'OK', data } });

const PENDING_EMPLOYEE = {
  id: 31,
  userId: 77,
  username: 'riya',
  employeeCode: 'EMP0031',
  firstName: 'Riya',
  lastName: 'Sharma',
  displayName: 'Riya Sharma',
  dateOfBirth: '1995-04-02',
  gender: 'FEMALE',
  designation: 'Administrator Level 1',
  department: 'OPERATIONS',
  employmentType: 'FULL_TIME',
  joiningDate: '2026-10-01',
  salaryAmount: 50000,
  salaryCurrency: 'INR',
  phone: '+91 9876543210',
  alternatePhone: '+91 9876543211',
  workEmail: 'riya@tinqa.com',
  status: 'APPROVAL_PENDING',
  createdBy: 4,
  createdByUsername: 'admin_l1',
  createdAt: '2026-10-12T10:00:00Z',
  updatedAt: '2026-10-12T10:00:00Z',
};

let pendingEmployees: (typeof PENDING_EMPLOYEE)[] = [];

const renderHub = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <GlobalAlertContainer />
      <ApprovalsHub />
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  pendingEmployees = [PENDING_EMPLOYEE];
  // Every other queue is empty; only the employee queue has work.
  procurement.get.mockImplementation(async (url: string) =>
    ok(url === '/v1/admin/employees/pending-approvals' ? pendingEmployees : [])
  );
  procurement.patch.mockImplementation(async () => {
    pendingEmployees = [];
    return ok({ ...PENDING_EMPLOYEE, status: 'FIRST_LOGIN' });
  });
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 9, username: 'admin_l2', email: 'l2@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false },
  });
});

describe('Approvals hub: new employees', () => {
  it('lists employees waiting for approval and approves them', async () => {
    const user = userEvent.setup();
    renderHub();

    expect(await screen.findByText('New Employee: Riya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Employee Approval')).toBeInTheDocument();
    expect(screen.getByText(/EMP0031 · Administrator Level 1 · by @admin_l1/)).toBeInTheDocument();

    await user.click(screen.getByTitle('Approve Request'));
    await user.click(screen.getByRole('button', { name: 'Yes, Approve' }));

    await waitFor(() =>
      expect(procurement.patch).toHaveBeenCalledWith('/v1/admin/employees/31/approval', {
        decision: 'APPROVED',
        reason: undefined,
      })
    );
    await waitFor(() => expect(screen.queryByText('New Employee: Riya Sharma')).not.toBeInTheDocument());
  });

  it('sends the rejection reason as `reason`', async () => {
    const user = userEvent.setup();
    renderHub();

    await screen.findByText('New Employee: Riya Sharma');
    await user.click(screen.getByTitle('Reject Request'));
    await user.type(screen.getByPlaceholderText(/reason for rejecting/i), '  Wrong designation  ');
    await user.click(screen.getByRole('button', { name: 'Proceed to Confirmation' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Reject' }));

    await waitFor(() =>
      expect(procurement.patch).toHaveBeenCalledWith('/v1/admin/employees/31/approval', {
        decision: 'REJECTED',
        reason: 'Wrong designation',
      })
    );
  });

  it('does not let an Admin L2 approve an employee they created', async () => {
    useAuthStore.setState({
      user: { userId: 4, username: 'admin_l2_b', email: 'l2b@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false },
    });
    const user = userEvent.setup();
    renderHub();

    await screen.findByText('New Employee: Riya Sharma');
    await user.click(screen.getByTitle('Approve Request'));
    await user.click(screen.getByRole('button', { name: 'Yes, Approve' }));

    expect(await screen.findByText(/another Admin L2 has to review them/)).toBeInTheDocument();
    expect(procurement.patch).not.toHaveBeenCalled();
  });
});
