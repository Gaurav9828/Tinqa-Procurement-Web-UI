/**
 * Colour rule for actions across the app, so a user can tell at a glance what a button does:
 * approve / confirm / positive → green, reject / delete / cancel / destructive → red,
 * neutral or informational → blue, caution (deactivate, hold) → amber.
 */
export type ActionTone = 'approve' | 'danger' | 'primary' | 'warning' | 'neutral';

/** Solid buttons for the action itself (Approve, Reject, Delete…). */
export const SOLID_TONE: Record<ActionTone, string> = {
  approve: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  primary: 'bg-[#0071e3] hover:bg-[#0077ed] text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  neutral: 'bg-gray-700 hover:bg-gray-800 text-white',
};

/**
 * Selectable choices (decision radios, segmented options). Unselected choices are already
 * tinted in their colour so they read as actions; the selected one is filled solid.
 */
export const CHOICE_TONE: Record<ActionTone, { idle: string; active: string }> = {
  approve: {
    idle: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20',
    active: 'border-emerald-600 bg-emerald-600 text-white shadow-sm',
  },
  danger: {
    idle: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20',
    active: 'border-rose-600 bg-rose-600 text-white shadow-sm',
  },
  primary: {
    idle: 'border-[#0071e3]/40 bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/20',
    active: 'border-[#0071e3] bg-[#0071e3] text-white shadow-sm',
  },
  warning: {
    idle: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20',
    active: 'border-amber-500 bg-amber-500 text-white shadow-sm',
  },
  neutral: {
    idle: 'border-gray-500/40 bg-gray-500/10 text-gray-700 dark:text-gray-300 hover:bg-gray-500/20',
    active: 'border-gray-700 bg-gray-700 text-white shadow-sm',
  },
};

/** Small icon-only delete / remove buttons (trash cans in rows and lists). */
export const ICON_DANGER = 'text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 dark:text-rose-400';
