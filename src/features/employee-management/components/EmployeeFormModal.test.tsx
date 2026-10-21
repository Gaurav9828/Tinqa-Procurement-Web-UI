import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeFormModal } from './EmployeeFormModal';
import { EmployeeAccessModal } from './EmployeeAccessModal';
import type { EmployeeResponse } from '../types/employee.types';
import type { EmployeeSaveResult } from '../hooks/useEmployeeActions';
import type { AccessCatalog } from '../../../config/access';
import { accessService } from '../../../api/services/accessService';
import { useAuthStore } from '../../../store/useAuthStore';
import { superAdminPermissions } from '../../../test/access';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { employeeApi } from '../api/employeeApi';

// The PIN code lookup answers from here instead of India Post
vi.mock('../../../utils/pincode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/pincode')>()),
  lookupPincode: vi.fn(async () => ({
    status: 'found',
    location: { city: 'Bengaluru Urban', district: 'Bengaluru Urban', state: 'Karnataka', country: 'India', areas: ['MG Road'] },
  })),
}));

const CATALOG: AccessCatalog = {
  designations: [
    { code: 'SUPER_ADMIN', label: 'Super Admin', department: 'Administration', description: 'System owner.', groups: ['EMPLOYEE_MANAGEMENT', 'EMPLOYEE_APPROVAL'] },
    { code: 'STORE_MANAGER', label: 'Store Manager', department: 'Store Operations', description: 'Operations lead.', groups: ['CATALOG_READ', 'CATALOG_APPROVAL'] },
    { code: 'CATALOG_SPECIALIST', label: 'Catalog Specialist', department: 'Catalog & Content', description: 'Listings.', groups: ['CATALOG_READ'] },
  ],
  groups: [
    { code: 'EMPLOYEE_MANAGEMENT', label: 'Employees - create and edit', approvalLevel: false },
    { code: 'EMPLOYEE_APPROVAL', label: 'Employees - approve', approvalLevel: true },
    { code: 'CATALOG_READ', label: 'Catalog - view', approvalLevel: false },
    { code: 'CATALOG_APPROVAL', label: 'Catalog - approve', approvalLevel: true },
  ],
  permissions: [],
};

const EMPLOYEE = {
  id: 7,
  userId: 70,
  username: 'ravi',
  employeeCode: 'EMP-7',
  firstName: 'Ravi',
  lastName: 'Kumar',
  displayName: 'Ravi Kumar',
  dateOfBirth: '1990-01-01',
  gender: 'MALE',
  designation: 'CATALOG_SPECIALIST',
  designationLabel: 'Catalog Specialist',
  role: 'ADMIN_L1',
  department: 'Catalog & Content',
  employmentType: 'FULL_TIME',
  joiningDate: '2024-01-01',
  salaryAmount: 50000,
  salaryCurrency: 'INR',
  phone: '9876543210',
  alternatePhone: '9876543211',
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
} as EmployeeResponse;

const ok: EmployeeSaveResult = { ok: true };

const signInAs = (level: 'ADMIN_L1' | 'ADMIN_L2') =>
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: { userId: 1, username: 'admin', email: 'a@tinqa.com', role: level, authClient: 'web', isFirstLogin: false, permissions: superAdminPermissions(level) },
  });

const envelope = <T,>(data: T, message = '') => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });

beforeEach(() => {
  accessService.resetCatalogCache();
  vi.spyOn(accessService, 'getCatalog').mockResolvedValue(CATALOG);
  vi.spyOn(employeeApi, 'sendEmailCode').mockResolvedValue(
    envelope({ email: 'ravi.personal@gmail.com', codeValidMinutes: 10, resendAfterSeconds: 60 })
  );
  vi.spyOn(employeeApi, 'confirmEmailCode').mockResolvedValue(
    envelope({ email: 'ravi.personal@gmail.com', verificationToken: 'verified-token', expiresAt: '' })
  );
  signInAs('ADMIN_L2');
});

const renderForm = (props: Partial<React.ComponentProps<typeof EmployeeFormModal>> = {}) => {
  const onSubmitCreate = vi.fn(async () => ok);
  const onSubmitUpdate = vi.fn(async () => ok);
  const view = render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <EmployeeFormModal
        isOpen
        employeeToEdit={null}
        isSubmitting={false}
        onClose={() => undefined}
        onSubmitCreate={onSubmitCreate}
        onSubmitUpdate={onSubmitUpdate}
        {...props}
      />
    </Provider>
  );
  const field = <T extends HTMLElement>(name: string) => view.container.querySelector(`[name="${name}"]`) as T;
  return { user: userEvent.setup(), field, onSubmitCreate, onSubmitUpdate };
};

