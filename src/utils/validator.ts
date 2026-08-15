export interface ValidationRule {
  type?: 'text' | 'email' | 'phone' | 'number' | 'url' | 'alphanumeric';
  required?: boolean;
  min?: number;
  max?: number;
  custom?: (val: any) => boolean;
  customMessage?: string;
}

export const Validator = {

  
  isValid: (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return !isNaN(value);
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Map || value instanceof Set) return value.size > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  },

  isEmail: (email: string): boolean => {
    if (!Validator.isValid(email)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  },

  /**
   * Validates international telephone numbers according to E.164 standards.
   * - Optional leading +
   * - Validates country code + national number (10 to 15 total digits)
   * - Rejects truncated/short numbers like +9173986603
   */
  isPhone: (phone: string): boolean => {
    if (!Validator.isValid(phone)) return false;
    const sanitized = phone.trim().replace(/[\s-()]/g, '');

    // E.164 format check: 10 to 15 digits overall, optional leading +
    if (!/^\+?[1-9]\d{9,14}$/.test(sanitized)) {
      return false;
    }

    // Explicit Indian (+91 or 10-digit) mobile validation rule (starts with 6, 7, 8, 9 and has 10 digits)
    if (sanitized.startsWith('+91')) {
      const indianNumber = sanitized.slice(3);
      return /^[6-9]\d{9}$/.test(indianNumber);
    } else if (sanitized.length === 10 && !sanitized.startsWith('+')) {
      return /^[6-9]\d{9}$/.test(sanitized);
    }

    return true;
  },

  isNumber: (val: any): boolean => {
    if (!Validator.isValid(val)) return false;
    return !isNaN(Number(val));
  },

  isAlphanumeric: (val: string): boolean => {
    if (!Validator.isValid(val)) return false;
    return /^[a-zA-Z0-9]+$/.test(val.trim());
  },

  validateField: (value: any, rule: ValidationRule): string | null => {
    const hasVal = Validator.isValid(value);

    if (rule.required && !hasVal) {
      return rule.customMessage || 'This field is required.';
    }

    if (!hasVal) return null;

    const stringVal = String(value).trim();

    if (rule.type === 'email' && !Validator.isEmail(stringVal)) {
      return rule.customMessage || 'Enter a valid email address.';
    }

    if (rule.type === 'phone' && !Validator.isPhone(stringVal)) {
      return rule.customMessage || 'Enter a valid international phone number (e.g. +91 9876543210).';
    }

    if (rule.type === 'number' && !Validator.isNumber(value)) {
      return rule.customMessage || 'Must be a valid number.';
    }

    if (rule.min !== undefined) {
      if (typeof value === 'number' && value < rule.min) {
        return rule.customMessage || `Minimum value is ${rule.min}.`;
      }
      if (stringVal.length < rule.min) {
        return rule.customMessage || `Must be at least ${rule.min} characters.`;
      }
    }

    if (rule.max !== undefined) {
      if (typeof value === 'number' && value > rule.max) {
        return rule.customMessage || `Maximum value is ${rule.max}.`;
      }
      if (stringVal.length > rule.max) {
        return rule.customMessage || `Cannot exceed ${rule.max} characters.`;
      }
    }

    if (rule.custom && !rule.custom(value)) {
      return rule.customMessage || 'Invalid input value.';
    }

    return null;
  },
};