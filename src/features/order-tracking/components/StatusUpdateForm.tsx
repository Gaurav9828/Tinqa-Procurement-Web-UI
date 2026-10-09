import React, { useMemo, useState } from 'react';
import { ClipboardEdit, CreditCard, Loader2, Lock, MapPinned, RefreshCw, Send } from 'lucide-react';
import { CommonSelect, CommonTextArea } from '../../../components/ui/FormInputs';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import type { StatusUpdateMode, TrackingStatusOption } from '../types/orderTracking.types';
import { TERMINAL_STATUSES, formatStatusLabel } from '../utils/orderTracking.utils';
import { STATUS_NOTES_MAX_LENGTH, type StatusUpdateResult } from '../hooks/useStatusUpdate';
import {
  STAGE_LABELS,
  getAllowedStatuses,
  getLockReason,
  getPaymentBlockReason,
  getStage,
  isConfirmBlockedByPayment,
  isCorrection,
  type WorkflowContext,
} from '../utils/statusWorkflow';

interface Props {
  orderNumber: string;
  /** From GET /admin/orders/tracking-statuses. */
  statuses: TrackingStatusOption[];
  statusesLoading: boolean;
  statusesError: boolean;
  onRetryStatuses: () => void;
  /** Current and previous status, which decide the allowed next steps. */
  workflow: WorkflowContext;
  isSubmitting: boolean;
  onSubmit: (mode: StatusUpdateMode, orderNumber: string, status: string, notes: string) => Promise<StatusUpdateResult>;
}

const MODES: Record<StatusUpdateMode, { label: string; icon: React.ElementType; help: string; button: string; notesHint: string }> = {
  tracking: {
    label: 'Update tracking',
    icon: MapPinned,
    help: 'Record the next step in the order\'s journey. Only the steps that can follow the current stage are offered.',
    button: 'Add tracking event',
    notesHint: 'Optional — shown in the tracking history.',
  },
  manual: {
    label: 'Manually update order status',
    icon: ClipboardEdit,
    help: 'Administrative change for corrections. Offers the same next steps, plus undoing the last step while the order has not shipped. Recorded in the history under your name.',
    button: 'Set order status',
    notesHint: 'Optional reason. If left blank the server records "Order status manually updated by admin."',
  },
};

/**
 * One form, two clearly separated actions. Each submit sends exactly one request
 * (tracking OR manual) — never both. Choices follow the status workflow, final statuses
 * and corrections require confirmation, and closed orders are locked.
 */
