import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../../store/alertSlice';
import { ApprovalPreviewModal } from './ApprovalPreviewModal';
import { supplierPaymentApi } from '../../order-management/api/supplierPaymentApi';
import { signInAsSuperAdmin } from '../../../test/access';
import type { UnifiedApprovalItem } from '../types/approval.types';

vi.mock('../../order-management/api/supplierPaymentApi', () => ({ supplierPaymentApi: { timeline: vi.fn() } }));
const api = vi.mocked(supplierPaymentApi);

// What a supplier quoted: 10 units at ₹100 plus ₹50 shipment (total before GST 1050), 18 % intra-state GST
const QUOTATION = {
  approvalType: 'QUOTATIONS',
  id: 5,
  orderNumber: 'ORD-5',
  supplierName: 'Acme Traders',
  itemName: 'Router',
  orderQuantity: 10,
  unitType: 'PIECES',
  unitPrice: 100,
  totalPrice: 1050,
  shipmentPrice: 50,
  orderDate: '2026-10-01',
  expectedDelivery: '2099-12-31',
  createdBy: 'supplier',
  orderStatus: 'QUOTATION',
  raisedBySupplier: true,
  additionalInfo: { supplierNote: 'Ships in two lots' },
  taxBreakup: { supplyType: 'INTRA_STATE', gstRate: 18, hsnSac: '8517', taxableValue: 1050, cgst: 94.5, sgst: 94.5, igst: 0, cess: 0, totalTax: 189, grandTotal: 1239 },
  advancePercent: 30,
  midtermPercent: 0,
  expectedPaymentMethod: 'BANK_TRANSFER',
} as unknown as UnifiedApprovalItem;

const renderModal = (request: UnifiedApprovalItem = QUOTATION) =>
  render(
    <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
      <ApprovalPreviewModal request={request} isOpen onClose={vi.fn()} onApprove={vi.fn()} onReject={vi.fn()} formatTime={(iso) => iso} />
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  signInAsSuperAdmin('ADMIN_L2');
  api.timeline.mockResolvedValue({ success: true, message: 'OK', data: { orderId: 5, orderNumber: 'ORD-5', events: [] } } as never);
});

describe('Quotation review: everything the supplier entered', () => {
  it('shows the price, GST, delivery date, note and the payment plan in rupees', () => {
    renderModal();
    const details = within(screen.getByTestId('quotation-details'));
    expect(details.getByText('₹100')).toBeInTheDocument();
    expect(details.getByText('2099-12-31')).toBeInTheDocument();
    // The total already includes shipment: it is not added twice
    expect(details.getByText('₹1,050')).toBeInTheDocument();
    expect(details.getByLabelText('GST breakup')).toHaveTextContent('CGST @ 9%');
    const plan = within(details.getByRole('table', { name: 'Payment plan breakup' }));
    expect(plan.getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual([
      'Advance (once the supplier accepts the order)30%₹371.70',
      'Final (after the units are tested)70%₹867.30',
    ]);
    expect(details.getByTestId('plan-breakup')).toHaveTextContent('Expected method: Bank to bank transfer');
    expect(screen.getByText('Ships in two lots')).toBeInTheDocument();
  });

  it('opens the quotation’s flow history on demand', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(api.timeline).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Flow history' }));
    await waitFor(() => expect(api.timeline).toHaveBeenCalledWith(5, 'staff'));
  });

  it('shows the item’s price beside a higher quoted price, the difference and the supplier’s reason', () => {
    renderModal({
      ...QUOTATION,
      unitPrice: 1600,
      additionalInfo: { mrp: 1400, previousUnitPrice: 1500, priceChangeReason: 'Copper prices went up' },
    } as UnifiedApprovalItem);
    const check = within(screen.getByRole('region', { name: 'Price check' }));
    expect(check.getByText(/Above the item’s price|Above the item's price/)).toBeInTheDocument();
    expect(check.getByTestId('price-check-quoted')).toHaveTextContent('₹1,600.00 per PIECES');
    expect(check.getByTestId('price-check-item')).toHaveTextContent('₹1,400.00 per PIECES+₹200.00 (+14.29%)');
    expect(check.getByTestId('price-check-previous')).toHaveTextContent('₹1,500.00 per PIECES+₹100.00 (+6.67%)');
    expect(check.getByTestId('price-change-reason')).toHaveTextContent('Copper prices went up');
  });

  it('shows no price check for a quotation at the item’s price', () => {
    renderModal();
    expect(screen.queryByRole('region', { name: 'Price check' })).not.toBeInTheDocument();
  });
});