// Waits for the designation picker, which appears once the catalog has loaded
const designationSelect = async () => (await screen.findByRole('combobox', { name: /designation/i })) as HTMLSelectElement;

const fillCreateForm = async (user: ReturnType<typeof userEvent.setup>, field: (name: string) => HTMLElement) => {
  await user.type(field('username'), 'ravi2');
  await user.type(field('firstName'), 'Ravi');
  await user.type(field('lastName'), 'Kumar');
  await user.type(field('phone'), '9876543210');
  await user.type(field('alternatePhone'), '9876543211');
  fireEvent.change(field('dateOfBirth'), { target: { value: '1990-01-01' } });
  await user.type(field('panNumber'), 'abcpk1234f');
  await user.type(field('houseNumber'), 'Flat 4B');
  await user.type(field('street'), '12 MG Road');
  await user.type(field('pincode'), '560001');
  // District and state are filled from the PIN code
  await screen.findByDisplayValue('Karnataka');
  // The personal email is verified with the code the employee reads out
  await user.type(field('personalEmail'), 'ravi.personal@gmail.com');
  await user.click(screen.getByRole('button', { name: /send code/i }));
  await user.type(await screen.findByRole('textbox', { name: 'Verification code' }), '48213');
  await user.click(screen.getByRole('button', { name: /verify/i }));
  await screen.findByText('Email verified');
};

const save = async (user: ReturnType<typeof userEvent.setup>, confirmText: string) => {
  await user.click(screen.getByRole('button', { name: /continue to save/i }));
  await user.click(await screen.findByRole('button', { name: confirmText }));
};

describe('EmployeeFormModal PAN and address', () => {
  it('sends the PAN and address, with district and state from the PIN code', async () => {
    const { user, field, onSubmitCreate } = renderForm();
    await fillCreateForm(user, field);
    await user.selectOptions(await designationSelect(), 'Catalog Specialist');
    await user.type(field('googleMapsUrl'), 'https://maps.app.goo.gl/abc123');
    expect(field<HTMLInputElement>('district')).toHaveAttribute('readonly');
    await save(user, 'Yes, Submit');

    expect(onSubmitCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        panNumber: 'ABCPK1234F',
        houseNumber: 'Flat 4B',
        street: '12 MG Road',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        pincode: '560001',
        googleMapsUrl: 'https://maps.app.goo.gl/abc123',
        personalEmail: 'ravi.personal@gmail.com',
        personalEmailVerificationToken: 'verified-token',
      })
    );
    expect(employeeApi.sendEmailCode).toHaveBeenCalledWith('ravi.personal@gmail.com', 'Ravi');
    expect(employeeApi.confirmEmailCode).toHaveBeenCalledWith('ravi.personal@gmail.com', '48213');
  });

  it('starts the verification over when the personal email is edited', async () => {
    const { user, field } = renderForm();
    await fillCreateForm(user, field);
    await user.type(field('personalEmail'), 'x');
    expect(screen.queryByText('Email verified')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to save/i })).toBeDisabled();
  });

  it("refuses a business PAN and a link that isn't Google Maps", async () => {
    const { user, field } = renderForm();
    await fillCreateForm(user, field);
    await user.selectOptions(await designationSelect(), 'Catalog Specialist');
    const saveButton = screen.getByRole('button', { name: /continue to save/i });
    expect(saveButton).toBeEnabled();

    await user.clear(field('panNumber'));
    await user.type(field('panNumber'), 'ABCCK1234F');
    expect(screen.getByText(/4th letter P/)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    await user.clear(field('panNumber'));
    await user.type(field('panNumber'), 'ABCPK1234F');
    await user.type(field('googleMapsUrl'), 'https://evil.example.com/maps');
    expect(saveButton).toBeDisabled();
  });

  it('needs the PAN for a new employee', async () => {
    const { user, field } = renderForm();
    await fillCreateForm(user, field);
    await user.selectOptions(await designationSelect(), 'Catalog Specialist');
    await user.clear(field('panNumber'));
    expect(screen.getByRole('button', { name: /continue to save/i })).toBeDisabled();
  });
});

