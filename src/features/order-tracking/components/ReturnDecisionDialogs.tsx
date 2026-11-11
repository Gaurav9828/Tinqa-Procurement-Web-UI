import React, { useState } from 'react';
import { CheckCircle2, Loader2, Pencil, XCircle } from 'lucide-react';
import { CommonTextArea } from '../../../components/ui/FormInputs';
import { DecencyHint } from '../../../components/ui/DecencyHint';
import { decencyError } from '../../../utils/decency';
import { withOffensiveFieldError } from '../../../utils/decencyField';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { RefundDialogShell } from '../../refunds/components/RefundDialogShell';
import type { RejectReturnRequest, ReturnChargeRequest } from '../types/orderTracking.types';
import type { OrderMutationResult } from '../hooks/useOrderMutation';
import { RETURN_TEXT_MAX_LENGTH, validateRejectReturn, validateReturnCharge, type ReturnChargeInput } from '../utils/returnForms';
import { ReturnChargeFields } from './ReturnChargeFields';

const CANCEL =
  'px-4 py-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-50 cursor-pointer';
const SUBMIT = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed';

interface ChargeProps {
  /** approve: a request becomes an enabled return. change: a new charge on an enabled return. */
  mode: 'approve' | 'change';
  orderNumber: string;
  orderAmount: number | null;
  shippingFee: number | null;
  /** The proposed (approve) or current (change) charge. */
  initialCharge: number | null;
  initialChargeReason: string | null;
  /** Shown when approving: the customer's own words, the staff note and who asked. */
  context?: React.ReactNode;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ReturnChargeRequest) => Promise<OrderMutationResult>;
}

const toInput = (charge: number | null, reason: string | null): ReturnChargeInput => ({
  charge: charge === null || charge === undefined ? '0' : String(charge),
  chargeReason: reason ?? '',
});

/** A Store Manager (RETURN_ENABLE) approves a request with the charge they decide, or changes an enabled return's charge. */
export const ReturnChargeDialog: React.FC<ChargeProps> = ({
  mode,
  orderNumber,
  orderAmount,
  shippingFee,
  initialCharge,
  initialChargeReason,
  context,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [input, setInput] = useState<ReturnChargeInput>(() => toInput(initialCharge, initialChargeReason));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const title = mode === 'approve' ? 'Approve return' : 'Change return charge';
  const SubmitIcon = mode === 'approve' ? CheckCircle2 : Pencil;

  const set = (field: keyof ReturnChargeInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field === 'charge' ? 'chargeAmount' : field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const checked = validateReturnCharge(input);
    if (checked.errors) {
      setErrors(checked.errors);
      return;
    }
    const result = await onSubmit(checked.payload);
    if (result.ok) onClose();
    else setErrors(withOffensiveFieldError(result.fieldErrors, result.errorCode, 'chargeReason'));
  };

  return (
    <RefundDialogShell title={title} subtitle={`Order ${orderNumber}`} disabled={isSubmitting} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate aria-label={title} className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          {mode === 'approve'
            ? 'The customer is emailed the charge and has 7 days to agree to it and start the return. You may change the proposed charge.'
            : 'The customer is emailed the new charge and must agree to it again before starting the return. The 7 days are not extended.'}
        </p>
        {context}
        <ReturnChargeFields input={input} errors={errors} disabled={isSubmitting} onChange={set} orderAmount={orderAmount} shippingFee={shippingFee} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className={CANCEL}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className={`${SUBMIT} ${mode === 'approve' ? SOLID_TONE.approve : SOLID_TONE.warning}`}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SubmitIcon className="w-4 h-4" />}
            {mode === 'approve' ? 'Approve and enable' : 'Save new charge'}
          </button>
        </div>
      </form>
    </RefundDialogShell>
  );
};

interface RejectProps {
  orderNumber: string;
  /** The request being turned down: the customer's own words and the staff note. */
  context?: React.ReactNode;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: RejectReturnRequest) => Promise<OrderMutationResult>;
}

/** A Store Manager turns a request down; the reason is emailed to the customer. */
export const RejectReturnDialog: React.FC<RejectProps> = ({ orderNumber, context, isSubmitting, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const checked = validateRejectReturn(reason);
    if (checked.errors) {
      setError(checked.errors.reason);
      return;
    }
    const result = await onSubmit(checked.payload);
    if (result.ok) onClose();
    else setError(withOffensiveFieldError(result.fieldErrors, result.errorCode, 'reason').reason ?? '');
  };

  return (
    <RefundDialogShell title="Reject return request" subtitle={`Order ${orderNumber}`} disabled={isSubmitting} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate aria-label="Reject return request" className="space-y-4">
        {context}
        <div>
          <CommonTextArea
            label="Reason (emailed to the customer)"
            required
            rows={3}
            maxLength={RETURN_TEXT_MAX_LENGTH}
            value={reason}
            error={error || decencyError(reason)}
            disabled={isSubmitting}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
          />
          <DecencyHint />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className={CANCEL}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className={`${SUBMIT} ${SOLID_TONE.danger}`}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject request
          </button>
        </div>
      </form>
    </RefundDialogShell>
  );
};
