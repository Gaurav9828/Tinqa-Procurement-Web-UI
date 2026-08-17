export interface ValidationRule {
  type?: 'text' | 'email' | 'phone' | 'number' | 'url' | 'alphanumeric' | 'gstin' | 'pan' | 'pincode';
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

  isPhone: (phone: string): boolean => {
    if (!Validator.isValid(phone)) return false;
    const sanitized = phone.trim().replace(/[\s-()]/g, '');

    if (!/^\+?[1-9]\d{9,14}$/.test(sanitized)) {
      return false;
    }

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

  isUrl: (val: string): boolean => {
    if (!Validator.isValid(val)) return false;
    try {
      new URL(val.trim());
      return true;
    } catch {
      return false;
    }
  },

  isGstin: (gstin: string): boolean => {
    if (!Validator.isValid(gstin)) return false;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
  },

  isPan: (pan: string): boolean => {
    if (!Validator.isValid(pan)) return false;
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
  },

  isPincode: (pincode: string): boolean => {
    if (!Validator.isValid(pincode)) return false;
    return /^[1-9][0-9]{5}$/.test(pincode.trim());
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

    if (rule.type === 'url' && !Validator.isUrl(stringVal)) {
      return rule.customMessage || 'Enter a valid URL.';
    }

    if (rule.type === 'gstin' && !Validator.isGstin(stringVal)) {
      return rule.customMessage || 'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5).';
    }

    if (rule.type === 'pan' && !Validator.isPan(stringVal)) {
      return rule.customMessage || 'Invalid PAN format (e.g., ABCDE1234F).';
    }

    if (rule.type === 'pincode' && !Validator.isPincode(stringVal)) {
      return rule.customMessage || 'Enter a valid 6-digit Indian Pincode.';
    }

    if (rule.min !== undefined) {
      if (typeof value === 'number' && value < rule.min) {
        return rule.customMessage || `Minimum value is ${rule.min}.`;
      }
      if (typeof value === 'string' && stringVal.length < rule.min) {
        return rule.customMessage || `Must be at least ${rule.min} characters.`;
      }
    }

    if (rule.max !== undefined) {
      if (typeof value === 'number' && value > rule.max) {
        return rule.customMessage || `Maximum value is ${rule.max}.`;
      }
      if (typeof value === 'string' && stringVal.length > rule.max) {
        return rule.customMessage || `Cannot exceed ${rule.max} characters.`;
      }
    }

    if (rule.custom && !rule.custom(value)) {
      return rule.customMessage || 'Invalid input value.';
    }

    return null;
  },
};