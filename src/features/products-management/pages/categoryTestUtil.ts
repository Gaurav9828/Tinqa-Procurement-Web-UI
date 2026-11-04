import { openFormTab } from './barcodeTestUtil';
import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import type { ProductCategory } from '../types/product.types';

/** The seeded category (Ecommerce BE V24) the test products belong to. */
export const DIORAMAS: ProductCategory = { id: 1, name: 'Dioramas', slug: 'dioramas', sortOrder: 10 };

/** Picks (or creates) the product form's required category. */
export const fillCategory = async (user: ReturnType<typeof userEvent.setup>, name = 'Dioramas') => {
  await openFormTab(user, 'Basics');
  const field = screen.getByRole('combobox', { name: 'Category *' });
  await user.clear(field);
  await user.type(field, name);
  await user.tab();
};
