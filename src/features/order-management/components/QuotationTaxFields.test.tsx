import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuotationTaxFields } from './QuotationTaxFields';
import { emptyTaxForm } from '../utils/quotationTax';

describe('QuotationTaxFields supply type', () => {
  const enabled = { ...emptyTaxForm(), enabled: true };

  it('shows CGST + SGST / IGST as a required choice of clickable options', async () => {
    const onChange = vi.fn();
    render(<QuotationTaxFields value={enabled} onChange={onChange} taxable={100} />);

    const group = screen.getByRole('radiogroup', { name: 'How GST applies' });
    expect(group).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('How GST applies')).toHaveTextContent('*');

    await userEvent.click(screen.getByText(/Supplier in another state — IGST/));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ supplyType: 'INTER_STATE' }));
  });

  it('marks the choice invalid when the form says it is missing', () => {
    render(
      <QuotationTaxFields
        value={enabled}
        onChange={vi.fn()}
        taxable={100}
        errors={{ 'taxBreakup.supplyType': 'Choose CGST + SGST or IGST.' }}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'How GST applies' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Choose CGST + SGST or IGST.')).toBeInTheDocument();
  });
});
