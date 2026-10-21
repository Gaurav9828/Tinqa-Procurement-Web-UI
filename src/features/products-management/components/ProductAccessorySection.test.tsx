import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductAccessorySection } from './ProductAccessorySection';
import { emptyAccessoryForm, type AccessoryForm } from '../utils/accessoryForm';
import type { AccessoryLinkResponse, ProductResponse } from '../types/product.types';

const product = (id: number, title: string, accessory = false): ProductResponse =>
  ({ id, title, enabled: true, accessory, accessoryFor: [], accessories: [] }) as unknown as ProductResponse;

const PRODUCTS = [product(1, 'Lamp'), product(2, 'Frame'), product(3, 'Stand', true)];

const Harness = ({ ownAccessories, onForm }: { ownAccessories?: AccessoryLinkResponse[]; onForm?: (form: AccessoryForm) => void }) => {
  const [value, setValue] = useState<AccessoryForm>(emptyAccessoryForm);
  return (
    <ProductAccessorySection
      value={value}
      onChange={(next) => {
        setValue(next);
        onForm?.(next);
      }}
      products={PRODUCTS}
      selfId={9}
      ownAccessories={ownAccessories}
      price={1000}
      discountPercentage={10}
      errors={{}}
      onClearErrors={() => {}}
    />
  );
};

describe('ProductAccessorySection', () => {
  it('adds parents with the default extra discount and previews the bundle price', async () => {
    const user = userEvent.setup();
    let latest = emptyAccessoryForm();
    render(<Harness onForm={(form) => (latest = form)} />);

    await user.click(screen.getByLabelText(/this product is also an accessory/i));
    // Accessories (Stand) are never offered as parents
    expect(screen.queryByRole('button', { name: /Stand/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Lamp/ }));

    expect(latest.parents).toEqual([{ productId: 1, title: 'Lamp', discount: '5' }]);
    // 1000 less 10 % = 900; 5 % more = 855
    expect(screen.getByText(/Together: ₹855 per accessory \(saves ₹45\)/)).toBeInTheDocument();

    const discount = screen.getByLabelText('Extra discount with Lamp');
    await user.clear(discount);
    await user.type(discount, '12');
    expect(latest.parents[0].discount).toBe('12');

    await user.click(screen.getByRole('button', { name: 'Remove Lamp' }));
    expect(latest.parents).toEqual([]);
  });

  it('a product other accessories are offered with only lists them', () => {
    render(<Harness ownAccessories={[{ productId: 3, title: 'Stand', bundleDiscountPercentage: 5 }]} />);
    expect(screen.getByTestId('own-accessories')).toHaveTextContent('Stand · +5% off together');
    expect(screen.queryByLabelText(/this product is also an accessory/i)).toBeNull();
  });
});
