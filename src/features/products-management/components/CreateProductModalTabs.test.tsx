import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { useAuthStore } from '../../../store/useAuthStore';
import { signInAsSuperAdmin } from '../../../test/access';
import { fillCategory } from '../pages/categoryTestUtil';
import { imagesInFolder } from '../pages/barcodeTestUtil';
import { CreateProductModal } from './CreateProductModal';
import type { CreateProductRequest } from '../types/product.types';

// The form's lookups (items and stock for the cost sheet, costing settings): empty, these tests are about the tabs
vi.mock('../../item-management/api/itemApi', () => ({
  itemApi: { getItems: vi.fn().mockResolvedValue({ success: true, data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 1000 } }), getItemWarranties: vi.fn().mockResolvedValue({ success: true, data: [] }) },
}));
vi.mock('../../stock-management/api/stockApi', () => ({
  stockApi: { getAllStocks: vi.fn().mockResolvedValue({ success: true, data: [] }), getItemAvailability: vi.fn() },
}));
vi.mock('../api/costingApi', () => ({
  costingApi: { getSettings: vi.fn().mockResolvedValue({ success: true, data: { incomeTaxRate: 25 } }), getItemCost: vi.fn() },
}));

const renderCreate = (props: { serverFieldErrors?: Record<string, string> } = {}) => {
  const onSaveDraft = vi.fn<(payload: CreateProductRequest) => Promise<boolean>>().mockResolvedValue(false);
  const view = (serverFieldErrors?: Record<string, string>) => (
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <CreateProductModal isOpen isSubmitting={false} onClose={() => {}} onSubmit={vi.fn()} onSaveDraft={onSaveDraft} serverFieldErrors={serverFieldErrors} />
    </Provider>
  );
  const { rerender } = render(view(props.serverFieldErrors));
  return { onSaveDraft, user: userEvent.setup(), rerender: (errors: Record<string, string>) => rerender(view(errors)) };
};

const tab = (label: string) => screen.getByRole('tab', { name: (name) => name.includes(label) });

