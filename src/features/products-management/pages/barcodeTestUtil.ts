import { screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

let issued = 0;

/** A valid barcode no other test field uses. */
export const testBarcode = () => `TB${String(++issued).padStart(8, '0')}`;

/** Scans (types + Enter, like a scanner) a new barcode into every barcode field of `scope` until none needs more. */
export const scanAllBarcodes = async (user: ReturnType<typeof userEvent.setup>, scope: HTMLElement) => {
  for (const input of within(scope).queryAllByRole('textbox')) {
    // Each barcode field says how many codes it still needs
    const missing = Number(input.dataset.missing ?? 0);
    for (let i = 0; i < missing; i++) await user.type(input, `${testBarcode()}{Enter}`);
  }
};

/** Scans the barcodes of the unit(s) a product form builds: each unit's own and its pieces'. */
export const scanUnitBarcodes = (user: ReturnType<typeof userEvent.setup>, formId = 'new-product') =>
  scanAllBarcodes(user, screen.getByTestId(`${formId}-units`));

/** The Procurement barcode lookups (pieces in stock, a product's units): none yet. Undefined for any other URL. */
export const noBarcodes = (url: string) =>
  url === '/v1/barcodes' || url.startsWith('/v1/barcodes/')
    ? { data: { success: true, message: 'OK', data: [], timestamp: '', path: '' } }
    : undefined;
