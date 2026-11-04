import type { PromoCodeDetail, PromoCodeRequest, PromoCustomer, PromoDiscountType, PromoScope, PromoStatus } from '../types/promoCode.types';

/** docs/promo-codes.md › Rules › Code: TINQA followed by 3 to 15 capital letters or digits. */
export const PROMO_CODE_PATTERN = /^TINQA[A-Z0-9]{3,15}$/;
export const PROMO_CODE_MAX_LENGTH = 20;
export const PROMO_DESCRIPTION_MAX_LENGTH = 255;
export const PROMO_SEARCH_MAX_LENGTH = 20;
/** At most this many customers and products per code (server rule). */
export const PROMO_SCOPE_MAX = 500;
export const PROMO_PAGE_SIZE = 20;
export const PROMO_HISTORY_PAGE_SIZE = 20;
/** More than 0 and below 100: an order is never free (a ₹0 order can't be paid online). */
export const PROMO_DISCOUNT_MAX = 99.99;
/** The most an amount code takes off one unit, in rupees (server rule). */
export const PROMO_AMOUNT_MAX = 1000;

/** What a code's status means to staff, and its chip colour. */
export const STATUS_META: Record<PromoStatus, { label: string; tone: string; hint: string }> = {
  ACTIVE: { label: 'Active', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', hint: 'Customers can use it now' },
  SCHEDULED: { label: 'Scheduled', tone: 'bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-300', hint: 'Its first day has not come yet' },
  EXPIRED: { label: 'Expired', tone: 'bg-gray-500/10 text-gray-600 dark:text-gray-300', hint: 'Its last day has passed' },
  USED_UP: { label: 'Used up', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', hint: 'Its total uses are reached' },
  DISABLED: { label: 'Switched off', tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-400', hint: 'Nobody can use it until it is switched back on' },
  DELETED: { label: 'Deleted', tone: 'bg-red-500/15 text-red-700 dark:text-red-400', hint: 'Hidden and unusable; it can be restored' },
};

export const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'DISABLED', label: 'Switched off' },
  { value: 'DELETED', label: 'Deleted' },
] as const;

/** Uses per customer: one time, twice, no limit, or a number typed in. */
export type PerCustomerChoice = 'ONCE' | 'TWICE' | 'UNLIMITED' | 'CUSTOM';
/** Total uses by everyone: no limit or a number. */
export type TotalChoice = 'UNLIMITED' | 'LIMITED';
/** How long it is valid from its first day. */
export type ValidityChoice = '6M' | '1Y' | '2Y' | 'CUSTOM';

/** A chosen product's units in one order: every unit, or a number typed in. */
export type UnitsChoice = 'ALL' | 'LIMITED';

/** A chosen product in the form, with on how many of its units the promo works. */
export interface PromoFormProduct {
  id: number;
  title: string;
  units: UnitsChoice;
  /** Typed only for LIMITED. */
  maxUnits: string;
}

export const VALIDITY_MONTHS: Record<Exclude<ValidityChoice, 'CUSTOM'>, number> = { '6M': 6, '1Y': 12, '2Y': 24 };

export interface PromoForm {
  code: string;
  description: string;
  discountType: PromoDiscountType;
  /** Typed only for PERCENTAGE. */
  discountPercentage: string;
  /** Typed only for AMOUNT. */
  amountOff: string;
  customerScope: PromoScope;
  customers: PromoCustomer[];
  productScope: PromoScope;
  products: PromoFormProduct[];
  /** Product scope ALL only. Empty = every unit. */
  maxUnitsPerProduct: string;
  perCustomer: PerCustomerChoice;
  perCustomerCustom: string;
  total: TotalChoice;
  totalLimit: string;
  validity: ValidityChoice;
  startsOn: string;
  /** Typed only for a custom range; a preset works it out from startsOn. */
  expiresOn: string;
  active: boolean;
}

export type PromoFormErrors = Partial<Record<keyof PromoForm | 'customerIds', string>>;

/** Today in India (the server's clock decides validity in India time), YYYY-MM-DD. */
export const todayInIndia = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The last day of a validity of `months` starting on `start` (both days included): 2026-11-04 + 6 months is valid
 * until 2027-05-03. A start on the 31st runs to the end of the shorter month.
 */
export const lastDayOf = (start: string, months: number): string => {
  const [y, m, d] = start.split('-').map(Number);
  const monthIndex = m - 1 + months;
  const year = y + Math.floor(monthIndex / 12);
  const month = monthIndex % 12;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const same = new Date(Date.UTC(year, month, Math.min(d, daysInMonth)));
  same.setUTCDate(same.getUTCDate() - 1);
  return `${same.getUTCFullYear()}-${pad(same.getUTCMonth() + 1)}-${pad(same.getUTCDate())}`;
};

/** The last valid day the form will send. */
export const expiryOf = (form: Pick<PromoForm, 'validity' | 'startsOn' | 'expiresOn'>): string =>
  form.validity === 'CUSTOM' || !form.startsOn ? form.expiresOn : lastDayOf(form.startsOn, VALIDITY_MONTHS[form.validity]);

/** Codes are stored and compared in capitals; only letters and digits can be typed. */
export const normaliseCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, PROMO_CODE_MAX_LENGTH);

