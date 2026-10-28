import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { useBarcodeRequestAction } from '../hooks/useBarcodeRequests';
import type { CreateBarcodeRequest } from '../types/barcode.types';
import { BarcodeListInput } from './BarcodeListInput';
import { BARCODE_RULE, isValidBarcode, normalizeBarcode } from '../utils/barcode';

export type BarcodeRequestTarget =
  | { kind: 'CORRECTION'; barcodeId: number; code: string; what: string }
  | { kind: 'ASSIGNMENT'; stockId: number; stockIdentityNumber: string; unitsWithoutBarcode: number };

interface Props {
  target: BarcodeRequestTarget;
  onClose: () => void;
  /** After the request was accepted; `appliedCode` is the barcode's new code when a correction was applied at once. */
  onDone: (appliedCode?: string) => void;
}

const REASON_MAX = 500;

// What's wrong with the corrected code typed so far (null: nothing yet, or fine)
const correctionError = (typed: string, current: string): string | null => {
  const code = normalizeBarcode(typed);
  if (!code) return null;
  if (!isValidBarcode(code)) return `Use ${BARCODE_RULE}.`;
  return code === current ? 'The new barcode is the same as the current one.' : null;
};

const introduction = (target: BarcodeRequestTarget, appliesNow: boolean): string => {
  const subject =
    target.kind === 'CORRECTION'
      ? `This barcode (${target.what}) is locked.`
      : `${target.unitsWithoutBarcode} available unit(s) of this batch were received before barcodes were recorded.`;
  const outcome = appliesNow
    ? 'As a Super Admin your change is applied straight away and kept in its history.'
    : 'Your request goes to a Super Admin, who approves or rejects it.';
  return `${subject} ${outcome}`;
};

const CorrectionField: React.FC<{ value: string; error: string | null; onChange: (value: string) => void }> = ({ value, error, onChange }) => (
  <div className="space-y-1">
    <label htmlFor="barcode-new-code" className="block font-semibold text-gray-700 dark:text-gray-300">
      New barcode <span className="text-rose-500">*</span>
    </label>
    <input
      id="barcode-new-code"
      type="text"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
      className={`w-full px-3 py-2 rounded-xl border bg-transparent font-mono focus:outline-none focus:ring-2 focus:ring-[#0071e3] ${
        error ? 'border-rose-500/80' : 'border-black/10 dark:border-white/10'
      }`}
    />
    {error && <p className="text-[11px] text-rose-500">{error}</p>}
  </div>
);

/**
 * A change to locked barcodes: a corrected code, or codes for stock received before barcodes were recorded. A Level 2
 * Super Admin (BARCODE_APPROVE) applies it at once; anyone else's request waits for one in the Approvals hub.
 */
export const BarcodeRequestModal: React.FC<Props> = ({ target, onClose, onDone }) => {
  const { can } = useAccess();
  const appliesNow = can('BARCODE_APPROVE');
  const [newCode, setNewCode] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const { isSubmitting, submit } = useBarcodeRequestAction();

  const codeError = target.kind === 'CORRECTION' ? correctionError(newCode, target.code) : null;
  const filled = target.kind === 'CORRECTION' ? !!newCode.trim() && !codeError : codes.length > 0;
  const ready = reason.trim().length > 0 && filled;

  const request = (): CreateBarcodeRequest =>
    target.kind === 'CORRECTION'
      ? { requestType: 'CORRECTION', barcodeId: target.barcodeId, newCode: normalizeBarcode(newCode), reason: reason.trim() }
      : { requestType: 'ASSIGNMENT', stockId: target.stockId, codes, reason: reason.trim() };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || isSubmitting) return;
    const payload = request();
    if (!(await submit(payload))) return;
    onDone(payload.requestType === 'CORRECTION' && appliesNow ? payload.newCode : undefined);
    onClose();
  };

  const title = target.kind === 'CORRECTION' ? `Correct barcode ${target.code}` : `Assign barcodes to ${target.stockIdentityNumber}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={target.kind === 'CORRECTION' ? 'Correct barcode' : 'Assign barcodes'}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 text-xs"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-sm font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          <p className="text-gray-500">{introduction(target, appliesNow)}</p>

          {target.kind === 'CORRECTION' ? (
            <CorrectionField value={newCode} error={codeError} onChange={setNewCode} />
          ) : (
            <BarcodeListInput
              id="barcode-assign-codes"
              label="Barcodes of the units without one"
              codes={codes}
              onChange={setCodes}
              expected={target.unitsWithoutBarcode}
              what="unit"
            />
          )}

          <div className="space-y-1">
            <label htmlFor="barcode-request-reason" className="block font-semibold text-gray-700 dark:text-gray-300">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="barcode-request-reason"
              rows={2}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={target.kind === 'CORRECTION' ? 'e.g. Label misprinted, relabelled on 12 Oct' : 'e.g. Stock received before barcodes'}
              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 font-medium cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!ready || isSubmitting}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${SOLID_TONE.approve}`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {appliesNow ? 'Apply change' : 'Send for approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
