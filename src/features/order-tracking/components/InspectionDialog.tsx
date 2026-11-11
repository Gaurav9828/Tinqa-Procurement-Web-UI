import React, { useState } from 'react';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { CommonInput, CommonTextArea } from '../../../components/ui/FormInputs';
import { DecencyHint } from '../../../components/ui/DecencyHint';
import { decencyError } from '../../../utils/decency';
import { withOffensiveFieldError } from '../../../utils/decencyField';
import { CHOICE_TONE, SOLID_TONE, type ActionTone } from '../../../components/ui/actionTones';
import { RefundDialogShell } from '../../refunds/components/RefundDialogShell';
import type { InspectionOutcome, OrderReturnInfo, ReturnInspectionRequest } from '../types/orderTracking.types';
import type { OrderMutationResult } from '../hooks/useOrderMutation';
import { formatCurrency } from '../utils/orderTracking.utils';
import { RETURN_TEXT_MAX_LENGTH, validateInspection, type InspectionInput } from '../utils/returnForms';

interface Props {
  orderNumber: string;
  returnInfo: OrderReturnInfo;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ReturnInspectionRequest) => Promise<OrderMutationResult>;
}

const OUTCOMES: { value: InspectionOutcome; label: string; tone: ActionTone; hint: string }[] = [
  { value: 'PASS', label: 'Pass', tone: 'approve', hint: 'Full refund requested for approval.' },
  { value: 'PARTIAL', label: 'Partial', tone: 'warning', hint: 'A lower refund, with the reason.' },
  { value: 'FAIL', label: 'Fail', tone: 'danger', hint: 'No refund; the item goes back to the customer.' },
];

const NOTE_LABEL: Record<InspectionOutcome, string> = {
  PASS: 'Note (optional)',
  PARTIAL: 'Why the refund is lower',
  FAIL: 'Why it failed inspection',
};

/** The returned item was checked: Pass / Partial request the refund (a Level 2 approves it), Fail sends it back. */
export const InspectionDialog: React.FC<Props> = ({ orderNumber, returnInfo, isSubmitting, onClose, onSubmit }) => {
  const [input, setInput] = useState<InspectionInput>({ outcome: '', refundAmount: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const deducted = returnInfo.settlement === 'DEDUCT' && Number(returnInfo.chargeAmount) > 0;
  const selected = OUTCOMES.find((o) => o.value === input.outcome);

  const set = (field: keyof InspectionInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const checked = validateInspection(input);
    if (checked.errors) {
      setErrors(checked.errors);
      return;
    }
    const result = await onSubmit(checked.payload);
    if (result.ok) onClose();
    else setErrors(withOffensiveFieldError(result.fieldErrors, result.errorCode, 'note'));
  };

  return (
    <RefundDialogShell title="Record inspection" subtitle={`Order ${orderNumber}`} disabled={isSubmitting} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate aria-label="Record inspection" className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          Pass refunds what the customer paid{deducted ? `, minus the ${formatCurrency(returnInfo.chargeAmount)} return charge` : ''}.
          The refund is requested here and approved by a Level 2 in the Refunds section.
        </p>
        <div>
          <div role="radiogroup" aria-label="Inspection result" className="grid grid-cols-3 gap-2">
            {OUTCOMES.map((outcome) => {
              const active = input.outcome === outcome.value;
              return (
                <button
                  key={outcome.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isSubmitting}
                  onClick={() => set('outcome', outcome.value)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                    active ? CHOICE_TONE[outcome.tone].active : CHOICE_TONE[outcome.tone].idle
                  }`}
                >
                  {outcome.label}
                </button>
              );
            })}
          </div>
          {selected && <p className="text-[10px] text-gray-400 px-1 mt-1">{selected.hint}</p>}
          {errors.outcome && <p className="text-[11px] text-red-500 font-medium mt-1">{errors.outcome}</p>}
        </div>
        {input.outcome === 'PARTIAL' && (
          <CommonInput
            label="Refund amount (₹)"
            aria-label="Refund amount"
            inputMode="decimal"
            required
            value={input.refundAmount}
            error={errors.refundAmount}
            disabled={isSubmitting}
            onChange={(e) => set('refundAmount', e.target.value)}
          />
        )}
        {input.outcome && (
          <div>
            <CommonTextArea
              label={NOTE_LABEL[input.outcome]}
              aria-label="Inspection note"
              required={input.outcome !== 'PASS'}
              rows={3}
              maxLength={RETURN_TEXT_MAX_LENGTH}
              value={input.note}
              error={errors.note || decencyError(input.note)}
              disabled={isSubmitting}
              onChange={(e) => set('note', e.target.value)}
            />
            <DecencyHint />
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !input.outcome}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed ${
              SOLID_TONE[selected?.tone ?? 'primary']
            }`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
            Record inspection
          </button>
        </div>
      </form>
    </RefundDialogShell>
  );
};
