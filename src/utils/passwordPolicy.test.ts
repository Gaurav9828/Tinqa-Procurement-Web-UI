import { describe, it, expect } from 'vitest';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_RULES, isStrongPassword, validateNewPassword, validatePasswordChange } from './passwordPolicy';

const STRONG = 'Tinqa@2026ok';

describe('password policy', () => {
  it('accepts 12+ characters with upper, lower, number and special', () => {
    expect(STRONG).toHaveLength(12);
    expect(isStrongPassword(STRONG)).toBe(true);
    expect(isStrongPassword('A1!' + 'a'.repeat(125))).toBe(true);
  });

  it.each([
    ['11 characters', 'Tinqa@2026o'],
    ['no uppercase', 'tinqa@2026ok'],
    ['no lowercase', 'TINQA@2026OK'],
    ['no number', 'Tinqa@abcdok'],
    ['no special character', 'Tinqa20266ok'],
    ['a space', 'Tinqa@ 2026ok'],
    ['over 128 characters', 'A1!' + 'a'.repeat(126)],
    ['empty', ''],
  ])('rejects %s', (_name, password) => {
    expect(isStrongPassword(password)).toBe(false);
  });

  it('reports each rule separately for the checklist', () => {
    const met = (p: string) => PASSWORD_RULES.filter((r) => r.test(p)).map((r) => r.id);
    expect(met('')).toEqual([]);
    expect(met('abc')).toEqual(['lower', 'noSpaces']);
    expect(met(STRONG)).toEqual(['length', 'upper', 'lower', 'digit', 'special', 'noSpaces']);
  });

  it('first-login: only new + confirm', () => {
    expect(validateNewPassword('short', 'short')).toBe(PASSWORD_POLICY_MESSAGE);
    expect(validateNewPassword(STRONG, STRONG + 'x')).toMatch(/do not match/);
    expect(validateNewPassword(STRONG, STRONG)).toBeNull();
  });

  it('profile change: also needs a different current password', () => {
    expect(validatePasswordChange('', STRONG, STRONG)).toMatch(/Current password/);
    expect(validatePasswordChange(STRONG, STRONG, STRONG)).toMatch(/different/);
    expect(validatePasswordChange('Old@password1', STRONG, STRONG)).toBeNull();
  });
});