describe('create product form in tabs', () => {
  it('shows one part at a time, Basics first, and moves with the tabs, Next and Back', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { user } = renderCreate();
    const labels = ['Basics', 'Price & GST', 'Images & specs', 'Components & barcodes', 'Costs', 'Warranties', 'Accessory'];
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(labels.map((label, i) => expect.stringContaining(`${i + 1}${label}`)));
    expect(tab('Basics')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Basics/);
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(tab('Price & GST')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Price & GST/);

    await user.click(tab('Warranties'));
    expect(screen.getByRole('region', { name: 'Warranties' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Back/ }));
    expect(tab('Costs')).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps what was typed when switching tabs, and the arrow keys move between tabs', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { user } = renderCreate();
    await user.type(screen.getByPlaceholderText('Product Title'), 'Kedarnath');
    await user.click(tab('Price & GST'));
    await user.type(screen.getByPlaceholderText('0.00'), '4999');
    await user.click(tab('Basics'));
    expect(screen.getByPlaceholderText('Product Title')).toHaveValue('Kedarnath');

    tab('Basics').focus();
    await user.keyboard('{ArrowDown}');
    expect(tab('Price & GST')).toHaveFocus();
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(4999);
  });

  it('has no Costs tab for someone who cannot see costs', () => {
    signInAsSuperAdmin('ADMIN_L1');
    const user = useAuthStore.getState().user!;
    useAuthStore.setState({ user: { ...user, permissions: user.permissions!.filter((p) => p !== 'PRODUCT_COST_VIEW') } });
    renderCreate();
    expect(screen.queryByRole('tab', { name: (name) => name.includes('Costs') })).not.toBeInTheDocument();
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
  });

  it('marks what is still needed on each tab, and says it next to the main button', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { user } = renderCreate();
    expect(within(tab('Basics')).getByRole('img', { name: 'still needed to submit' })).toBeInTheDocument();
    // Image 1 (the front view) and its description are required
    expect(within(tab('Images & specs')).getByRole('img', { name: 'still needed to submit' })).toBeInTheDocument();
    expect(screen.getByTestId('create-product-missing')).toHaveTextContent(
      'Still needed: Basics, Price & GST, Images & specs, Components & barcodes'
    );

    await user.type(screen.getByPlaceholderText('Product Title'), 'Kedarnath');
    await user.type(screen.getByLabelText(/Model name/), 'KD-1');
    await fillCategory(user);
    expect(within(tab('Basics')).getByRole('img', { name: 'done' })).toBeInTheDocument();
    expect(screen.getByTestId('create-product-missing')).toHaveTextContent('Still needed: Price & GST, Images & specs, Components & barcodes');
  });

  it('names every image from the product name and version, and takes the ones found in the image folder', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { user, onSaveDraft } = renderCreate();
    await user.click(tab('Images & specs'));
    const views = ['front view', 'side view', 'back view', 'close-up detail', 'in use'];
    // No buttons and no addresses to type: each slot is named from the product name, once there is one
    expect(screen.queryByRole('button', { name: /Add image/ })).not.toBeInTheDocument();
    views.forEach((view, i) => expect(screen.getByLabelText(`Image ${i + 1} (${view}) file name`)).toHaveTextContent('Needs the product name'));
    expect(screen.getByText(/Enter the product name first/)).toBeInTheDocument();
    expect(screen.getByLabelText('Image 2 (side view) description')).toBeDisabled();

    const folder = 'http://localhost:3000/public/products';
    imagesInFolder('kedarnath_v0.1_1.png', 'kedarnath_v0.1_3.jpg');
    await user.click(tab('Basics'));
    await user.type(screen.getByPlaceholderText('Product Title'), 'Kedar Nath');
    await fillCategory(user);
    await user.click(tab('Images & specs'));
    expect(screen.getByLabelText('Image folder address')).toHaveValue(folder);
    views.forEach((view, i) => expect(screen.getByLabelText(`Image ${i + 1} (${view}) file name`)).toHaveTextContent(`kedarnath_v0.1_${i + 1}`));
    // Found ones show their picture; a missing one keeps its name, to rename the file to
    expect(await screen.findByRole('img', { name: 'Front view' })).toHaveAttribute('src', `${folder}/kedarnath_v0.1_1.png`);
    expect(screen.getByRole('img', { name: 'Back view' })).toHaveAttribute('src', `${folder}/kedarnath_v0.1_3.jpg`);
    expect(screen.queryByRole('img', { name: 'Side view' })).not.toBeInTheDocument();
    expect(screen.getByTestId('image-slot-2-note')).toHaveTextContent('Not in the folder yet: name the picture kedarnath_v0.1_2');
    expect(screen.getByLabelText('Image 2 (side view) description')).toBeDisabled();
    expect(within(tab('Images & specs')).getByRole('img', { name: 'still needed to submit' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Image 1 (front view) description'), 'The carved front of the temple.');
    await user.type(screen.getByLabelText('Image 3 (back view) description'), 'The back wall and its bell.');
    expect(within(tab('Images & specs')).getByRole('img', { name: 'done' })).toBeInTheDocument();

    // A file renamed meanwhile is found when the window gets focus again
    imagesInFolder('kedarnath_v0.1_1.png', 'kedarnath_v0.1_3.jpg', 'kedarnath_v0.1_5.webp');
    window.dispatchEvent(new Event('focus'));
    expect(await screen.findByRole('img', { name: 'In use' })).toHaveAttribute('src', `${folder}/kedarnath_v0.1_5.webp`);
    await user.type(screen.getByLabelText('Image 5 (in use) description'), 'On a shelf, beside a lamp.');

    // Each image stays in its own slot (an empty side view doesn't move the back view up)
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));
    const payload = onSaveDraft.mock.calls[0][0];
    expect(payload).toMatchObject({
      image1Url: `${folder}/kedarnath_v0.1_1.png`,
      image1Description: 'The carved front of the temple.',
      image3Url: `${folder}/kedarnath_v0.1_3.jpg`,
      image3Description: 'The back wall and its bell.',
      image5Url: `${folder}/kedarnath_v0.1_5.webp`,
    });
    expect(payload).not.toHaveProperty('image2Url');
    expect(payload).not.toHaveProperty('image2Description');
  });

  it('looks again in another folder or under a new name', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { user } = renderCreate();
    imagesInFolder('http://localhost:3000/public/products/kedarnath_v0.1_1.png');
    await user.type(screen.getByPlaceholderText('Product Title'), 'Kedarnath');
    await user.click(tab('Images & specs'));
    expect(await screen.findByRole('img', { name: 'Front view' })).toBeInTheDocument();

    // Another folder: not there
    const folder = screen.getByLabelText('Image folder address');
    await user.clear(folder);
    await user.type(folder, 'https://cdn.tinqa.com/products');
    await waitFor(() => expect(screen.getByTestId('image-slot-1')).toHaveAttribute('data-state', 'missing'));
    expect(screen.queryByRole('img', { name: 'Front view' })).not.toBeInTheDocument();
    imagesInFolder('https://cdn.tinqa.com/products/kedarnathtemple_v0.1_1.png');
    await user.click(tab('Basics'));
    await user.type(screen.getByPlaceholderText('Product Title'), ' Temple');
    await user.click(tab('Images & specs'));
    expect(await screen.findByRole('img', { name: 'Front view' })).toHaveAttribute('src', 'https://cdn.tinqa.com/products/kedarnathtemple_v0.1_1.png');
  });

  it('saves a draft from any tab', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { user, onSaveDraft } = renderCreate();
    await user.type(screen.getByPlaceholderText('Product Title'), 'Kedarnath');
    await fillCategory(user);
    await user.click(tab('Accessory'));
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));
    expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ title: 'Kedarnath', categoryName: 'Dioramas' }));
  });

  it('takes the optional software and its version together, set apart in Basics, and sends them trimmed', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { user, onSaveDraft } = renderCreate();
    const box = screen.getByTestId('product-software');
    expect(within(box).getByText('(optional)')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Product Title'), 'Kedarnath');
    await user.type(screen.getByLabelText(/Model name/), 'KD-1');
    await fillCategory(user);

    // A name without its version is unfinished: Basics is still needed and a draft can't be saved
    await user.type(screen.getByLabelText('Software name'), '  TinQa OS ');
    expect(within(tab('Basics')).getByRole('img', { name: 'still needed to submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeDisabled();

    await user.type(screen.getByLabelText('Software version'), '2.1.0');
    expect(within(tab('Basics')).getByRole('img', { name: 'done' })).toBeInTheDocument();
    expect(screen.getByTestId('product-software-preview')).toHaveTextContent('Customers see: Software · TinQa OS 2.1.0');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));
    expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ softwareName: 'TinQa OS', softwareVersion: '2.1.0' }));
  });

  it('leaves software out of a new product without any, and shows the server\'s software errors in Basics', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { user, onSaveDraft, rerender } = renderCreate();
    await user.type(screen.getByPlaceholderText('Product Title'), 'Kedarnath');
    await fillCategory(user);
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));
    const payload = onSaveDraft.mock.calls[0][0];
    expect(payload).not.toHaveProperty('softwareName');
    expect(payload).not.toHaveProperty('softwareVersion');

    await user.click(tab('Warranties'));
    rerender({ softwareVersion: 'Enter the version of TinQa OS, or clear the software name.' });
    expect(tab('Basics')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Software version')).toHaveAccessibleDescription('Enter the version of TinQa OS, or clear the software name.');
  });

  it('opens the first tab with an error the server sent back, and marks it', async () => {
    signInAsSuperAdmin('ADMIN_L1');
    const { rerender } = renderCreate();
    rerender({ 'warranties[0].durationUnit': 'Choose a unit.', 'costEntries[0].amount': 'Too much.' });
    expect(tab('Costs')).toHaveAttribute('aria-selected', 'true');
    expect(within(tab('Costs')).getByRole('img', { name: 'has errors' })).toBeInTheDocument();
    expect(within(tab('Warranties')).getByRole('img', { name: 'has errors' })).toBeInTheDocument();
  });
});
