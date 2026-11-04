import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { PromoStatus } from '../types/promoCode.types';
import { STATUS_META } from '../utils/promoCodeForm';
import { CHOICE_TONE } from '../../../components/ui/actionTones';

export const PromoStatusChip: React.FC<{ status: PromoStatus }> = ({ status }) => {
  const meta = STATUS_META[status] ?? STATUS_META.ACTIVE;
  return (
    <span title={meta.hint} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${meta.tone}`}>
      {meta.label}
    </span>
  );
};

/** A centred dialog; Escape and the close button close it unless `busy`. */
export const PromoDialog: React.FC<{
  label: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  busy?: boolean;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ label, title, subtitle, busy, wide, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto shadow-2xl text-xs p-6 space-y-4`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-black dark:text-white">{title}</h2>
            {subtitle && <div className="text-gray-500 mt-0.5">{subtitle}</div>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} disabled={busy} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/** A removable chip (chosen customer or product). */
export const RemovableChip: React.FC<{ label: string; detail?: string; onRemove: () => void }> = ({ label, detail, onRemove }) => (
  <li className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-300 text-[11px] font-medium">
    <span title={detail}>{label}</span>
    <button
      type="button"
      aria-label={`Remove ${label}`}
      onClick={onRemove}
      className="p-0.5 rounded-full text-rose-600 hover:bg-rose-500/15 dark:text-rose-400 cursor-pointer"
    >
      <X className="w-3 h-3" />
    </button>
  </li>
);

/** A row of segmented choices (radio semantics). */
export const ChoiceGroup = <V extends string>({
  label,
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (value: V) => void;
  disabled?: boolean;
}) => (
  <fieldset className="space-y-1.5" disabled={disabled}>
    <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</legend>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
            value === option.value ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle
          }`}
        >
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="sr-only" />
          {option.label}
        </label>
      ))}
    </div>
  </fieldset>
);

export const FieldError: React.FC<{ id?: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="text-[11px] text-red-500 font-medium">
      {message}
    </p>
  ) : null;