export const emptyForm = (today: string): PromoForm => ({
  code: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountPercentage: '',
  amountOff: '',
  customerScope: 'ALL',
  customers: [],
  productScope: 'ALL',
  products: [],
  maxUnitsPerProduct: '',
  perCustomer: 'ONCE',
  perCustomerCustom: '',
  total: 'UNLIMITED',
  totalLimit: '',
  validity: '6M',
  startsOn: today,
  expiresOn: lastDayOf(today, 6),
  active: true,
});

const perCustomerChoiceOf = (limit: number | null): PerCustomerChoice => {
  if (limit === null) return 'UNLIMITED';
  if (limit === 1) return 'ONCE';
  if (limit === 2) return 'TWICE';
  return 'CUSTOM';
};

const validityOf = (startsOn: string, expiresOn: string): ValidityChoice =>
  (Object.keys(VALIDITY_MONTHS) as Exclude<ValidityChoice, 'CUSTOM'>[]).find((key) => lastDayOf(startsOn, VALIDITY_MONTHS[key]) === expiresOn) ?? 'CUSTOM';

/** The edit form of a saved code. */
export const formOf = (detail: PromoCodeDetail): PromoForm => {
  const perCustomer = perCustomerChoiceOf(detail.usageLimitPerCustomer);
  return {
    code: detail.code,
    description: detail.description ?? '',
    discountType: detail.discountType,
    discountPercentage: detail.discountPercentage === null ? '' : String(detail.discountPercentage),
    amountOff: detail.amountOff === null ? '' : String(detail.amountOff),
    customerScope: detail.customerScope,
    customers: detail.customers,
    productScope: detail.productScope,
    products: detail.products.map((p) => ({
      id: p.id,
      title: p.title,
      units: p.maxUnits === null ? 'ALL' : 'LIMITED',
      maxUnits: p.maxUnits === null ? '' : String(p.maxUnits),
    })),
    maxUnitsPerProduct: detail.maxUnitsPerProduct === null ? '' : String(detail.maxUnitsPerProduct),
    perCustomer,
    perCustomerCustom: perCustomer === 'CUSTOM' ? String(detail.usageLimitPerCustomer) : '',
    total: detail.totalUsageLimit === null ? 'UNLIMITED' : 'LIMITED',
    totalLimit: detail.totalUsageLimit === null ? '' : String(detail.totalUsageLimit),
    validity: validityOf(detail.startsOn, detail.expiresOn),
    startsOn: detail.startsOn,
    expiresOn: detail.expiresOn,
    active: detail.active,
  };
};

