import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupplierFormModal } from './SupplierFormModal';
import { clearPincodeCache } from '../../../utils/pincode';
import type { SupplierResponse } from '../types/supplier.types';

const POST_OFFICES: Record<string, { Name: string; District: string; State: string }[]> = {
  '201310': [{ Name: 'Knowledge Park', District: 'Gautam Buddha Nagar', State: 'Uttar Pradesh' }],
  '411057': [{ Name: 'Hinjawadi', District: 'Pune', State: 'Maharashtra' }],
};

const stubIndiaPost = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const pin = url.split('/').pop()!;
      const offices = POST_OFFICES[pin];
      return new Response(JSON.stringify([offices ? { Status: 'Success', PostOffice: offices } : { Status: 'Error', PostOffice: null }]));
    })
  );

const SUPPLIER: SupplierResponse = {
  id: 7,
  name: 'Sharma Traders',
  email: 'sharma@example.com',
  phoneNumber: '+91 9876543210',
  alternatePhoneNumber: '+91 9123456789',
  street: 'Plot 42',
  city: 'Hinjawadi',
  state: 'Maharashtra',
  country: 'India',
  pincode: '411057',
  categories: [{ id: 1, name: 'Laptops', code: 'LAP' }],
  isActive: true,
};

const renderForm = (supplier: SupplierResponse | null = null) => {
  const onSubmit = vi.fn(async () => true);
  render(
    <SupplierFormModal
      isOpen
      onClose={() => {}}
      onSubmit={onSubmit}
      supplier={supplier}
      categories={[{ id: 1, name: 'Laptops' } as never]}
      isSubmitting={false}
    />
  );
  return { user: userEvent.setup(), onSubmit };
};

beforeEach(() => clearPincodeCache());

describe('Supplier address from PIN code', () => {
  it('fills city, district and state from the PIN code and keeps them read-only', async () => {
    stubIndiaPost();
    const { user } = renderForm();
    const city = screen.getByLabelText(/^City/);
    expect(city).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^District/)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^State/)).toHaveAttribute('readonly');

    await user.type(screen.getByLabelText(/^Pincode/), '20a1310');
    expect(screen.getByLabelText(/^Pincode/)).toHaveValue('201310'); // digits only
    await waitFor(() => expect(city).toHaveValue('Gautam Buddha Nagar'));
    expect(screen.getByLabelText(/^District/)).toHaveValue('Gautam Buddha Nagar');
    expect(screen.getByLabelText(/^State/)).toHaveValue('Uttar Pradesh');
    expect(screen.getByText('Areas: Knowledge Park')).toBeInTheDocument();
  });

  it('keeps an existing supplier\'s saved city, fills a missing district, and replaces all three when the PIN changes', async () => {
    stubIndiaPost();
    const { user, onSubmit } = renderForm(SUPPLIER);
    await waitFor(() => expect(screen.getByLabelText(/^District/)).toHaveValue('Pune'));
    expect(screen.getByLabelText(/^City/)).toHaveValue('Hinjawadi');

    await user.clear(screen.getByLabelText(/^Pincode/));
    await user.type(screen.getByLabelText(/^Pincode/), '201310');
    await waitFor(() => expect(screen.getByLabelText(/^City/)).toHaveValue('Gautam Buddha Nagar'));
    expect(screen.getByLabelText(/^State/)).toHaveValue('Uttar Pradesh');

    await user.click(screen.getByRole('button', { name: 'Update Supplier' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ pincode: '201310', city: 'Gautam Buddha Nagar', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' })
      )
    );
  });

  it('keeps Update disabled until something changes; filling a missing district on open is not a change', async () => {
    stubIndiaPost();
    const { user } = renderForm(SUPPLIER);
    await waitFor(() => expect(screen.getByLabelText(/^District/)).toHaveValue('Pune'));
    expect(screen.getByRole('button', { name: 'Update Supplier' })).toBeDisabled();

    await user.type(screen.getByLabelText(/^Trade Name/), '  ');
    expect(screen.getByRole('button', { name: 'Update Supplier' })).toBeDisabled(); // whitespace alone isn't a change
    await user.type(screen.getByLabelText(/^Trade Name/), 'Acme');
    expect(screen.getByRole('button', { name: 'Update Supplier' })).toBeEnabled();
  });

  it('blocks saving with a PIN code India Post does not know', async () => {
    stubIndiaPost();
    const { user, onSubmit } = renderForm(SUPPLIER);
    await user.clear(screen.getByLabelText(/^Pincode/));
    await user.type(screen.getByLabelText(/^Pincode/), '999999');
    expect(await screen.findByText('PIN code not found. Check the number.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Update Supplier' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('unlocks the fields for manual entry when the service is down', async () => {
    // The test setup's fetch always fails.
    const { user } = renderForm();
    await user.type(screen.getByLabelText(/^Pincode/), '201310');
    expect(await screen.findByText(/Couldn't reach the PIN code service/)).toBeInTheDocument();
    const city = screen.getByLabelText(/^City/);
    expect(city).not.toHaveAttribute('readonly');
    await user.type(city, 'Greater Noida');
    expect(city).toHaveValue('Greater Noida');

    stubIndiaPost();
    await user.click(screen.getByRole('button', { name: /Retry/ }));
    await waitFor(() => expect(city).toHaveValue('Gautam Buddha Nagar'));
    expect(city).toHaveAttribute('readonly');
  });
});

describe('Assigning categories', () => {
  it('offers the item categories to pick several of, with no way to create one here', async () => {
    const onSubmit = vi.fn(async () => true);
    render(
      <SupplierFormModal
        isOpen
        onClose={() => {}}
        onSubmit={onSubmit}
        supplier={SUPPLIER}
        isSubmitting={false}
        categories={[{ id: 1, name: 'Laptops', code: 'LAP' }, { id: 2, name: 'Printers', code: 'PRN' }] as never}
      />
    );
    const user = userEvent.setup();

    expect(screen.queryByRole('button', { name: /New Category/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Laptops (LAP)' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Printers (PRN)' }));
    expect(screen.getByRole('button', { name: 'Printers (PRN)' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Update Supplier' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0] as unknown[])[0]).toMatchObject({ categoryIds: [1, 2] });
  });
});
