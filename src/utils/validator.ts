export interface ValidationRule {
  type?: 'text' | 'email' | 'phone' | 'number' | 'url' | 'alphanumeric';
  required?: boolean;
  min?: number;
  max?: number;
  custom?: (val: any) => boolean;
  customMessage?: string;
}

export const Validator = {
  /**
   * Smartly checks whether any value (String, Array, Object, Map, Set, Number, Boolean) is non-empty/valid.
   */
  isValid: (value: any): boolean => {
    if (value === null || value === undefined) return false;

    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return !isNaN(value);

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value instanceof Map || value instanceof Set) {
      return value.size > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }

    return true;
  },

  /* Specific Regex Rules */
  isEmail: (email: string): boolean => {
    if (!Validator.isValid(email)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  },

  isPhone: (phone: string): boolean => {
    if (!Validator.isValid(phone)) return false;
    return /^\+?[0-9\s-]{10,15}$/.test(phone.trim());
  },

  isNumber: (val: any): boolean => {
    if (!Validator.isValid(val)) return false;
    return !isNaN(Number(val));
  },

  isAlphanumeric: (val: string): boolean => {
    if (!Validator.isValid(val)) return false;
    return /^[a-zA-Z0-9]+$/.test(val.trim());
  },

  /**
   * Universal Field Rule Evaluator: returns error string if invalid, or null if valid.
   */
  validateField: (value: any, rule: ValidationRule): string | null => {
    const hasVal = Validator.isValid(value);

    if (rule.required && !hasVal) {
      return rule.customMessage || 'This field is required.';
    }

    if (!hasVal) return null; // Non-required empty fields are valid

    const stringVal = String(value).trim();

    if (rule.type === 'email' && !Validator.isEmail(stringVal)) {
      return rule.customMessage || 'Enter a valid email address.';
    }

    if (rule.type === 'phone' && !Validator.isPhone(stringVal)) {
      return rule.customMessage || 'Enter a valid 10+ digit phone number.';
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