const WHOLE = /^\d+$/;
const DISCOUNT = /^\d{1,2}(\.\d{1,2})?$/;
const AMOUNT = /^\d{1,4}(\.\d{1,2})?$/;

const limitError = (value: string, what: string) =>
  value.trim() && (!WHOLE.test(value.trim()) || Number(value) < 1) ? `${what} must be a whole number of at least 1.` : undefined;

const discountError = (value: string) => {
  const discount = value.trim();
  return !DISCOUNT.test(discount) || Number(discount) <= 0 || Number(discount) > PROMO_DISCOUNT_MAX
    ? 'Enter a percentage above 0 and below 100 (at most 99.99, two decimals).'
    : undefined;
};

const amountError = (value: string) => {
  const amount = value.trim();
  return !AMOUNT.test(amount) || Number(amount) <= 0 || Number(amount) > PROMO_AMOUNT_MAX
    ? `Enter an amount above ₹0 and at most ₹${PROMO_AMOUNT_MAX.toLocaleString('en-IN')} (two decimals).`
    : undefined;
};

/** Only the chosen kind of discount is checked (and sent). */
const discountErrors = (form: PromoForm): PromoFormErrors =>
  form.discountType === 'AMOUNT' ? { amountOff: amountError(form.amountOff) } : { discountPercentage: discountError(form.discountPercentage) };

const scopeErrors = (form: PromoForm): PromoFormErrors => {
  const errors: PromoFormErrors = {};
  if (form.customerScope === 'SELECTED' && form.customers.length === 0) errors.customerIds = 'Choose at least one customer.';
  if (form.customers.length > PROMO_SCOPE_MAX) errors.customerIds = `At most ${PROMO_SCOPE_MAX} customers per code.`;
  if (form.productScope === 'SELECTED' && form.products.length === 0) errors.products = 'Choose at least one product.';
  if (form.products.length > PROMO_SCOPE_MAX) errors.products = `At most ${PROMO_SCOPE_MAX} products per code.`;
  return errors;
};

/** A limit that must be typed (a custom or set number). */
const requiredLimitError = (value: string, what: string, missing: string) => (value.trim() ? limitError(value, what) : missing);

/** A chosen product set to a number of units: the number must be typed and at least 1. */
export const productUnitsError = (product: PromoFormProduct): string | undefined =>
  product.units === 'LIMITED' ? requiredLimitError(product.maxUnits, 'Units', 'Enter on how many units it works.') : undefined;

const productUnitsErrors = (form: PromoForm): PromoFormErrors => {
  if (form.productScope !== 'SELECTED') return {};
  const wrong = form.products.find((p) => productUnitsError(p));
  return wrong ? { products: `${wrong.title}: ${productUnitsError(wrong)}` } : {};
};

const limitErrors = (form: PromoForm): PromoFormErrors => {
  const errors: PromoFormErrors = {
    maxUnitsPerProduct: form.productScope === 'ALL' ? limitError(form.maxUnitsPerProduct, 'Units per product') : undefined,
    perCustomerCustom:
      form.perCustomer === 'CUSTOM' ? requiredLimitError(form.perCustomerCustom, 'Uses per customer', 'Enter how many times one customer may use it.') : undefined,
    totalLimit: form.total === 'LIMITED' ? requiredLimitError(form.totalLimit, 'Total uses', 'Enter how many times it may be used in all.') : undefined,
  };
  return errors;
};

const dateErrors = (form: PromoForm, creating: boolean, today: string): PromoFormErrors => {
  const expiresOn = expiryOf(form);
  const errors: PromoFormErrors = {};
  if (!form.startsOn) errors.startsOn = 'Choose the first day.';
  if (!expiresOn) errors.expiresOn = 'Choose the last day.';
  else if (form.startsOn && expiresOn < form.startsOn) errors.expiresOn = 'The last day cannot be before the first day.';
  else if (creating && expiresOn < today) errors.expiresOn = 'The last day cannot be in the past.';
  return errors;
};

