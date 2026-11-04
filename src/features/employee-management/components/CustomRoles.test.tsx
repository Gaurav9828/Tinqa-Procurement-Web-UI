import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, AxiosHeaders } from 'axios';
import alertReducer from '../../../store/alertSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../../store/useAuthStore';
import { accessService } from '../../../api/services/accessService';
import { createEndpointMatcher, PROCUREMENT_ENDPOINTS } from '../../../config/endpointAccess';
import type { AccessCatalog, Permission } from '../../../config/access';
import type { ApiResponse } from '../../../types/common.types';
import { signInAsSuperAdmin } from '../../../test/access';
import { rolesApi } from '../api/rolesApi';
import type { RoleSummary } from '../types/role.types';
import { AccessCatalogModal } from './AccessCatalogModal';
import { EmployeeAccessFields } from './EmployeeAccessFields';
import { validateDesignation } from '../utils/employeeRole';
import { roleCodeFromLabel, validateRoleForm } from '../utils/customRoles';

vi.mock('../api/rolesApi', () => ({
  rolesApi: { list: vi.fn(), grantableGroups: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const api = vi.mocked(rolesApi);
const ok = <T,>(data: T, message = ''): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });

const CATALOG: AccessCatalog = {
  designations: [
    { code: 'STORE_MANAGER', label: 'Store Manager', department: 'Store', description: 'Runs the store.', groups: ['CATALOG_READ'], custom: false, active: true },
    {
      code: 'MARKETING_EXECUTIVE', label: 'Marketing Executive', department: 'Marketing', description: 'Calls hotels.',
      groups: ['CLIENT_OUTREACH_READ', 'CLIENT_OUTREACH_MANAGEMENT'], custom: true, active: true, id: 5,
    },
  ],
  groups: [
    { code: 'CATALOG_READ', label: 'Catalog - view', approvalLevel: false },
    { code: 'CLIENT_OUTREACH_READ', label: 'Client outreach - view', approvalLevel: false },
    { code: 'CLIENT_OUTREACH_MANAGEMENT', label: 'Client outreach - log contacts', approvalLevel: false },
    { code: 'DEMO_APPROVAL', label: 'Client demos - approve', approvalLevel: true },
  ],
  permissions: [{ code: 'OUTREACH_VIEW', label: 'View the outreach log', group: 'CLIENT_OUTREACH_READ' }],
};

const role = (extra: Partial<RoleSummary>): RoleSummary => ({
  id: null, code: 'STORE_MANAGER', label: 'Store Manager', department: 'Store', description: 'Runs the store.', groups: ['CATALOG_READ'],
  custom: false, active: true, employeeCount: 3, createdByName: null, updatedAt: null, ...extra,
});

const ROLES: RoleSummary[] = [
  role({}),
  role({
    id: 5, code: 'MARKETING_EXECUTIVE', label: 'Marketing Executive', department: 'Marketing', description: 'Calls hotels.',
    groups: ['CLIENT_OUTREACH_READ', 'CLIENT_OUTREACH_MANAGEMENT'], custom: true, employeeCount: 2, createdByName: 'Asha',
  }),
  role({ id: 6, code: 'EVENT_HOST', label: 'Event Host', department: 'Marketing', description: '', groups: ['CLIENT_OUTREACH_READ'], custom: true, employeeCount: 0 }),
];

const signIn = (permissions: Permission[]) =>
  useAuthStore.setState({
    token: null,
    isAuthenticated: true,
    user: { userId: 1, username: 'admin', email: 'admin@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

const renderModal = () =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <GlobalAlertContainer />
      <AccessCatalogModal isOpen onClose={() => {}} />
    </Provider>
  );

const conflict = (errorCode: string) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Conflict', 'ERR_BAD_REQUEST', config, null, {
    status: 409, statusText: 'Conflict', headers: {}, config, data: { success: false, message: 'Employees hold this role.', errorCode },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  accessService.resetCatalogCache();
  vi.spyOn(accessService, 'getCatalog').mockResolvedValue(CATALOG);
  api.list.mockResolvedValue(ok(ROLES));
  api.grantableGroups.mockResolvedValue(
    ok([
      { code: 'CLIENT_OUTREACH_READ', label: 'Client outreach - view', approvalLevel: false },
      { code: 'CLIENT_OUTREACH_MANAGEMENT', label: 'Client outreach - log contacts', approvalLevel: false },
      { code: 'DEMO_APPROVAL', label: 'Client demos - approve', approvalLevel: true },
      { code: 'SELF_SERVICE', label: 'Self-service', approvalLevel: false },
    ])
  );
});

describe('custom roles endpoints', () => {
  it('need ROLE_VIEW to list and ROLE_MANAGE to change', () => {
    const match = createEndpointMatcher(PROCUREMENT_ENDPOINTS);
    expect(match('get', '/v1/access/roles')).toBe('ROLE_VIEW');
    expect(match('get', '/v1/access/roles/grantable-groups')).toBe('ROLE_MANAGE');
    expect(match('post', '/v1/access/roles')).toBe('ROLE_MANAGE');
    expect(match('put', '/v1/access/roles/5')).toBe('ROLE_MANAGE');
    expect(match('delete', '/v1/access/roles/5')).toBe('ROLE_MANAGE');
    expect(match('get', '/v1/access/catalog')).toBeNull();
  });
});

describe('Roles & permissions', () => {
  it('without ROLE_VIEW shows the catalog only and never asks for the role list', async () => {
    signIn(['EMPLOYEE_VIEW']);
    renderModal();
    expect(await screen.findByRole('listitem', { name: 'Marketing Executive' })).toBeInTheDocument();
    expect(api.list).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /new role/i })).not.toBeInTheDocument();
  });

  it('lists every role with its employee count; built-ins are read-only, custom ones managed', async () => {
    signInAsSuperAdmin('ADMIN_L2');
    renderModal();
    const builtIn = await screen.findByRole('listitem', { name: 'Store Manager' });
    expect(within(builtIn).getByText('3 employees')).toBeInTheDocument();
    expect(within(builtIn).getByText(/read-only/i)).toBeInTheDocument();
    expect(within(builtIn).queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();

    const custom = screen.getByRole('listitem', { name: 'Marketing Executive' });
    expect(within(custom).getByText('2 employees')).toBeInTheDocument();
    expect(within(custom).getByRole('button', { name: 'Edit Marketing Executive' })).toBeInTheDocument();
    // Held by employees: deactivate, never delete
    expect(within(custom).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Event Host' })).getByRole('button', { name: 'Delete Event Host' })).toBeInTheDocument();
    expect(api.grantableGroups).not.toHaveBeenCalled();
  });

  it('ROLE_VIEW alone sees the roles but cannot change them', async () => {
    signIn(['EMPLOYEE_VIEW', 'ROLE_VIEW']);
    renderModal();
    const custom = await screen.findByRole('listitem', { name: 'Marketing Executive' });
    expect(within(custom).queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new role/i })).not.toBeInTheDocument();
  });

  it('creates a role from the groups the admin may grant, marking Level 2 only groups', async () => {
    signInAsSuperAdmin('ADMIN_L2');
    api.create.mockResolvedValue(ok(ROLES[2]));
    const invalidate = vi.spyOn(accessService, 'invalidateCatalog');
    const user = userEvent.setup();
    renderModal();
    await screen.findByRole('listitem', { name: 'Store Manager' });

    await user.click(screen.getByRole('button', { name: /new role/i }));
    const dialog = await screen.findByRole('dialog', { name: 'New role' });
    await within(dialog).findByText('Client demos - approve');
    expect(within(dialog).getByText('Level 2 only')).toBeInTheDocument();
    // Self-service is always included, never offered
    expect(within(dialog).queryByText('Self-service')).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Create role' }));
    expect(within(dialog).getByText('Give the role a name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Pick at least one permission group.')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();

    await user.type(within(dialog).getByRole('textbox', { name: 'Role name' }), 'Marketing Executive');
    expect(within(dialog).getByText('MARKETING_EXECUTIVE')).toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox', { name: 'Department' }), 'Marketing');
    await user.click(within(dialog).getByRole('checkbox', { name: /Client outreach - view/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Create role' }));

    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith({ label: 'Marketing Executive', department: 'Marketing', description: '', groups: ['CLIENT_OUTREACH_READ'] })
    );
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New role' })).not.toBeInTheDocument());
    // The list and the employee designation pickers load again
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalled();
  });

  it('deactivates a custom role, keeping its details', async () => {
    signInAsSuperAdmin('ADMIN_L2');
    api.update.mockResolvedValue(ok({ ...ROLES[1], active: false }));
    const user = userEvent.setup();
    renderModal();
    await user.click(await screen.findByRole('button', { name: 'Deactivate Marketing Executive' }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(5, {
        label: 'Marketing Executive', department: 'Marketing', description: 'Calls hotels.',
        groups: ['CLIENT_OUTREACH_READ', 'CLIENT_OUTREACH_MANAGEMENT'], active: false,
      })
    );
  });

  it('offers to deactivate when the server answers ROLE_IN_USE', async () => {
    signInAsSuperAdmin('ADMIN_L2');
    api.remove.mockRejectedValue(conflict('ROLE_IN_USE'));
    api.update.mockResolvedValue(ok({ ...ROLES[2], active: false }));
    const user = userEvent.setup();
    renderModal();
    await user.click(await screen.findByRole('button', { name: 'Delete Event Host' }));
    await user.click(screen.getByRole('button', { name: 'Delete role' }));

    const notice = await screen.findByText(/Event Host is still held by employees/);
    await user.click(within(notice.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(6, expect.objectContaining({ active: false })));
  });
});

describe('designation picker', () => {
  it('offers active custom roles and keeps a deactivated one the employee already holds', () => {
    render(
      <EmployeeAccessFields catalog={CATALOG} catalogError={null} onRetryCatalog={() => {}} designation="OLD_ROLE" role="ADMIN_L1"
        savedRole="ADMIN_L1" savedDesignation="OLD_ROLE" savedDesignationLabel="Old Role" isEditMode isSelfLocked={false}
        canApproveEmployees canEditDesignation errors={{}} onDesignationChange={() => {}} onRoleChange={() => {}} />
    );
    const select = screen.getByRole('combobox', { name: 'Designation' });
    expect(within(select).getByRole('option', { name: 'Marketing Executive (custom role)' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Old Role (inactive)' })).toBeDisabled();
  });

  it('validates custom codes against the catalog', () => {
    expect(validateDesignation('MARKETING_EXECUTIVE', true, CATALOG)).toBeNull();
    expect(validateDesignation('MARKETING_EXECUTIVE', true, null)).toBe('Pick a designation from the list.');
    expect(validateDesignation('OLD_ROLE', false, CATALOG, 'OLD_ROLE')).toBeNull();
    expect(validateDesignation('STORE_MANAGER', true)).toBeNull();
  });
});

describe('role form rules', () => {
  it('makes the code from the label and needs a name, department and a group', () => {
    expect(roleCodeFromLabel('  Marketing  Executive (North) ')).toBe('MARKETING_EXECUTIVE_NORTH');
    expect(validateRoleForm({ label: '', department: '', description: '', groups: ['SELF_SERVICE'] })).toEqual({
      label: 'Give the role a name.',
      department: 'Say which department the role belongs to.',
      groups: 'Pick at least one permission group.',
    });
    expect(validateRoleForm({ label: 'Host', department: 'Events', description: '', groups: ['CLIENT_OUTREACH_READ'] })).toEqual({});
  });
});
