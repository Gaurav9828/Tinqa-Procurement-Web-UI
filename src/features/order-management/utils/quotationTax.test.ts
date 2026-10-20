import { describe, expect, it } from 'vitest';
import {
  calculateTax,
  describeTax,
  emptyTaxForm,
  readTaxBreakup,
  taxFormChanged,
  taxFormFrom,
  taxPayload,
  validateTaxForm,
  type TaxForm,
} from './quotationTax';

// Same figures as Procurement BE QuotationTaxTest: ₹1,050 taxable
const TAXABLE = 105000;
const form = (patch: Partial<TaxForm>): TaxForm => ({ ...emptyTaxForm(), enabled: true, ...patch });

describe('Quotation GST breakup', () => {
  it('splits the rate into equal CGST and SGST inside the state, as the backend does', () => {
    const amounts = calculateTax(TAXABLE, form({ supplyType: 'INTRA_STATE', gstRate: '18' }));
    expect(amounts).toMatchObject({ cgst: 9450, sgst: 9450, igst: 0, totalTax: 18900, grandTotal: 123900 });
  });

  it('charges IGST across states, with cess on top, and half a paisa rounds up', () => {
    expect(calculateTax(TAXABLE, form({ supplyType: 'INTER_STATE', gstRate: '5', cess: '10' }))).toMatchObject({ igst: 5250, cess: 1000, grandTotal: 111250 });
    // ₹10.10 at 0.25%: 2.525 paise of IGST rounds half up to 3, like BigDecimal HALF_UP
    expect(calculateTax(1010, form({ supplyType: 'INTER_STATE', gstRate: '0.25' }))?.igst).toBe(3);
  });

  it('accepts typed amounts within ₹1 of the rate only', () => {
    expect(validateTaxForm(form({ supplyType: 'INTRA_STATE', gstRate: '18', cgst: '95' }), TAXABLE)).toEqual({});
    expect(validateTaxForm(form({ supplyType: 'INTRA_STATE', gstRate: '18', cgst: '120' }), TAXABLE)['taxBreakup.cgst']).toMatch('₹94.50');
    expect(validateTaxForm(form({ gstRate: '12' }), TAXABLE)).toMatchObject({
      'taxBreakup.supplyType': expect.any(String),
      'taxBreakup.gstRate': 'Choose one of the GST rates in force.',
    });
    expect(validateTaxForm(form({ supplyType: 'INTER_STATE', gstRate: '18', hsnSac: '12' }), TAXABLE)['taxBreakup.hsnSac']).toBeDefined();
    expect(validateTaxForm(emptyTaxForm(), TAXABLE)).toEqual({});
  });

  it('sends the rate and only what was typed; {} removes the breakup', () => {
    expect(taxPayload(emptyTaxForm())).toEqual({});
    expect(taxPayload(form({ supplyType: 'INTRA_STATE', gstRate: '18', hsnSac: '7408', cgst: '95' }))).toEqual({
      supplyType: 'INTRA_STATE', gstRate: 18, hsnSac: '7408', cgst: 95, sgst: 95,
    });
  });

  it('reads a stored breakup back, ignoring legacy maps', () => {
    const stored = { supplyType: 'INTER_STATE', gstRate: 5, hsnSac: '7408', taxableValue: 1050, cgst: 0, sgst: 0, igst: 52.5, cess: 0, totalTax: 52.5, grandTotal: 1102.5 };
    expect(readTaxBreakup(stored)?.igst).toBe(52.5);
    expect(readTaxBreakup({ 'CGST 9%': 90 })).toBeNull();
    expect(describeTax(stored)).toBe('GST 5% · IGST · HSN 7408');
    expect(taxFormFrom(stored)).toMatchObject({ enabled: true, supplyType: 'INTER_STATE', gstRate: '5', igst: '' });
    expect(taxFormChanged(taxFormFrom(stored), stored)).toBe(false);
    expect(taxFormChanged({ ...taxFormFrom(stored), gstRate: '18' }, stored)).toBe(true);
    expect(taxFormChanged(emptyTaxForm(), stored)).toBe(true);
  });
});
