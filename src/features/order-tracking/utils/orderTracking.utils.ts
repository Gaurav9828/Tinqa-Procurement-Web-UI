import type { AdminOrderDetail, OrderItemSummary, OrderTrackingEntry } from '../types/orderTracking.types';

/** "OUT_FOR_DELIVERY" → "Out For Delivery" */
export const formatStatusLabel = (status: string | null | undefined): string =>
  (status || 'UNKNOWN')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const toTime = (iso: string | null | undefined) => {
  const time = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
};

/** History ordered oldest → newest (createdAt ascending), as the timeline displays it. */
export const sortTimeline = (entries: OrderTrackingEntry[] | null | undefined): OrderTrackingEntry[] =>
  [...(entries ?? [])].sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt) || a.id - b.id);

/** The entry flagged `current`, falling back to the most recent one. */
export const getCurrentEntry = (entries: OrderTrackingEntry[] | null | undefined): OrderTrackingEntry | null => {
  const sorted = sortTimeline(entries);
  return sorted.find((entry) => entry.current) ?? sorted[sorted.length - 1] ?? null;
};

/** "Smart Plug ×2, Bulb ×1 +3 more" */
export const summarizeItems = (items: OrderItemSummary[] | null | undefined, maxShown = 2): string => {
  const list = items ?? [];
  if (list.length === 0) return 'No items';
  const shown = list.slice(0, maxShown).map((item) => `${item.title} ×${item.quantity}`);
  const extra = list.length - shown.length;
  return extra > 0 ? `${shown.join(', ')} +${extra} more` : shown.join(', ');
};

export const formatCurrency = (amount: number | null | undefined): string =>
  amount === null || amount === undefined || Number.isNaN(Number(amount))
    ? '—'
    : `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** Label for audit attribution; older records predate updater tracking and carry null. */
export const UNKNOWN_UPDATER_LABEL = 'Unknown / historical update';

export const formatUpdater = (updatedBy: string | null | undefined): string =>
  updatedBy?.trim() ? updatedBy : UNKNOWN_UPDATER_LABEL;

/** Statuses that look final/irreversible to an admin and therefore require confirmation. */
export const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['CANCELLED', 'DELIVERED', 'RETURN_COMPLETED']);

/** Orders that carry pre-order lines (waiting or already approved) get a pre-order review card. */
export const hasPreOrderLines = (order: Pick<AdminOrderDetail, 'items'>) => (order.items ?? []).some((item) => item.preOrder);
