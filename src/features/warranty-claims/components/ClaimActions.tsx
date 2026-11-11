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
  const [text, setText] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState('');
  const { isSubmitting, run } = useApiAction(() => {
    setText('');
    setDecision(null);
    onChanged();
  });
  const ref = claim.referenceNumber;

  if (claim.status === 'SUBMITTED' && can('WARRANTY_CLAIM_UPDATE')) {
    return (
      <form
        aria-label={`Review claim ${ref}`}
        className="space-y-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return setError('Write what you found (the diagnosis).');
          void run(() => warrantyClaimsApi.review(ref, text.trim()), { success: 'Sent for a decision.', failure: 'Could not save the review.' });
        }}
      >
        <CommonTextArea
          label="Diagnosis"
          aria-label="Diagnosis"
          rows={compact ? 2 : 4}
          maxLength={NOTE_MAX}
          value={text}
          error={error}
          disabled={isSubmitting}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
        />
        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting} className={`${button} ${SOLID_TONE.primary}`}>
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send for decision
          </button>
        </div>
      </form>
    );
  }

  if (claim.status === 'IN_REVIEW' && can('WARRANTY_CLAIM_DECIDE')) {
    if (isMe(claim.reviewedBy)) {
      return (
        <p role="status" className="text-[11px] text-amber-700 dark:text-amber-400">
          You reviewed this claim, so someone else must approve or reject it.
        </p>
      );
    }
    const choices: { value: Decision; label: string; tone: 'approve' | 'danger' }[] = [
      { value: 'REPAIR', label: 'Approve: repair', tone: 'approve' },
      { value: 'REPLACE', label: 'Approve: replace', tone: 'approve' },
      { value: 'REJECT', label: 'Reject', tone: 'danger' },
    ];
    return (
      <form
        aria-label={`Decide claim ${ref}`}
        className="space-y-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!decision) return setError('Choose repair, replace or reject.');
          if (decision === 'REJECT' && !text.trim()) return setError('Write the reason the customer will see.');
          void run(
            () =>
              warrantyClaimsApi.decide(ref, {
                approve: decision !== 'REJECT',
                resolution: decision === 'REJECT' ? null : decision,
                note: text.trim() || null,
              }),
            { success: decision === 'REJECT' ? 'Claim rejected.' : 'Claim approved.', failure: 'Could not save the decision.' }
          );
        }}
      >
        <div role="radiogroup" aria-label="Decision" className="flex flex-wrap gap-2">
          {choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={decision === choice.value}
              disabled={isSubmitting}
              onClick={() => {
                setDecision(choice.value);
                setError('');
              }}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                decision === choice.value ? CHOICE_TONE[choice.tone].active : CHOICE_TONE[choice.tone].idle
              }`}
            >
              {choice.label}
            </button>
          ))}
        </div>
        <CommonTextArea
          label={decision === 'REJECT' ? 'Reason (shown to the customer)' : 'Note for the customer (optional)'}
          aria-label="Decision note"
          rows={compact ? 2 : 3}
          maxLength={NOTE_MAX}
          value={text}
          error={error}
          disabled={isSubmitting}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !decision}
            className={`${button} ${decision === 'REJECT' ? SOLID_TONE.danger : SOLID_TONE.approve}`}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : decision === 'REJECT' ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {decision === 'REJECT' ? 'Reject claim' : 'Approve claim'}
          </button>
        </div>
      </form>
    );
  }

  if (claim.status === 'APPROVED' && can('WARRANTY_CLAIM_UPDATE')) {
    return (
      <form
        aria-label={`Resolve claim ${ref}`}
        className="space-y-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return setError('Write what was done (repaired, or replaced with serial …).');
          void run(() => warrantyClaimsApi.resolve(ref, text.trim()), { success: 'Claim resolved.', failure: 'Could not resolve the claim.' });
        }}
      >
        <CommonTextArea
          label="What was done"
          aria-label="Resolution note"
          rows={compact ? 2 : 3}
          maxLength={NOTE_MAX}
          value={text}
          error={error}
          disabled={isSubmitting}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
        />
        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting} className={`${button} ${SOLID_TONE.approve}`}>
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />} Mark resolved
          </button>
        </div>
      </form>
    );
  }

  return null;
};
