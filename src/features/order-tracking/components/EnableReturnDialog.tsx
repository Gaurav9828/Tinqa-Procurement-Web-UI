import React, { useMemo, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { CommonTextArea } from '../../../components/ui/FormInputs';
import { DecencyHint } from '../../../components/ui/DecencyHint';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { decencyError } from '../../../utils/decency';
import { withOffensiveFieldError } from '../../../utils/decencyField';
import { RefundDialogShell } from '../../refunds/components/RefundDialogShell';
import type { EnableReturnRequest, ReturnTicketContext, ReturnTicketMessage } from '../types/orderTracking.types';
import type { OrderMutationResult } from '../hooks/useOrderMutation';
import { formatDateTime } from '../utils/orderTracking.utils';
import { RETURN_TEXT_MAX_LENGTH, validateEnableReturn, type EnableReturnInput } from '../utils/returnForms';
import { ReturnChargeFields } from './ReturnChargeFields';

interface Props {
  orderNumber: string;
  /** The order's subtotal: what a return can refund. Shipping is never part of it. */
  orderAmount: number | null;
  shippingFee: number | null;
  /** The customer's support ticket about this order: their reason is one of their messages in it. */
  ticket: ReturnTicketContext;
  /** Prefill when updating a request that is still waiting. */
  initial?: Partial<EnableReturnInput>;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: EnableReturnRequest) => Promise<OrderMutationResult>;
}

const TITLE = 'Request return';

const time = (iso: string) => {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/** The customer's own messages in the ticket, newest first. */
const customerMessages = (messages: ReturnTicketMessage[] | null | undefined): ReturnTicketMessage[] =>
  (messages ?? []).filter((m) => m.authorType === 'CUSTOMER').sort((a, b) => time(b.createdAt) - time(a.createdAt) || b.id - a.id);

/**
 * Customer Support (REFUND_REQUEST) asks a Store Manager for a return, from the customer's support ticket. The customer's
 * reason is never typed by staff: they pick one of the customer's own messages in the ticket (the latest is
 * preselected), and its text goes to the Store Manager exactly as the customer wrote it. Staff propose a charge and may
 * add an internal note. A Store Manager approves (possibly with another charge) or rejects it.
 */
export const EnableReturnDialog: React.FC<Props> = ({ orderNumber, orderAmount, shippingFee, ticket, initial, isSubmitting, onClose, onSubmit }) => {
  const choices = useMemo(() => customerMessages(ticket.messages), [ticket.messages]);
  const [input, setInput] = useState<EnableReturnInput>(() => {
    const keep = initial?.customerMessageId;
    return {
      charge: '0',
      chargeReason: '',
      staffNote: '',
      ...initial,
      customerMessageId: keep !== undefined && keep !== null && choices.some((m) => m.id === keep) ? keep : (choices[0]?.id ?? null),
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: keyof EnableReturnInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field === 'charge' ? 'chargeAmount' : field]: '' }));
  };

  const pick = (id: number) => {
    setInput((prev) => ({ ...prev, customerMessageId: id }));
    setErrors((prev) => ({ ...prev, customerMessageId: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const checked = validateEnableReturn(input, ticket.referenceNumber);
    if (checked.errors) {
      setErrors(checked.errors);
      return;
    }
    const result = await onSubmit(checked.payload);
    if (result.ok) onClose();
    else setErrors(withOffensiveFieldError(result.fieldErrors, result.errorCode, 'staffNote'));
  };

  const noteError = errors.staffNote || decencyError(input.staffNote);

  return (
    <RefundDialogShell title={TITLE} subtitle={`Order ${orderNumber} · ticket ${ticket.referenceNumber}`} disabled={isSubmitting} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate aria-label={TITLE} className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">
          A Store Manager approves the return and may change the charge you propose. The customer is emailed that their request is being reviewed.
        </p>
        {errors.ticketReference && (
          <p role="alert" className="text-red-500 font-medium">
            {errors.ticketReference}
          </p>
        )}
        <fieldset className="space-y-2" aria-describedby="customer-words-help">
          <legend className="text-xs font-semibold text-black dark:text-white">
            Customer's reason — their own words, sent to the Store Manager as written <span className="text-red-500">*</span>
          </legend>
          <p id="customer-words-help" className="text-[10px] text-gray-400">
            Pick the customer's message in this ticket that explains why they want to return it. Its text can't be edited.
          </p>
          {choices.length === 0 ? (
            <p role="status" className="text-amber-700 dark:text-amber-400">
              The customer hasn't written in this ticket yet. Ask them to reply here with their reason, then request the return.
            </p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {choices.map((m) => {
                const checked = input.customerMessageId === m.id;
                return (
                  <li key={m.id}>
                    <label
                      className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${
                        checked ? 'border-purple-500/60 bg-purple-500/5' : 'border-black/10 dark:border-white/10'
                      }`}
                    >
                      <input
                        type="radio"
                        name="customer-message"
                        value={m.id}
                        checked={checked}
                        disabled={isSubmitting}
                        onChange={() => pick(m.id)}
                        className="mt-0.5 accent-purple-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-[10px] text-gray-400">{formatDateTime(m.createdAt)}</span>
                        <span className="block text-black dark:text-white whitespace-pre-line break-words">{m.message}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {errors.customerMessageId && <p className="text-[11px] text-red-500 font-medium">{errors.customerMessageId}</p>}
        </fieldset>
        <ReturnChargeFields input={input} errors={errors} disabled={isSubmitting} onChange={set} orderAmount={orderAmount} shippingFee={shippingFee} />
        <div>
          <CommonTextArea
            label="Note for the Store Manager (optional, internal)"
            aria-label="Staff note"
            rows={2}
            maxLength={RETURN_TEXT_MAX_LENGTH}
            value={input.staffNote}
            error={noteError}
            disabled={isSubmitting}
            onChange={(e) => set('staffNote', e.target.value)}
          />
          <DecencyHint />
        </div>
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
            disabled={isSubmitting || choices.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed ${SOLID_TONE.primary}`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {TITLE}
          </button>
        </div>
      </form>
    </RefundDialogShell>
  );
};
