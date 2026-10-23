import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { signInAsSuperAdmin } from '../../../test/access';
import { CreateProductModal } from './CreateProductModal';
import type { CreateProductRequest, ProductCategory } from '../types/product.types';

const CATEGORIES: ProductCategory[] = [
  { id: 1, name: 'Dioramas', slug: 'dioramas', sortOrder: 10, productCount: 4 },
  { id: 2, name: 'Accessories', slug: 'accessories', sortOrder: 20, productCount: 1 },
];

const renderCreate = () => {
  const onSubmit = vi.fn<(payload: CreateProductRequest) => Promise<boolean>>().mockResolvedValue(true);
  signInAsSuperAdmin('ADMIN_L1');
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <CreateProductModal isOpen isSubmitting={false} onClose={() => {}} onSubmit={onSubmit} categories={CATEGORIES} />
    </Provider>
  );
  return { onSubmit, user: userEvent.setup() };
};

const fillRequired = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText('Product Title'), 'Lens cleaner');
  await user.type(screen.getByPlaceholderText('0.00'), '299');
  await user.selectOptions(screen.getByLabelText('GST rate *'), '18');
  await user.type(screen.getByLabelText('HSN / SAC code *'), '3405');
};

const submit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Create Product' }));
  await user.click(await screen.findByRole('button', { name: 'Confirm & Create' }));
};

describe('product category picker', () => {
  it('is required: the product cannot be created without a category', async () => {
    const { user } = renderCreate();
    await fillRequired(user);
    expect(screen.getByRole('button', { name: 'Create Product' })).toBeDisabled();

    await user.click(screen.getByRole('combobox', { name: 'Category *' }));
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a category or type a new one.');
  });

  it('lists the existing categories with their product counts and picks one', async () => {
    const { user, onSubmit } = renderCreate();
    await fillRequired(user);
    await user.click(screen.getByRole('combobox', { name: 'Category *' }));
    const options = within(screen.getByRole('listbox', { name: 'Categories' })).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Dioramas4 products', 'Accessories1 product']);

    await user.click(screen.getByRole('option', { name: /Accessories/ }));
    expect(screen.getByRole('combobox', { name: 'Category *' })).toHaveValue('Accessories');
    await submit(user);
    expect(onSubmit.mock.calls[0][0].categoryName).toBe('Accessories');
  });

  it('typing an existing name in another spelling picks that category instead of creating a second one', async () => {
    const { user, onSubmit } = renderCreate();
    await fillRequired(user);
    const field = screen.getByRole('combobox', { name: 'Category *' });
    await user.type(field, 'accessories ');
    expect(screen.queryByRole('option', { name: /Create category/ })).not.toBeInTheDocument();
    expect(screen.getByText('Existing category · 1 product')).toBeInTheDocument();
    await user.tab();
    expect(field).toHaveValue('Accessories');
    await submit(user);
    expect(onSubmit.mock.calls[0][0].categoryName).toBe('Accessories');
  });

  it('creates a new category from the typed name, chosen with the keyboard', async () => {
    const { user, onSubmit } = renderCreate();
    await fillRequired(user);
    const field = screen.getByRole('combobox', { name: 'Category *' });
    await user.type(field, '  Spare   parts');
    expect(screen.getByRole('option', { name: 'Create category "Spare parts"' })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(field).toHaveValue('Spare parts');
    expect(screen.getByText(/New category — "Spare parts" is created when the product is saved/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create Product' }));
    expect(screen.getByTestId('preview-category')).toHaveTextContent('Spare partsNew category');
    await user.click(screen.getByRole('button', { name: 'Confirm & Create' }));
    expect(onSubmit.mock.calls[0][0].categoryName).toBe('Spare parts');
  });
});