/**
 * The server's rules (docs/promo-codes.md › Rules, Create / edit body), checked before sending. `checkCode` is false
 * on an edit: the code never changes once created. On create the last day can't be before today.
 */
export const validateForm = (form: PromoForm, { creating, checkCode, today }: { creating: boolean; checkCode: boolean; today: string }): PromoFormErrors => {
  const all: PromoFormErrors = {
    code: checkCode && !PROMO_CODE_PATTERN.test(form.code) ? 'Use TINQA followed by 3 to 15 capital letters or digits, e.g. TINQADIWALI26.' : undefined,
    ...discountErrors(form),
    ...productUnitsErrors(form),
    ...scopeErrors(form),
    ...limitErrors(form),
    ...dateErrors(form, creating, today),
  };
  return Object.fromEntries(Object.entries(all).filter(([, message]) => message)) as PromoFormErrors;
};

const limitOf = (value: string): number | null => (value.trim() ? Number(value.trim()) : null);

const perCustomerOf = (form: PromoForm): number | null => {
  if (form.perCustomer === 'ONCE') return 1;
  if (form.perCustomer === 'TWICE') return 2;
  if (form.perCustomer === 'UNLIMITED') return null;
  return limitOf(form.perCustomerCustom);
};

/**
 * The request body. "All units" and "unlimited" are sent as null; chosen ids only for a SELECTED scope; the units of
 * each product only for SELECTED products, the one number for all products only for ALL.
 */
export const toRequest = (form: PromoForm): PromoCodeRequest => ({
  code: form.code,
  description: form.description.trim(),
  discountType: form.discountType,
  discountPercentage: form.discountType === 'PERCENTAGE' ? Number(form.discountPercentage.trim()) : null,
  amountOff: form.discountType === 'AMOUNT' ? Number(form.amountOff.trim()) : null,
  customerScope: form.customerScope,
  customerIds: form.customerScope === 'SELECTED' ? form.customers.map((c) => c.id) : [],
  productScope: form.productScope,
  products:
    form.productScope === 'SELECTED' ? form.products.map((p) => ({ productId: p.id, maxUnits: p.units === 'LIMITED' ? limitOf(p.maxUnits) : null })) : [],
  maxUnitsPerProduct: form.productScope === 'ALL' ? limitOf(form.maxUnitsPerProduct) : null,
  usageLimitPerCustomer: perCustomerOf(form),
  totalUsageLimit: form.total === 'LIMITED' ? limitOf(form.totalLimit) : null,
  startsOn: form.startsOn,
  expiresOn: expiryOf(form),
  active: form.active,
});

/** "4 Nov 2026" for a YYYY-MM-DD date, without moving it across time zones. */
export const formatDay = (day: string | null | undefined): string => {
  if (!day) return '—';
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** "20%" or "₹200": what the code takes off each unit. */
export const discountLabel = (code: Pick<PromoCodeDetail, 'discountType' | 'discountPercentage' | 'amountOff'>) =>
  code.discountType === 'AMOUNT' ? rupees(Number(code.amountOff)) : `${code.discountPercentage}%`;

export const usesLabel = (limit: number | null) => {
  if (limit === null) return 'No limit';
  return limit === 1 ? 'One time' : `${limit} times`;
};
export const unitsLabel = (limit: number | null) => (limit === null ? 'Every unit' : `${limit} per product`);
/** A chosen product's units: "every unit" or "1 unit" / "3 units" per order. */
export const productUnitsLabel = (limit: number | null) => {
  if (limit === null) return 'every unit';
  return limit === 1 ? '1 unit' : `${limit} units`;
};
export const scopeLabel = (scope: PromoScope, count: number, noun: string) => {
  if (scope === 'ALL') return `All ${noun}s`;
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
};