describe('EmployeeFormModal access', () => {
  it('lets an employee approver pick a designation and level, and sends the codes', async () => {
    const { user, field, onSubmitCreate } = renderForm();
    await fillCreateForm(user, field);
    await user.selectOptions(await designationSelect(), 'Store Manager');
    await user.selectOptions(field('role'), 'Level 2 (approver)');

    // Level 2 accounts always need a second approver
    expect(screen.getByRole('note')).toHaveTextContent(/always need a second person/);
    await save(user, 'Yes, Submit');

    expect(onSubmitCreate).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN_L2', designation: 'STORE_MANAGER' }));
  });

  it('fills the department from the designation and never lets it be edited', async () => {
    const { user, field, onSubmitCreate } = renderForm();
    const department = () => field<HTMLInputElement>('department');
    await designationSelect();
    expect(department()).toBeDisabled();
    expect(department().value).toBe('Select a designation');

    await user.selectOptions(await designationSelect(), 'Store Manager');
    expect(department().value).toBe('Store Operations');
    await user.selectOptions(await designationSelect(), 'Catalog Specialist');
    expect(department().value).toBe('Catalog & Content');

    // The server derives it, so it isn't sent
    await fillCreateForm(user, field);
    await save(user, 'Yes, Submit');
    expect(onSubmitCreate).toHaveBeenCalledWith(expect.not.objectContaining({ department: expect.anything() }));
  });

  it('shows the saved department on edit and moves it with a new designation', async () => {
    const { user, field, onSubmitUpdate } = renderForm({ employeeToEdit: EMPLOYEE });
    await designationSelect();
    expect(field<HTMLInputElement>('department').value).toBe('Catalog & Content');
    await user.selectOptions(await designationSelect(), 'Store Manager');
    expect(field<HTMLInputElement>('department').value).toBe('Store Operations');
    await save(user, 'Save Changes');
    expect(onSubmitUpdate).toHaveBeenCalledWith(7, { designation: 'STORE_MANAGER' });
  });

  it('locks the level to Level 1 for a designation without approval powers', async () => {
    const { user, field, onSubmitCreate } = renderForm();
    await fillCreateForm(user, field);
    await user.selectOptions(await designationSelect(), 'Store Manager');
    await user.selectOptions(field('role'), 'Level 2 (approver)');

    await user.selectOptions(await designationSelect(), 'Catalog Specialist');
    expect(field('role').tagName).toBe('INPUT');
    expect(field<HTMLInputElement>('role')).toBeDisabled();
    expect(field<HTMLInputElement>('role').value).toBe('Level 1 (maker)');
    expect(screen.getByText(/Catalog Specialist has no approval powers/)).toBeInTheDocument();

    await save(user, 'Yes, Submit');
    expect(onSubmitCreate).toHaveBeenCalledWith(expect.objectContaining({ designation: 'CATALOG_SPECIALIST', role: 'ADMIN_L1' }));
  });

  it('offers the level again for a designation that can approve', async () => {
    const { user, field } = renderForm();
    await user.selectOptions(await designationSelect(), 'Catalog Specialist');
    expect(field('role').tagName).toBe('INPUT');
    await user.selectOptions(await designationSelect(), 'Store Manager');
    expect(field('role').tagName).toBe('SELECT');
  });

  it('previews the groups a designation grants, holding back approval groups at Level 1', async () => {
    const { user } = renderForm();
    await user.selectOptions(await designationSelect(), 'Store Manager');

    const preview = screen.getByLabelText('Access preview');
    expect(within(preview).getByText('Catalog - view')).toBeInTheDocument();
    expect(within(preview).getByText('Level 2 would also allow:')).toBeInTheDocument();
    expect(within(preview).getByText('Catalog - approve')).toBeInTheDocument();
  });

  it('gives a non-approver a fixed Level 1 and keeps Super Admin out of reach', async () => {
    signInAs('ADMIN_L1');
    const { user, field, onSubmitCreate } = renderForm();
    const select = await designationSelect();

    expect(field('role').tagName).toBe('INPUT');
    expect(field<HTMLInputElement>('role').value).toBe('Level 1 (maker)');
    expect(within(select).getByRole('option', { name: /Super Admin/ })).toBeDisabled();

    await fillCreateForm(user, field);
    await user.selectOptions(select, 'Catalog Specialist');
    // Created by someone who can't approve employees, so it waits for approval
    expect(screen.getByRole('note')).toHaveTextContent(/wait for another administrator/);
    await save(user, 'Yes, Submit');
    expect(onSubmitCreate).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN_L1', designation: 'CATALOG_SPECIALIST' }));
  });

  it('does not let a non-approver change the level on edit', async () => {
    signInAs('ADMIN_L1');
    const { field } = renderForm({ employeeToEdit: EMPLOYEE });
    await designationSelect();
    expect(field('role').tagName).toBe('INPUT');
    expect(field<HTMLInputElement>('role')).toBeDisabled();
  });

  it('on edit sends only the changed fields, including the level when changed', async () => {
    const { user, field, onSubmitUpdate } = renderForm({ employeeToEdit: EMPLOYEE });
    await user.selectOptions(await designationSelect(), 'Store Manager');
    await user.selectOptions(field('role'), 'ADMIN_L2');
    await save(user, 'Save Changes');

    expect(onSubmitUpdate).toHaveBeenCalledWith(7, { designation: 'STORE_MANAGER', role: 'ADMIN_L2' });
  });

  it('leaves the level out of the update when it did not change', async () => {
    const { user, onSubmitUpdate } = renderForm({ employeeToEdit: EMPLOYEE });
    await user.selectOptions(await designationSelect(), 'Store Manager');
    await save(user, 'Save Changes');
    expect(onSubmitUpdate).toHaveBeenCalledWith(7, { designation: 'STORE_MANAGER' });
  });

  it('locks designation and level on your own record', async () => {
    const { field } = renderForm({ employeeToEdit: EMPLOYEE, isSelfEdit: true });
    expect(await screen.findByDisplayValue('Catalog Specialist')).toBeDisabled();
    expect(field<HTMLInputElement>('role')).toBeDisabled();
  });

  it('shows 400 field errors from the API next to level and designation', async () => {
    const onSubmitCreate = vi.fn(
      async (): Promise<EmployeeSaveResult> => ({
        ok: false,
        fieldErrors: { role: 'Role must be ADMIN_L1 or ADMIN_L2', designation: 'Only an approver can assign Super Admin' },
      })
    );
    const { user, field } = renderForm({ onSubmitCreate });
    await fillCreateForm(user, field);
    await user.selectOptions(await designationSelect(), 'Catalog Specialist');
    await save(user, 'Yes, Submit');

    expect(await screen.findByText('Role must be ADMIN_L1 or ADMIN_L2')).toBeInTheDocument();
    expect(screen.getByText('Only an approver can assign Super Admin')).toBeInTheDocument();
  });

  it('offers a retry when the designations cannot be loaded', async () => {
    vi.spyOn(accessService, 'getCatalog').mockRejectedValueOnce(new Error('Network down')).mockResolvedValueOnce(CATALOG);
    const { user } = renderForm();
    const alert = await screen.findByRole('alert');
    await user.click(within(alert).getByRole('button', { name: /retry/i }));
    expect(await designationSelect()).toBeInTheDocument();
  });
});

