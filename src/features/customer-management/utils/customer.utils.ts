import type { TicketSummary } from '../../support-tickets/types/supportTicket.types';
import type { CustomerUpdatePayload } from '../api/customersApi';
import type {
  CustomerCartItem,
  CustomerDetail,
  CustomerEditForm,
  CustomerField,
  CustomerOrder,
} from '../types/customer.types';

export const CUSTOMERS_PATH = '/customers';
export const customerPath = (customerId: number) => `${CUSTOMERS_PATH}/${customerId}`;

export const CUSTOMERS_PAGE_SIZE = 20;
export const CUSTOMER_ORDERS_PAGE_SIZE = 10;
/** The latest tickets shown on a customer's page (all of them are in Support Tickets). */
export const CUSTOMER_TICKETS_SIZE = 20;
export const CUSTOMER_SEARCH_MAX_LENGTH = 100;
export const REASON_MIN_LENGTH = 3;
export const REASON_MAX_LENGTH = 500;

export const FIELD_LABELS: Record<CustomerField, string> = {
  FIRST_NAME: 'First name',
  MIDDLE_NAME: 'Middle name',
  LAST_NAME: 'Last name',
  PHONE_NUMBER: 'Phone number',
  DOB: 'Date of birth',
  GENDER: 'Gender',
};

// Same rules as the backends (CustomerUpdateRequestDTO), so mistakes show before a request is sent.
const NAME_PATTERN = /^[a-zA-ZÀ-ÿ\s'-]*$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,15}$/;

const FORM_KEYS: Record<CustomerField, keyof CustomerEditForm> = {
  FIRST_NAME: 'firstName',
  MIDDLE_NAME: 'middleName',
  LAST_NAME: 'lastName',
  PHONE_NUMBER: 'phoneNumber',
  DOB: 'dob',
  GENDER: 'gender',
};

export const toEditForm = (customer: CustomerDetail): CustomerEditForm => ({
  firstName: customer.firstName ?? '',
  middleName: customer.middleName ?? '',
  lastName: customer.lastName ?? '',
  phoneNumber: customer.phoneNumber ?? '',
  dob: customer.dob ?? '',
  gender: customer.gender ?? 'MALE',
  reason: '',
});

/** The fields whose value in the form differs from the customer's, with the new (trimmed) value. */
export const changedFields = (customer: CustomerDetail, form: CustomerEditForm): Partial<Record<CustomerField, string>> => {
  const current = toEditForm(customer);
  const changes: Partial<Record<CustomerField, string>> = {};
  (Object.keys(FORM_KEYS) as CustomerField[]).forEach((field) => {
    const key = FORM_KEYS[field];
    const next = form[key].trim();
    if (next !== current[key].trim()) changes[field] = next;
  });
  return changes;
};

/** Field errors keyed by form field; empty when the form can be sent. */
export const validateEditForm = (
  form: CustomerEditForm,
  changes: Partial<Record<CustomerField, string>>,
  today: string = new Date().toISOString().slice(0, 10)
): Partial<Record<keyof CustomerEditForm | 'changes', string>> => {
  const errors: Partial<Record<keyof CustomerEditForm | 'changes', string>> = {};
  const name = (key: 'firstName' | 'lastName', label: string) => {
    const value = form[key].trim();
    if (value.length < 2 || value.length > 50) errors[key] = `${label} must be 2-50 characters.`;
    else if (!NAME_PATTERN.test(value)) errors[key] = `${label} contains invalid characters.`;
  };
  name('firstName', 'First name');
  name('lastName', 'Last name');
  const middle = form.middleName.trim();
  if (middle.length > 50) errors.middleName = 'Middle name cannot exceed 50 characters.';
  else if (!NAME_PATTERN.test(middle)) errors.middleName = 'Middle name contains invalid characters.';
  if (!PHONE_PATTERN.test(form.phoneNumber.trim())) errors.phoneNumber = 'Enter a valid phone number.';
  if (form.dob && form.dob >= today) errors.dob = 'Date of birth must be in the past.';
  else if (changes.DOB === '') errors.dob = 'Date of birth cannot be removed.';
  const reason = form.reason.trim();
  if (reason.length < REASON_MIN_LENGTH || reason.length > REASON_MAX_LENGTH) {
    errors.reason = `Reason must be ${REASON_MIN_LENGTH}-${REASON_MAX_LENGTH} characters.`;
  }
  if (Object.keys(changes).length === 0) errors.changes = 'Change at least one detail.';
  return errors;
};

export const toUpdatePayload = (changes: Partial<Record<CustomerField, string>>, reason: string): CustomerUpdatePayload => {
  const payload: CustomerUpdatePayload = { reason: reason.trim() };
  (Object.entries(changes) as [CustomerField, string][]).forEach(([field, value]) => {
    payload[FORM_KEYS[field] as Exclude<keyof CustomerUpdatePayload, 'reason'>] = value;
  });
  return payload;
};

export const formatStatus = (status: string | null | undefined) =>
  (status ?? '').toUpperCase() === 'DELETED' ? 'Account closed' : 'Active';

export interface TimelineEvent {
  at: string;
  kind: 'registered' | 'order' | 'cart' | 'ticket';
  title: string;
  detail?: string;
  /** In-app route with more about it. */
  link?: string;
}

const describeItems = (order: CustomerOrder) =>
  order.items.map((item) => `${item.title} × ${item.quantity}`).join(', ');

/**
 * Everything the customer did that this page has loaded, newest first: registering, each order (with what they
 * bought), what they put in their cart and the tickets they raised.
 */
export const buildTimeline = (
  customer: CustomerDetail,
  orders: CustomerOrder[],
  cart: CustomerCartItem[],
  tickets: TicketSummary[],
  /** Route builders for what the viewer may open; without one the event is not a link. */
  links: { order?: (orderNumber: string) => string; ticket?: (referenceNumber: string) => string }
): TimelineEvent[] => {
  const events: TimelineEvent[] = [
    {
      at: customer.registeredAt,
      kind: 'registered',
      title: customer.registeredBy ? `Registered at a store by ${customer.registeredBy}` : 'Signed up on the storefront',
    },
    ...orders.map<TimelineEvent>((order) => ({
      at: order.placedAt,
      kind: 'order',
      title: `Placed order #${order.orderNumber}`,
      detail: describeItems(order),
      link: links.order?.(order.orderNumber),
    })),
    ...cart
      .filter((item) => !!item.addedAt)
      .map<TimelineEvent>((item) => ({
        at: item.addedAt!,
        kind: 'cart',
        title: `Added ${item.title} to cart`,
        detail: `Quantity ${item.quantity}, not ordered yet`,
      })),
    ...tickets.map<TimelineEvent>((ticket) => ({
      at: ticket.createdAt,
      kind: 'ticket',
      title: `Raised ticket ${ticket.referenceNumber}`,
      detail: ticket.subject,
      link: links.ticket?.(ticket.referenceNumber),
    })),
  ];
  // ISO timestamps sort as text
  return events.filter((event) => !!event.at).sort((a, b) => b.at.localeCompare(a.at));
};
