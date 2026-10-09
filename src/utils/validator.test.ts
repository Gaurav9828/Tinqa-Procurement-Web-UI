import { describe, it, expect } from 'vitest';
import { Validator } from './validator';

describe('phone numbers', () => {
  it('normalises formatting and the +91 / 0 prefixes so the same number compares equal', () => {
    const same = ['+91 98765 43210', '+91-98765-43210', '098765 43210', '9876543210', '919876543210'];
    expect(new Set(same.map(Validator.normalizePhone)).size).toBe(1);
    expect(Validator.normalizePhone('+91 98765 43211')).not.toBe(Validator.normalizePhone('9876543210'));
  });

  it('accepts a valid primary with no alternate', () => {
    expect(Validator.validatePhonePair('+91 9876543210', '')).toEqual({});
  });

  it('rejects a malformed primary or alternate', () => {
    expect(Validator.validatePhonePair('12345', '').primary).toMatch(/valid phone number/);
    expect(Validator.validatePhonePair('9876543210', '55555').alternate).toMatch(/valid alternate phone number/);
    expect(Validator.validatePhonePair('', '').primary).toBe('Phone number is required.');
    expect(Validator.validatePhonePair('', '', { primaryRequired: false })).toEqual({});
  });

  it('rejects an alternate that is the same number, however it is written', () => {
    expect(Validator.validatePhonePair('+91 98765 43210', '9876543210').alternate).toBe(
      'Alternate phone number cannot be the same as the phone number.'
    );
    expect(Validator.validatePhonePair('9876543210', '+91 98765 43211')).toEqual({});
  });
});
