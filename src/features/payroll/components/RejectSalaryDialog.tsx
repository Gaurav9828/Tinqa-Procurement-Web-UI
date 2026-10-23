import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CommonTextArea } from '../../../components/ui/FormInputs';
import { DialogShell } from '../../finance/components/DialogShell';
import { SOLID_TONE } from '../../../components/ui/actionTones';

const MAX = 500;

/** Rejects recorded salaries with a reason the recorder sees; they can record them again once corrected. */
export const RejectSalaryDialog: React.FC<{
  subtitle: React.ReactNode;
  isSubmitting: boolean;
  onClose: () => void;
  onReject: (reason: string) => Promise<boolean>;
}> = ({ subtitle, isSubmitting, onClose, onReject }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (reason.trim().length < 3) {
      setError('Say why, in at least 3 characters (e.g. wrong amount, not transferred yet).');
      return;
    }
    if (await onReject(reason.trim())) onClose();
  };

  return (
    <DialogShell title="Reject salary" subtitle={subtitle} disabled={isSubmitting} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Reject salary">
        <CommonTextArea label="Reason" aria-label="Reason" required rows={3} maxLength={MAX} value={reason} error={error}
          disabled={isSubmitting} onChange={(e) => { setReason(e.target.value); setError(''); }}
          placeholder="e.g. The bank shows a different amount" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white font-semibold cursor-pointer disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE.danger}`}>
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Reject
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