describe('EmployeeAccessModal', () => {
  const renderModal = (props: Partial<React.ComponentProps<typeof EmployeeAccessModal>> = {}) => {
    const onSave = vi.fn(async (): Promise<EmployeeSaveResult> => ok);
    const onClose = vi.fn();
    render(<EmployeeAccessModal employee={EMPLOYEE} isSelf={false} isSubmitting={false} onClose={onClose} onSave={onSave} {...props} />);
    return { user: userEvent.setup(), onSave, onClose };
  };

  it('changes designation and level after confirming, sending only what changed', async () => {
    const { user, onSave, onClose } = renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Manage access for Ravi Kumar' });
    expect(screen.getByRole('button', { name: /save access/i })).toBeDisabled();

    await user.selectOptions(await designationSelect(), 'Store Manager');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /admin level/i }), 'ADMIN_L2');
    await user.click(screen.getByRole('button', { name: /save access/i }));
    await user.click(await screen.findByRole('button', { name: 'Save Changes' }));

    expect(onSave).toHaveBeenCalledWith(7, { designation: 'STORE_MANAGER', role: 'ADMIN_L2' });
    expect(onClose).toHaveBeenCalled();
  });

  it('moves a Level 2 to Level 1 when the new designation cannot approve', async () => {
    const { user, onSave } = renderModal({ employee: { ...EMPLOYEE, designation: 'STORE_MANAGER', designationLabel: 'Store Manager', role: 'ADMIN_L2' } });
    await user.selectOptions(await designationSelect(), 'Catalog Specialist');
    await user.click(screen.getByRole('button', { name: /save access/i }));
    expect(await screen.findByText(/Store Manager · Level 2 \(approver\) → Catalog Specialist · Level 1 \(maker\)/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).toHaveBeenCalledWith(7, { designation: 'CATALOG_SPECIALIST', role: 'ADMIN_L1' });
  });

  it('is read-only on your own account', async () => {
    renderModal({ isSelf: true });
    expect(await screen.findByDisplayValue('Catalog Specialist')).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent(/your own account/);
    expect(screen.getByRole('button', { name: /save access/i })).toBeDisabled();
  });

  it('keeps the dialog open and shows the server error when saving fails', async () => {
    const onSave = vi.fn(async (): Promise<EmployeeSaveResult> => ({ ok: false, fieldErrors: { designation: "You can't change your own designation." } }));
    const { user, onClose } = renderModal({ onSave });
    await user.selectOptions(await designationSelect(), 'Store Manager');
    await user.click(screen.getByRole('button', { name: /save access/i }));
    await user.click(await screen.findByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText("You can't change your own designation.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
