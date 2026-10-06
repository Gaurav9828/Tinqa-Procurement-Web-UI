// Keep in sync with the backend password policy.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,128}$/;

export const PASSWORD_POLICY_MESSAGE =
  `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters with no spaces, and include an uppercase letter, a lowercase letter, a number and a special character.`;

/**
 * Validates a password change. Values are checked exactly as they will be sent
 * (never trimmed), so what passes here is what the server receives.
 */
export const validatePasswordChange = (current: string, next: string, confirm: string): string | null => {
  if (!current) return 'Current password is required.';
  if (!STRONG_PASSWORD_REGEX.test(next)) return PASSWORD_POLICY_MESSAGE;
  if (next === current) return 'New password must be different from current password.';
  if (next !== confirm) return 'New password and confirm password do not match.';
  return null;
};