export const StatusUpdateForm: React.FC<Props> = ({
  orderNumber,
  statuses,
  statusesLoading,
  statusesError,
  onRetryStatuses,
  workflow,
  isSubmitting,
  onSubmit,
}) => {
  const [mode, setMode] = useState<StatusUpdateMode>('tracking');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const config = MODES[mode];
  const lockReason = getLockReason(workflow.currentStatus);

  // API list (authoritative set and order) ∩ workflow rules for the selected mode.
  const options = useMemo(() => {
    const allowed = new Set(getAllowedStatuses(mode, workflow));
    return statuses
      .filter((option) => allowed.has(option.status))
      .map((option) => {
        const stage = getStage(option.status);
        const label = isCorrection(option.status, workflow)
          ? `↩ ${formatStatusLabel(option.status)} (undo last step)`
          : `${formatStatusLabel(option.status)}${stage ? ` — ${STAGE_LABELS[stage]}` : ''}`;
        return { label, value: option.status };
      });
  }, [statuses, mode, workflow]);

  const noOptions = !statusesLoading && !statusesError && options.length === 0;
  const controlsDisabled = isSubmitting || statusesLoading || statusesError || noOptions;
  const correctionSelected = !!status && isCorrection(status, workflow);
  // Confirming would be the next step, but the order isn't fully paid: explain why it's missing.
  const paymentBlockReason = isConfirmBlockedByPayment(mode, workflow) ? getPaymentBlockReason(workflow.paymentStatus) : null;

  const send = async () => {
    const result = await onSubmit(mode, orderNumber, status, notes);
    setConfirmOpen(false);
    setFieldErrors(result.fieldErrors);
    if (result.ok) {
      setStatus('');
      setNotes('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (controlsDisabled) return;
    if (TERMINAL_STATUSES.has(status) || correctionSelected) {
      setConfirmOpen(true);
      return;
    }
    await send();
  };

  const statusLabel = formatStatusLabel(status);

  const confirmDescription = (() => {
    if (correctionSelected) {
      return `This undoes the last step: order ${orderNumber} goes back to ${statusLabel}. The correction is recorded in the history.`;
    }
    if (status === 'CANCELLED') {
      return `Order ${orderNumber} will be cancelled. This is final: the order can never be moved to any other status afterwards.`;
    }
    if (status === 'RETURN_COMPLETED') {
      return `The return for order ${orderNumber} will be closed. This is final: no further status changes will be possible.`;
    }
    return `Order ${orderNumber} will be marked ${statusLabel}. After this, only a return can be requested.`;
  })();

  if (lockReason) {
    return (
      <div role="status" aria-label="Status locked" className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] text-[11px] text-gray-600 dark:text-gray-300 space-y-1">
        <p className="flex items-center gap-1.5 font-semibold text-black dark:text-white">
          <Lock className="w-3.5 h-3.5" /> Status locked
        </p>
        <p>{lockReason}</p>
        <p className="text-gray-400">
          Payment and refund updates for closed orders are not supported by the backend yet.
        </p>
      </div>
    );
  }

  return (
    <>
      {paymentBlockReason && (
        <p
          role="note"
          aria-label="Payment required"
          className="flex items-start gap-1.5 p-3 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400"
        >
          <CreditCard className="w-3.5 h-3.5 mt-px shrink-0" />
          <span>{paymentBlockReason} Confirmed is not offered until then.</span>
        </p>
      )}
      <div role="radiogroup" aria-label="Update type" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 mb-3">
        {(Object.keys(MODES) as StatusUpdateMode[]).map((key) => {
          const { label, icon: Icon } = MODES[key];
          const active = key === mode;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={isSubmitting}
              onClick={() => {
                setMode(key);
                setFieldErrors({});
                // A correction offered only in manual mode is not valid in tracking mode.
                if (status && !getAllowedStatuses(key, workflow).includes(status)) setStatus('');
              }}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-semibold leading-tight transition-colors cursor-pointer ${
                active ? 'bg-white dark:bg-neutral-800 text-[#0071e3] shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-500 dark:text-neutral-400 mb-3">{config.help}</p>

      {statusesError ? (
        <div role="alert" className="mb-3 p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] flex items-center justify-between gap-2">
          <span>Status options could not be loaded.</span>
          <button type="button" onClick={onRetryStatuses} className="flex items-center gap-1 font-semibold cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        aria-label={config.label}
        className="space-y-3"
        noValidate
      >
        <CommonSelect
          label="Status"
          aria-label="Status"
          required
          options={options}
          placeholder={statusesLoading ? 'Loading statuses…' : noOptions ? 'No status change available' : 'Select the next status'}
          value={status}
          error={fieldErrors.status}
          disabled={controlsDisabled}
          onChange={(e) => {
            setStatus(e.target.value);
            setFieldErrors((prev) => ({ ...prev, status: '' }));
          }}
        />
        <div>
          <CommonTextArea
            label="Notes (optional)"
            aria-label="Notes"
            rows={3}
            maxLength={STATUS_NOTES_MAX_LENGTH}
            value={notes}
            error={fieldErrors.notes}
            disabled={controlsDisabled}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-[10px] text-gray-400 px-1 mt-1 flex justify-between gap-2">
            <span>{config.notesHint}</span>
            <span className="shrink-0">
              {notes.length}/{STATUS_NOTES_MAX_LENGTH}
            </span>
          </p>
        </div>
        <button
          type="submit"
          disabled={controlsDisabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isSubmitting ? 'Saving…' : config.button}
        </button>
      </form>

      <ConfirmationModal
        isOpen={confirmOpen}
        actionType={status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRM'}
        requestId={orderNumber}
        title={
          correctionSelected
            ? `Undo last step and revert to "${statusLabel}"?`
            : `${mode === 'manual' ? 'Manually set' : 'Update tracking to'} "${statusLabel}"?`
        }
        description={confirmDescription}
        isSubmitting={isSubmitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={send}
      />
    </>
  );
};
