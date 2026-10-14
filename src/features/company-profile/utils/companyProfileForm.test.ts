import { describe, it, expect } from 'vitest';
import {
  emptyForm,
  missingForSubmit,
  panMismatch,
  stateCodeMismatch,
  toBody,
  toForm,
  validateForSave,
  validateForSubmit,
  type CompanyProfileForm,
} from './companyProfileForm';
import { fieldLabel, parseServerTime } from './companyProfile.utils';
import { getAdminIdentity } from '../../../auth/adminIdentity';

const form = (patch: Partial<CompanyProfileForm> = {}, address: Partial<CompanyProfileForm['address']> = {}): CompanyProfileForm => {
  const base = emptyForm();
  return { ...base, brandName: 'TinQa', ...patch, address: { ...base.address, ...address } };
};

describe('validateForSave', () => {
  it('accepts an incomplete draft with just a brand name', () => {
    expect(validateForSave(form())).toEqual({});
  });

  it('requires a brand name of at most 40 characters without < or >', () => {
    expect(validateForSave(form({ brandName: ' ' })).brandName).toMatch(/required/);
    expect(validateForSave(form({ brandName: 'x'.repeat(41) })).brandName).toMatch(/40/);
    expect(validateForSave(form({ brandName: '<b>TinQa</b>' })).brandName).toMatch(/< or >/);
  });

  it('flags a PAN that does not match the GSTIN and a mismatching state code (acceptance 7)', () => {
    const errors = validateForSave(form({ gstin: '27AAACT1234A1Z5', pan: 'BBBCT1234A' }, { state: 'Maharashtra', stateCode: '29' }));
    expect(errors.pan).toMatch(/AAACT1234A/);
    expect(errors['address.stateCode']).toMatch(/27/);
    expect(validateForSave(form({ gstin: '27AAACT1234A1Z5', pan: 'AAACT1234A' }, { state: 'Maharashtra', stateCode: '27' }))).toEqual({});
  });

  it('requires a state when a GSTIN is set', () => {
    expect(validateForSave(form({ gstin: '27AAACT1234A1Z5' }))['address.state']).toMatch(/required/);
  });

  it('checks ID formats', () => {
    const errors = validateForSave(form({ gstin: '27AAACT1234A1Z', pan: 'AAAC1234A', cin: 'U12345' }, { state: 'Maharashtra' }));
    expect(Object.keys(errors).sort()).toEqual(['cin', 'gstin', 'pan']);
  });

  it('checks postal codes by country', () => {
    expect(validateForSave(form({}, { postalCode: '41105' }))['address.postalCode']).toMatch(/6 digits/);
    expect(validateForSave(form({}, { postalCode: '411057' }))).toEqual({});
    expect(validateForSave(form({}, { country: 'United Kingdom', postalCode: 'SW1A 1AA' }))).toEqual({});
    expect(validateForSave(form({}, { country: 'United Kingdom', postalCode: 'SW1A_1AA' }))['address.postalCode']).toBeDefined();
  });

  it('allows https URLs or uploaded image URLs only', () => {
    expect(validateForSave(form({ logoUrl: 'http://cdn.tinqa.com/logo.png' })).logoUrl).toBeDefined();
    expect(validateForSave(form({ logoUrl: 'https://cdn.tinqa.com/logo.png' }))).toEqual({});
    expect(validateForSave(form({ logoUrl: '/files/company/logo.png' }), { knownImageUrls: new Set(['/files/company/logo.png']) })).toEqual({});
    expect(validateForSave(form({ website: 'http://tinqa.com' })).website).toMatch(/https/);
  });

  it('checks contacts', () => {
    const errors = validateForSave(form({ supportEmail: 'help@', careersEmail: 'jobs@tinqa.com', supportPhone: '12ab' }));
    expect(Object.keys(errors).sort()).toEqual(['supportEmail', 'supportPhone']);
  });

  it('checks invoice terms: at most 10, no empty lines, 300 characters each', () => {
    expect(validateForSave(form({ invoiceTerms: Array(11).fill('Term') })).invoiceTerms).toBeDefined();
    const errors = validateForSave(form({ invoiceTerms: ['Ok', '  ', 'x'.repeat(301)] }));
    expect(errors['invoiceTerms[1]']).toMatch(/empty/);
    expect(errors['invoiceTerms[2]']).toMatch(/300/);
  });
});

describe('submit rules', () => {
  it('lists legal name and address fields as required (acceptance 8)', () => {
    expect(missingForSubmit(form()).map((m) => m.label)).toEqual(['Legal name', 'Address line 1', 'City', 'State', 'Postal code']);
    expect(validateForSubmit(form())['address.city']).toMatch(/required to submit/);
  });
});

describe('cross-field hints', () => {
  it('only compares complete values', () => {
    expect(panMismatch('27AAACT', 'BBBCT1234A')).toBeNull();
    expect(stateCodeMismatch('', '29')).toBeNull();
  });
});

describe('toBody', () => {
  it('sends every field, trimmed, blanks as null, IDs upper-cased and the state code taken from the GSTIN', () => {
    const body = toBody(form({ brandName: ' TinQa ', gstin: '27aaact1234a1z5', pan: ' aaact1234a ', invoiceTerms: [' Pay in 30 days '] }, { city: ' ' }));
    expect(body).toMatchObject({
      brandName: 'TinQa',
      gstin: '27AAACT1234A1Z5',
      pan: 'AAACT1234A',
      cin: null,
      logoUrl: null,
      trademarkMark: '',
      invoiceTerms: ['Pay in 30 days'],
      address: { city: null, stateCode: '27', country: 'India' },
    });
    expect(Object.keys(body)).toHaveLength(16);
  });

  it('round-trips a version', () => {
    const fields = toBody(form({ legalName: 'TinQa Pvt Ltd' }, { line1: 'Plot 1' }));
    expect(toBody(toForm(fields))).toEqual(fields);
  });
});

describe('labels and time', () => {
  it('labels nested and indexed fields', () => {
    expect(fieldLabel('address.postalCode')).toBe('Postal code');
    expect(fieldLabel('invoiceTerms[2]')).toBe('Invoice term 3');
  });

  it('reads server timestamps as IST', () => {
    expect(parseServerTime('2026-10-13T10:00:00')?.toISOString()).toBe('2026-10-13T04:30:00.000Z');
    expect(parseServerTime('2026-10-13T10:00:00Z')?.toISOString()).toBe('2026-10-13T10:00:00.000Z');
    expect(parseServerTime(null)).toBeNull();
  });
});

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`;

describe('getAdminIdentity', () => {
  it('reads every admin level and the subject from the token', () => {
    expect(getAdminIdentity(jwt({ sub: 'maker1', roles: ['ROLE_ADMIN_L1', 'ROLE_ADMIN_L2'] }), { username: 'x', role: 'ADMIN_L1' })).toEqual({
      username: 'maker1',
      roles: ['ADMIN_L1', 'ADMIN_L2'],
    });
    expect(getAdminIdentity(jwt({ authorities: [{ authority: 'ROLE_ADMIN_L2' }] }), null).roles).toEqual(['ADMIN_L2']);
    expect(getAdminIdentity(jwt({ scope: 'openid ROLE_ADMIN_L1' }), null).roles).toEqual(['ADMIN_L1']);
  });

  it('falls back to the stored user when the token has no claims', () => {
    expect(getAdminIdentity('not-a-jwt', { username: 'checker', role: 'ADMIN_L2' })).toEqual({ username: 'checker', roles: ['ADMIN_L2'] });
  });
});
