import type { StoreAddressRequest, StoreCustomerAddress, StoreCustomerRequest, StoreSale } from '../types/storeSale.types';

// The storefront sign-up rules (Ecommerce BE AuthSecurityValidator), checked here first so the agent sees every
// problem at once. The server checks them again.
const NAME_PATTERN = /^\p{L}[\p{L}\s.'-]{1,49}$/u;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const PINCODE_PATTERN = /^[1-9]\d{5}$/;
const ADDRESS_LINE_MAX = 120;
const MAX_AGE_YEARS = 110;
export const RECEIPT_MAX = 50;
export const NOTES_MAX = 500;

export type FieldErrors = Record<string, string>;

/** "98765 43210", "+91 9876543210" or "09876543210" → "+91 9876543210", the form the storefront stores. */
export const toStorePhone = (typed: string): string => {
  const digits = typed.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
  return `+91 ${local}`;
};

export const isValidMobile = (typed: string): boolean => INDIAN_MOBILE.test(toStorePhone(typed).slice(4));

export const emptyAddress = (): StoreAddressRequest => ({
  addressType: 'SHIPPING',
  recipientName: '',
  phoneNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
});

/** A complete email address (the storefront sign-up rule), e.g. before sending it a verification code. */
export const isValidEmail = (email: string): boolean => EMAIL_PATTERN.test(email.trim());

export const emptyCustomer = (): StoreCustomerRequest => ({
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  dob: '',
  gender: '',
  address: emptyAddress(),
});

const requireName = (errors: FieldErrors, field: string, value: string | undefined, label: string) => {
  if (!value?.trim()) errors[field] = `${label} is required.`;
  else if (!NAME_PATTERN.test(value.trim())) errors[field] = `${label} must be 2-50 characters and start with a letter.`;
};

const requireMobile = (errors: FieldErrors, field: string, value: string) => {
  if (!value.trim()) errors[field] = 'Mobile number is required.';
  else if (!isValidMobile(value)) errors[field] = 'Enter a 10-digit Indian mobile number.';
};

/** Field errors of a delivery address, keyed `address.<field>`. */
export const validateAddress = (address: StoreAddressRequest, prefix = 'address.'): FieldErrors => {
  const errors: FieldErrors = {};
  requireName(errors, `${prefix}recipientName`, address.recipientName, 'Recipient name');
  requireMobile(errors, `${prefix}phoneNumber`, address.phoneNumber);
  if (!address.addressLine1.trim()) errors[`${prefix}addressLine1`] = 'Address line 1 is required.';
  else if (address.addressLine1.trim().length > ADDRESS_LINE_MAX) errors[`${prefix}addressLine1`] = `At most ${ADDRESS_LINE_MAX} characters.`;
  if ((address.addressLine2 ?? '').trim().length > ADDRESS_LINE_MAX) errors[`${prefix}addressLine2`] = `At most ${ADDRESS_LINE_MAX} characters.`;
  if (!PINCODE_PATTERN.test(address.postalCode.trim())) errors[`${prefix}postalCode`] = 'Enter a valid 6-digit PIN code.';
  if (!address.city.trim()) errors[`${prefix}city`] = 'City is required.';
  if (!address.state.trim()) errors[`${prefix}state`] = 'State is required.';
  return errors;
};

export const validateCustomer = (form: StoreCustomerRequest, today: Date = new Date()): FieldErrors => {
  const errors: FieldErrors = {};
  requireName(errors, 'firstName', form.firstName, 'First name');
  if (form.middleName?.trim() && !NAME_PATTERN.test(form.middleName.trim())) errors.middleName = 'Middle name contains invalid characters.';
  requireName(errors, 'lastName', form.lastName, 'Last name');
  if (!form.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  requireMobile(errors, 'phoneNumber', form.phoneNumber);
  if (!form.dob) errors.dob = 'Date of birth is required.';
  else {
    const dob = new Date(`${form.dob}T00:00:00`);
    const oldest = new Date(today.getFullYear() - MAX_AGE_YEARS, today.getMonth(), today.getDate());
    if (Number.isNaN(dob.getTime()) || dob > today) errors.dob = 'Date of birth cannot be in the future.';
    else if (dob < oldest) errors.dob = `Date of birth must be within the last ${MAX_AGE_YEARS} years.`;
  }
  if (!form.gender) errors.gender = 'Gender is required.';
  return { ...errors, ...validateAddress(form.address) };
};

/** What the server receives: trimmed values and phones in "+91 9876543210" form. */
export const toAddressPayload = (address: StoreAddressRequest): StoreAddressRequest => ({
  ...address,
  recipientName: address.recipientName.trim(),
  phoneNumber: toStorePhone(address.phoneNumber),
  addressLine1: address.addressLine1.trim(),
  addressLine2: address.addressLine2?.trim() || undefined,
  city: address.city.trim(),
  state: address.state.trim(),
  postalCode: address.postalCode.trim(),
});

export const toCustomerPayload = (form: StoreCustomerRequest): StoreCustomerRequest => ({
  ...form,
  firstName: form.firstName.trim(),
  middleName: form.middleName?.trim() || undefined,
  lastName: form.lastName.trim(),
  email: form.email.trim().toLowerCase(),
  phoneNumber: toStorePhone(form.phoneNumber),
  address: toAddressPayload(form.address),
});

export const formatAddress = (address: Pick<StoreCustomerAddress, 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode'>): string =>
  [address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode].filter((part) => part?.trim()).join(', ');

/** The seller as people know them: their name, else their login. */
export const sellerLabel = (sale: Pick<StoreSale, 'soldBy' | 'soldByName'>): string => sale.soldByName?.trim() || sale.soldBy;

export const EMAIL_STATUS_LABELS: Record<NonNullable<StoreSale['customerEmailStatus']>, string> = {
  PENDING: 'Email queued',
  SENT: 'Email sent',
  FAILED: 'Email failed',
};
