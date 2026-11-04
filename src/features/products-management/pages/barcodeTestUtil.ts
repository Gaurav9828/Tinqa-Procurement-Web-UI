import { screen, waitFor, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import { probeImage } from '../api/imageProbe';
import { IMAGE_LOOKUP_DELAY_MS } from '../hooks/useFoundImages';

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

/**
 * Opens a part of the create product form by its tab label (a no-op in forms without tabs, e.g. Edit). A tab's name
 * also holds its number, hint and marker, so the label is matched within it.
 */
export const openFormTab = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  const tab = screen.queryByRole('tab', { name: (name) => name.includes(label) });
  if (tab && tab.getAttribute('aria-selected') !== 'true') await user.click(tab);
};

/** The picture files there are: a file name (found in any folder) or a full address. */
export const imagesInFolder = (...files: string[]) =>
  vi.mocked(probeImage).mockImplementation(async (url) => files.some((file) => url === file || url.endsWith(`/${file}`)));

/**
 * Puts image 1 (the front view, required to create or submit) in the folder as a .png, whatever the product is
 * called, and describes it once it is found.
 */
export const fillFrontImage = async (user: ReturnType<typeof userEvent.setup>) => {
  vi.mocked(probeImage).mockImplementation(async (url) => url.endsWith('_1.png'));
  // As after putting the picture in the folder: back on the window, the form looks again. Without it, a look that
  // ran before the picture was there (a slow machine) leaves it missing
  window.dispatchEvent(new Event('focus'));
  await openFormTab(user, 'Images & specs');
  const description = screen.getByLabelText('Image 1 (front view) description');
  // Found only after the lookup delay: leave room for it on a busy machine
  await waitFor(() => expect(description).toBeEnabled(), { timeout: IMAGE_LOOKUP_DELAY_MS + 4_000 });
  await user.type(description, 'The front, as it stands on display.');
};

/** Scans the barcodes of the unit(s) a product form builds: each unit's own and its pieces'. */
export const scanUnitBarcodes = async (user: ReturnType<typeof userEvent.setup>, formId = 'new-product') => {
  await openFormTab(user, 'Components & barcodes');
  await scanAllBarcodes(user, screen.getByTestId(`${formId}-units`));
};

/** The Procurement barcode lookups (pieces in stock, a product's units): none yet. Undefined for any other URL. */
export const noBarcodes = (url: string) =>
  url === '/v1/barcodes' || url.startsWith('/v1/barcodes/')
    ? { data: { success: true, message: 'OK', data: [], timestamp: '', path: '' } }
    : undefined;
