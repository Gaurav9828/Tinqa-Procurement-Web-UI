import React, { useState } from 'react';
import { CheckCircle2, Loader2, Send, Wrench, XCircle } from 'lucide-react';
import { CommonTextArea } from '../../../components/ui/FormInputs';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useIsMe } from '../../order-tracking/hooks/useIsMe';
import { warrantyClaimsApi } from '../api/warrantyClaimsApi';
import type { WarrantyClaim, WarrantyResolution } from '../types/warrantyClaim.types';

const NOTE_MAX = 2000;
const button = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

type Decision = WarrantyResolution | 'REJECT';

interface StepProps {
  claim: WarrantyClaim;
  onChanged: () => void;
  compact: boolean;
}

/** A note box with its own error and the step's action; the three steps differ only in labels and the call. */
const useNoteForm = (onChanged: () => void) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const action = useApiAction(() => {
    setText('');
    onChanged();
  });
  const textArea = (label: string, ariaLabel: string, rows: number) => (
    <CommonTextArea
      label={label}
      aria-label={ariaLabel}
      rows={rows}
      maxLength={NOTE_MAX}
      value={text}
      error={error}
      disabled={action.isSubmitting}
      onChange={(e) => {
        setText(e.target.value);
        setError('');
      }}
    />
  );
  return { text: text.trim(), setError, textArea, ...action };
};

/** New: customer care writes the diagnosis (WARRANTY_CLAIM_UPDATE), and the claim waits for a decision. */
const ReviewForm: React.FC<StepProps> = ({ claim, onChanged, compact }) => {
  const form = useNoteForm(onChanged);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text) return form.setError('Write what you found (the diagnosis).');
    void form.run(() => warrantyClaimsApi.review(claim.referenceNumber, form.text), {
      success: 'Sent for a decision.',
      failure: 'Could not save the review.',
    });
  };
  return (
    <form aria-label={`Review claim ${claim.referenceNumber}`} className="space-y-2" noValidate onSubmit={submit}>
      {form.textArea('Diagnosis', 'Diagnosis', compact ? 2 : 4)}
      <div className="flex justify-end">
        <button type="submit" disabled={form.isSubmitting} className={`${button} ${SOLID_TONE.primary}`}>
          {form.isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send for decision
        </button>
      </div>
    </form>
  );
};

const CHOICES: { value: Decision; label: string; tone: 'approve' | 'danger' }[] = [
  { value: 'REPAIR', label: 'Approve: repair', tone: 'approve' },
  { value: 'REPLACE', label: 'Approve: replace', tone: 'approve' },
  { value: 'REJECT', label: 'Reject', tone: 'danger' },
];

/** Waiting for decision: approve as a repair or a replacement, or reject with the reason the customer sees. */
const DecisionForm: React.FC<StepProps> = ({ claim, onChanged, compact }) => {
  const form = useNoteForm(onChanged);
  const [decision, setDecision] = useState<Decision | null>(null);
  const rejecting = decision === 'REJECT';
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision) return form.setError('Choose repair, replace or reject.');
    if (rejecting && !form.text) return form.setError('Write the reason the customer will see.');
    void form.run(
      () =>
        warrantyClaimsApi.decide(claim.referenceNumber, {
          approve: !rejecting,
          resolution: rejecting ? null : decision,
          note: form.text || null,
        }),
      { success: rejecting ? 'Claim rejected.' : 'Claim approved.', failure: 'Could not save the decision.' }
    );
  };
  const ActionIcon = rejecting ? XCircle : CheckCircle2;
  return (
    <form aria-label={`Decide claim ${claim.referenceNumber}`} className="space-y-2" noValidate onSubmit={submit}>
      <div role="radiogroup" aria-label="Decision" className="flex flex-wrap gap-2">
        {CHOICES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={decision === choice.value}
            disabled={form.isSubmitting}
            onClick={() => {
              setDecision(choice.value);
              form.setError('');
            }}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
              decision === choice.value ? CHOICE_TONE[choice.tone].active : CHOICE_TONE[choice.tone].idle
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {form.textArea(rejecting ? 'Reason (shown to the customer)' : 'Note for the customer (optional)', 'Decision note', compact ? 2 : 3)}
      <div className="flex justify-end">
        <button type="submit" disabled={form.isSubmitting || !decision} className={`${button} ${rejecting ? SOLID_TONE.danger : SOLID_TONE.approve}`}>
          {form.isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ActionIcon className="w-3.5 h-3.5" />}
          {rejecting ? 'Reject claim' : 'Approve claim'}
        </button>
      </div>
    </form>
  );
};

/** Approved: once the unit is repaired or replaced, mark it resolved with what was done. */
const ResolveForm: React.FC<StepProps> = ({ claim, onChanged, compact }) => {
  const form = useNoteForm(onChanged);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text) return form.setError('Write what was done (repaired, or replaced with serial …).');
    void form.run(() => warrantyClaimsApi.resolve(claim.referenceNumber, form.text), {
      success: 'Claim resolved.',
      failure: 'Could not resolve the claim.',
    });
  };
  return (
    <form aria-label={`Resolve claim ${claim.referenceNumber}`} className="space-y-2" noValidate onSubmit={submit}>
      {form.textArea('What was done', 'Resolution note', compact ? 2 : 3)}
      <div className="flex justify-end">
        <button type="submit" disabled={form.isSubmitting} className={`${button} ${SOLID_TONE.approve}`}>
          {form.isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />} Mark resolved
        </button>
      </div>
    </form>
  );
};

/**
 * The next step of a claim, for whoever may take it:
 * - New: customer care writes the diagnosis (WARRANTY_CLAIM_UPDATE), and the claim waits for a decision.
 * - Waiting for decision: someone with WARRANTY_CLAIM_DECIDE other than the reviewer approves it (repair or replace)
 *   or rejects it with the reason the customer is shown.
 * - Approved: once the unit is repaired or replaced, it is marked resolved with what was done.
 */
export const ClaimActions: React.FC<{ claim: WarrantyClaim; onChanged: () => void; compact?: boolean }> = ({ claim, onChanged, compact = false }) => {
  const { can } = useAccess();
  const isMe = useIsMe();
  const props = { claim, onChanged, compact };
  if (claim.status === 'SUBMITTED' && can('WARRANTY_CLAIM_UPDATE')) return <ReviewForm {...props} />;
  if (claim.status === 'APPROVED' && can('WARRANTY_CLAIM_UPDATE')) return <ResolveForm {...props} />;
  if (claim.status !== 'IN_REVIEW' || !can('WARRANTY_CLAIM_DECIDE')) return null;
  if (isMe(claim.reviewedBy)) {
    return (
      <p role="status" className="text-[11px] text-amber-700 dark:text-amber-400">
        You reviewed this claim, so someone else must approve or reject it.
      </p>
    );
  }
  return <DecisionForm {...props} />;
};
