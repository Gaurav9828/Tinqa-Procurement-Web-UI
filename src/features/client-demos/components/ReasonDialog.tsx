import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CommonTextArea } from '../../../components/ui/FormInputs';
import { DialogShell } from '../../finance/components/DialogShell';
import { SOLID_TONE, type ActionTone } from '../../../components/ui/actionTones';

/**
 * Asks for the text an action needs (a reason, the visit's outcome) and runs it. `required` blocks an empty answer;
 * the dialog closes only when the action succeeded.
 */
export const ReasonDialog: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  tone: ActionTone;
  required?: boolean;
  maxLength?: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (text: string) => Promise<boolean>;
}> = ({ title, subtitle, label, placeholder, confirmLabel, tone, required = true, maxLength = 500, isSubmitting, onClose, onConfirm }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (required && !text.trim()) {
      setError(`${label} is required.`);
      return;
    }
    if (await onConfirm(text.trim())) onClose();
  };

  return (
    <DialogShell title={title} subtitle={subtitle} disabled={isSubmitting} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <CommonTextArea
          label={label}
          required={required}
          value={text}
          maxLength={maxLength}
          placeholder={placeholder}
          error={error}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 font-semibold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            Back
          </button>
          <button type="submit" disabled={isSubmitting}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE[tone]}`}>
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
