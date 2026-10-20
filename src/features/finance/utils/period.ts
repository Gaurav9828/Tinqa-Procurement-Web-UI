import type { Period } from '../types/finance.types';

export type PeriodPreset = 'THIS_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'LAST_12_MONTHS' | 'THIS_FY' | 'LAST_FY' | 'ALL_TIME' | 'CUSTOM';

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'THIS_MONTH', label: 'This month' },
  { id: 'LAST_3_MONTHS', label: 'Last 3 months' },
  { id: 'LAST_6_MONTHS', label: 'Last 6 months' },
  { id: 'LAST_12_MONTHS', label: 'Last 12 months' },
  { id: 'THIS_FY', label: 'This financial year' },
  { id: 'LAST_FY', label: 'Last financial year' },
  { id: 'ALL_TIME', label: 'Since the first entry' },
  { id: 'CUSTOM', label: 'Custom range' },
];

/** yyyy-mm-dd in local time (never UTC: a late-evening IST date must not slip a day). */
export const isoDate = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const monthStart = (date: Date, monthsBack: number) => new Date(date.getFullYear(), date.getMonth() - monthsBack, 1);

/** Indian financial year: 1 April – 31 March. */
const fyStart = (date: Date) => new Date(date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1, 3, 1);

export const presetPeriod = (preset: PeriodPreset, firstEntryOn?: string | null, today = new Date()): Period | null => {
  const to = isoDate(today);
  switch (preset) {
    case 'THIS_MONTH':
      return { from: isoDate(monthStart(today, 0)), to };
    case 'LAST_3_MONTHS':
      return { from: isoDate(monthStart(today, 2)), to };
    case 'LAST_6_MONTHS':
      return { from: isoDate(monthStart(today, 5)), to };
    case 'LAST_12_MONTHS':
      return { from: isoDate(monthStart(today, 11)), to };
    case 'THIS_FY':
      return { from: isoDate(fyStart(today)), to };
    case 'LAST_FY': {
      const start = fyStart(today);
      return { from: isoDate(new Date(start.getFullYear() - 1, 3, 1)), to: isoDate(new Date(start.getFullYear(), 2, 31)) };
    }
    case 'ALL_TIME':
      return { from: firstEntryOn && firstEntryOn < to ? firstEntryOn : isoDate(monthStart(today, 0)), to };
    default:
      return null;
  }
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const periodLabel = (period: Period) => `${formatDate(period.from)} – ${formatDate(period.to)}`;
