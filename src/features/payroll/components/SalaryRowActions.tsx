import React from 'react';
import { Check, Download, Eye, Loader2, Mail, Send, Undo2, X } from 'lucide-react';
import type { MonthRow, SalaryPayment } from '../types/payroll.types';
import { usePayslipFile } from '../hooks/usePayslipFile';
import { payrollApi } from '../api/payrollApi';

/** The dialogs a row opens. */
export type RowDialog =
  | { kind: 'record'; rows: MonthRow[] }
  | { kind: 'confirm'; rows: MonthRow[] }
  | { kind: 'reject'; rows: MonthRow[] }
  | { kind: 'withdraw'; row: MonthRow };

/** What the signed-in user may do in this month (UX only; the server enforces the same). */
export interface RowAccess {
  canRecord: boolean;
  canWithdraw: boolean;
  canResend: boolean;
  canApprove: boolean;
  userId: number | null;
}

const actionButton =
  'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const tone = {
  primary: 'bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/20',
  approve: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20',
};

const fileName = (row: MonthRow, payment: SalaryPayment) =>
  `payslip-${row.employeeCode}-${payment.payYear}-${String(payment.payMonth).padStart(2, '0')}.pdf`;

/** Why an approver can't confirm a waiting salary themselves. */
const notYoursToConfirm = (payment: SalaryPayment, userId: number | null) =>
  payment.recordedBy === userId ? 'You recorded it: someone else confirms' : 'Your own salary: someone else confirms';

/** Payslip view / download / resend of a confirmed salary. */
const PayslipActions: React.FC<{ row: MonthRow; payment: SalaryPayment; canResend: boolean; isSubmitting: boolean;
  onResend: (id: number) => void }> = ({ row, payment, canResend, isSubmitting, onResend }) => {
  const { open, busyKey } = usePayslipFile();
  const key = `payslip-${payment.id}`;
  const fetch = (download: boolean) => payrollApi.payslip(payment.id, download);
  return (
    <>
      <button type="button" className={`${actionButton} ${tone.primary}`} disabled={busyKey === key}
        onClick={() => open(key, fetch, fileName(row, payment), false)}>
        {busyKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Payslip
      </button>
      <button type="button" aria-label={`Download ${row.name}'s payslip`} className={`${actionButton} ${tone.primary}`} disabled={busyKey === key}
        onClick={() => open(key, fetch, fileName(row, payment), true)}>
        <Download className="w-3 h-3" />
      </button>
      {canResend && (
        <button type="button" className={`${actionButton} ${tone.primary}`} disabled={isSubmitting} onClick={() => onResend(payment.id)}>
          <Mail className="w-3 h-3" /> Resend
        </button>
      )}
    </>
  );
};

/** The actions one employee's row offers, by where their salary stands and what the user may do. */
export const SalaryRowActions: React.FC<{
  row: MonthRow;
  access: RowAccess;
  confirmable: boolean;
  live: boolean;
  isSubmitting: boolean;
  onDialog: (dialog: RowDialog) => void;
  onResend: (id: number) => void;
}> = ({ row, access, confirmable, live, isSubmitting, onDialog, onResend }) => {
  const payment = row.payment;
  const pending = payment?.status === 'PENDING_APPROVAL';
  return (
    <div className="flex flex-wrap gap-1 max-w-[16rem]">
      {access.canRecord && row.payable && !live && (
        <button type="button" className={`${actionButton} ${tone.primary}`} onClick={() => onDialog({ kind: 'record', rows: [row] })}>
          <Send className="w-3 h-3" /> {payment ? 'Record again' : 'Record'}
        </button>
      )}
      {confirmable && (
        <>
          <button type="button" className={`${actionButton} ${tone.approve}`} onClick={() => onDialog({ kind: 'confirm', rows: [row] })}>
            <Check className="w-3 h-3" /> Confirm
          </button>
          <button type="button" className={`${actionButton} ${tone.danger}`} onClick={() => onDialog({ kind: 'reject', rows: [row] })}>
            <X className="w-3 h-3" /> Reject
          </button>
        </>
      )}
      {pending && access.canWithdraw && (
        <button type="button" className={`${actionButton} ${tone.warning}`} onClick={() => onDialog({ kind: 'withdraw', row })}>
          <Undo2 className="w-3 h-3" /> Withdraw
        </button>
      )}
      {payment?.status === 'APPROVED' && (
        <PayslipActions row={row} payment={payment} canResend={access.canResend} isSubmitting={isSubmitting} onResend={onResend} />
      )}
      {payment && pending && !confirmable && access.canApprove && (
        <span className="text-[10px] text-gray-400 self-center">{notYoursToConfirm(payment, access.userId)}</span>
      )}
    </div>
  );
};
