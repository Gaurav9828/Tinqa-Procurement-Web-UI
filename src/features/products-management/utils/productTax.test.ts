import { describe, expect, it } from 'vitest';
import {
  GST_RATES,
  describeGst,
  emptyTaxForm,
  gstChanged,
  isAllowedGstRate,
  sellingPricePaise,
  splitInclusive,
  toGstFields,
  toTaxForm,
  validateTaxForm,
} from './productTax';

describe('splitInclusive (same numbers as Ecommerce BE InclusiveGst)', () => {
  it('charges ₹59,999 at 18% as equal CGST + SGST in our state', () => {
    expect(splitInclusive(5_999_900, 18, 'INTRA_STATE')).toEqual({
      taxable: 5_084_662, cgst: 457_619, sgst: 457_619, igst: null, cgstRate: 9, igstRate: null, total: 5_999_900,
    });
  });

  it('charges ₹59,999 at 18% as IGST to another state', () => {
    expect(splitInclusive(5_999_900, 18, 'INTER_STATE')).toEqual({
      taxable: 5_084_661, cgst: null, sgst: null, igst: 915_239, cgstRate: null, igstRate: 18, total: 5_999_900,
    });
  });

  it('handles nil-rated goods and half of 0.25%', () => {
    expect(splitInclusive(123_450, 0, 'INTRA_STATE')).toMatchObject({ taxable: 123_450, cgst: 0, sgst: 0 });
    expect(splitInclusive(100_000, 0.25, 'INTRA_STATE')).toMatchObject({ cgstRate: 0.125 });
  });

  it('always adds up to the amount, with CGST equal to SGST', () => {
    for (const { value: rate } of GST_RATES) {
      for (let paise = 1; paise <= 200_000; paise += 37) {
        const intra = splitInclusive(paise, rate, 'INTRA_STATE');
        expect(intra.cgst).toBe(intra.sgst);
        expect(intra.taxable + (intra.cgst ?? 0) + (intra.sgst ?? 0)).toBe(paise);
        const inter = splitInclusive(paise, rate, 'INTER_STATE');
        expect(inter.taxable + (inter.igst ?? 0)).toBe(paise);
      }
    }
  });
});

describe('sellingPricePaise (Ecommerce BE OrderPricing.unitPrice)', () => {
  it('takes the discount off and rounds to paise', () => {
    expect(sellingPricePaise(1000, 10)).toBe(90_000);
    expect(sellingPricePaise(59999, '')).toBe(5_999_900);
    expect(sellingPricePaise(999.99, 33.33)).toBe(66_669);
    // 0 and 100 % are ignored, as on the server
    expect(sellingPricePaise(500, 100)).toBe(50_000);
  });
});

describe('tax form', () => {
  it('allows only the GST rates in force', () => {
    expect(isAllowedGstRate(18)).toBe(true);
    expect(isAllowedGstRate(0)).toBe(true);
    expect(isAllowedGstRate(12)).toBe(false);
    expect(isAllowedGstRate(28)).toBe(false);
    expect(isAllowedGstRate(null)).toBe(false);
  });

  it('requires the rate and an HSN/SAC of 4, 6 or 8 digits', () => {
    expect(validateTaxForm(emptyTaxForm())).toEqual({ hsnSac: 'HSN/SAC is required on GST invoices.', gstRate: 'Choose the GST rate.' });
    expect(validateTaxForm({ hsnSac: '94051', gstRate: '18' }).hsnSac).toMatch(/4, 6 or 8/);
    expect(validateTaxForm({ hsnSac: '9405', gstRate: '12' }).gstRate).toMatch(/in force/);
    expect(validateTaxForm({ hsnSac: '940510', gstRate: '0' })).toEqual({});
  });

  it('round-trips a saved product', () => {
    const form = toTaxForm({ hsnSac: '9405', gstRate: 18 });
    expect(form).toEqual({ hsnSac: '9405', gstRate: '18' });
    expect(toGstFields(form)).toEqual({ hsnSac: '9405', gstRate: 18 });
    expect(toTaxForm({ hsnSac: null, gstRate: null })).toEqual(emptyTaxForm());
  });

  it('describes and compares GST', () => {
    expect(describeGst({ hsnSac: '9405', gstRate: 18 })).toBe('GST 18% · HSN/SAC 9405');
    expect(describeGst({})).toBe('GST not set');
    expect(gstChanged({ gstRate: 18, hsnSac: '9405' }, { gstRate: 18, hsnSac: '9405' })).toBe(false);
    expect(gstChanged({ gstRate: 18 }, { gstRate: 5 })).toBe(true);
  });
});
