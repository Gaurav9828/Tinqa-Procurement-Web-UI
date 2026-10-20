/** Rupee formatting for the company account (amounts arrive in paise). */

const full = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** ₹1,23,456.78 (negative as −₹…). */
export const rupees = (paise: number | null | undefined): string => {
  if (paise === null || paise === undefined || !Number.isFinite(paise)) return '—';
  return full.format(paise / 100).replace('-', '−');
};

/** Compact Indian units for tiles and axes: ₹950, ₹12.4K, ₹3.2L, ₹1.05Cr. */
export const compactRupees = (paise: number | null | undefined): string => {
  if (paise === null || paise === undefined || !Number.isFinite(paise)) return '—';
  const value = paise / 100;
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  const trim = (n: number) => (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.?0+$/, '');
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}K`;
  return `${sign}${whole.format(abs)}`;
};

/** Rupees as a plain number for spreadsheets. */
export const toRupees = (paise: number): number => Math.round(paise) / 100;

export const percent = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(1)}%`;

/** Text tone for a signed amount: profit/inflow green, loss/outflow red. */
export const signTone = (paise: number): string =>
  paise > 0 ? 'text-emerald-600 dark:text-emerald-400' : paise < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500';
