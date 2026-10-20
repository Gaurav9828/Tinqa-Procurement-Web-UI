import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CommonTextArea } from '../../../components/ui/FormInputs';
import { DialogShell } from './DialogShell';
import type { VoucherActionResult } from '../hooks/useVoucherActions';

const MAX = 500;

/** Approve (comment optional), reject or reverse (reason required, 3–500 characters). */
export const CommentDialog: React.FC<{
  title: string;
  subtitle: React.ReactNode;
  label: string;
  hint: string;
  confirmLabel: string;
  required: boolean;
  tone: 'approve' | 'danger';
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<VoucherActionResult>;
}> = ({ title, subtitle, label, hint, confirmLabel, required, tone, isSubmitting, onClose, onSubmit }) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const text = comment.trim();
    if (required && text.length < 3) {
      setError(`${label} must be at least 3 characters.`);
      return;
    }
    const result = await onSubmit(text);
    if (result.ok) onClose();
    else if (result.fieldErrors.comment) setError(result.fieldErrors.comment);
    else onClose();
  };

  return (
    <DialogShell title={title} subtitle={subtitle} disabled={isSubmitting} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label={title}>
        <div>
          <CommonTextArea
            label={required ? label : `${label} (optional)`}
            aria-label={label}
            required={required}
            rows={3}
            maxLength={MAX}
            value={comment}
            disabled={isSubmitting}
            error={error}
            onChange={(e) => {
              setComment(e.target.value);
              setError('');
            }}
          />
          <p className="text-[10px] text-gray-400 px-1 mt-1 flex justify-between gap-2">
            <span>{hint}</span>
            <span className="shrink-0">{comment.length}/{MAX}</span>
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white font-semibold cursor-pointer disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold cursor-pointer disabled:opacity-60 ${
              tone === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}>
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
