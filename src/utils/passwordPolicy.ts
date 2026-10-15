// Keep in sync with the backend password policy.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordRule {
  id: 'length' | 'upper' | 'lower' | 'digit' | 'special' | 'noSpaces';
  label: string;
  test: (password: string) => boolean;
}

/** Each rule on its own, so the UI can show a live checklist. */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  { id: 'upper', label: 'An uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'A lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: 'A number (0–9)', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'A special character (e.g. ! @ # $ %)', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
  { id: 'noSpaces', label: 'No spaces', test: (p) => p.length > 0 && !/\s/.test(p) },
];

export const PASSWORD_POLICY_MESSAGE =
  `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters with no spaces, and include an uppercase letter, a lowercase letter, a number and a special character.`;

export const isStrongPassword = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));

/**
 * Validates a new password + confirmation (first-login setup). Values are checked exactly as they
 * will be sent (never trimmed), so what passes here is what the server receives.
 */
export const validateNewPassword = (next: string, confirm: string): string | null => {
  if (!isStrongPassword(next)) return PASSWORD_POLICY_MESSAGE;
  if (next !== confirm) return 'New password and confirm password do not match.';
  return null;
};

/** Validates a password change that also needs the current password (profile → Password). */
export const validatePasswordChange = (current: string, next: string, confirm: string): string | null => {
  if (!current) return 'Current password is required.';
  if (!isStrongPassword(next)) return PASSWORD_POLICY_MESSAGE;
  if (next === current) return 'New password must be different from current password.';
  if (next !== confirm) return 'New password and confirm password do not match.';
  return null;
};
