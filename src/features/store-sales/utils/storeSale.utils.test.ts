import { describe, expect, it } from 'vitest';
import { emptyCustomer, isValidMobile, toStorePhone, validateCustomer } from './storeSale.utils';

describe('store sale utils', () => {
  it('stores mobile numbers the way the storefront does', () => {
    expect(toStorePhone('98765 43210')).toBe('+91 9876543210');
    expect(toStorePhone('+91 98765-43210')).toBe('+91 9876543210');
    expect(toStorePhone('09876543210')).toBe('+91 9876543210');
    expect(isValidMobile('98765 43210')).toBe(true);
    expect(isValidMobile('12345 67890')).toBe(false);
  });

  it('reports every sign-up problem at once, with the storefront rules, and asks for no password', () => {
    const errors = validateCustomer(emptyCustomer(), new Date('2026-10-21T00:00:00'));
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email', 'phoneNumber', 'dob', 'gender', 'address.recipientName', 'address.postalCode'])
    );
    expect(errors).not.toHaveProperty('password');
    const valid = {
      ...emptyCustomer(),
      firstName: 'Walk',
      lastName: 'In',
      email: 'walk@example.com',
      phoneNumber: '9876543210',
      dob: '1990-01-01',
      gender: 'MALE' as const,
      address: { ...emptyCustomer().address, recipientName: 'Walk In', phoneNumber: '9876543210', addressLine1: '12 Market Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001' },
    };
    expect(validateCustomer(valid, new Date('2026-10-21T00:00:00'))).toEqual({});
    expect(validateCustomer({ ...valid, dob: '2030-01-01' }, new Date('2026-10-21T00:00:00')).dob).toMatch(/future/);
  });
});
