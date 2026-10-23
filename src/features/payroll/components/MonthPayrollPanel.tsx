import React, { useState } from 'react';
import { AlertTriangle, CheckCheck, Loader2, Mail, RefreshCw, Send } from 'lucide-react';
import type { MonthRow, MonthView, SalaryPayment } from '../types/payroll.types';
import { usePayrollActions } from '../hooks/usePayrollActions';
import { inrAmount, periodLabel } from '../utils/payroll';
import { SalaryStatusBadge } from './SalaryStatusBadge';
import { RecordSalaryModal } from './RecordSalaryModal';
import { RejectSalaryDialog } from './RejectSalaryDialog';
import { SalaryRowActions, type RowAccess, type RowDialog } from './SalaryRowActions';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useAccess } from '../../../hooks/useAccess';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatDate } from '../../finance/utils/period';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';

type Dialog = RowDialog | { kind: 'confirm'; rows: MonthRow[] } | { kind: 'record'; rows: MonthRow[] };

const live = (payment: SalaryPayment | null) => payment?.status === 'PENDING_APPROVAL' || payment?.status === 'APPROVED';
const sum = (rows: MonthRow[], pick: (row: MonthRow) => number | null | undefined) =>
  rows.reduce((total, row) => total + (pick(row) ?? 0), 0);

const DECIDED_VERB: Record<SalaryPayment['status'], string> = {
  PENDING_APPROVAL: '',
  APPROVED: 'Confirmed',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

/** Where the payslip email of a confirmed salary stands. */
const emailState = (payment: SalaryPayment): { tone: string; failed: boolean; text: string } => {
  if (payment.payslipEmailedAt) {
    return {
      tone: 'text-emerald-700 dark:text-emerald-400',
      failed: false,
      text: `Payslip emailed to ${payment.payslipEmailTo} · ${formatDateTime(payment.payslipEmailedAt)}`,
    };
  }
  if (payment.payslipEmailError) {
    return { tone: 'text-rose-600 dark:text-rose-400', failed: true, text: `Payslip email failed: ${payment.payslipEmailError}` };
  }
  return {
    tone: 'text-gray-400',
    failed: false,
    text: payment.payslipEmailTo ? `Payslip being emailed to ${payment.payslipEmailTo}` : 'No email address on file',
  };
};

const PaymentStatus: React.FC<{ payment: SalaryPayment }> = ({ payment }) => {
  const email = payment.status === 'APPROVED' ? emailState(payment) : null;
  return (
    <>
      <SalaryStatusBadge status={payment.status} />
      <div className="mt-1 text-gray-400">
        Paid {formatDate(payment.transferDate)}{payment.bankReference ? ` · ${payment.bankReference}` : ''}
      </div>
      <div className="text-gray-400">Recorded by {payment.recordedByName ?? '—'}</div>
      {payment.decidedByName && payment.status !== 'PENDING_APPROVAL' && (
        <div className="text-gray-400">{DECIDED_VERB[payment.status]} by {payment.decidedByName}</div>
      )}
      {payment.rejectionReason && <div className="mt-0.5 text-rose-600 dark:text-rose-400 max-w-[16rem] break-words">“{payment.rejectionReason}”</div>}
      {payment.note && <div className="mt-0.5 text-gray-500 max-w-[16rem] break-words">{payment.note}</div>}
      {email && (
        <div className={`mt-1 flex items-start gap-1 ${email.tone}`}>
          {email.failed ? <AlertTriangle className="w-3 h-3 mt-px shrink-0" aria-hidden /> : <Mail className="w-3 h-3 mt-px shrink-0" aria-hidden />}
          <span className="max-w-[16rem] break-words">{email.text}</span>
        </div>
      )}
    </>
  );
};

const StatusCell: React.FC<{ row: MonthRow }> = ({ row }) => {
  if (row.payment) return <PaymentStatus payment={row.payment} />;
  if (row.payable) return <span className="text-gray-500">Not recorded</span>;
  return <span className="text-amber-700 dark:text-amber-400 max-w-[16rem] inline-block">{row.notPayableReason}</span>;
};

const NetPayCell: React.FC<{ payment: SalaryPayment | null }> = ({ payment }) => {
  if (!payment) return <>—</>;
  return (
    <>
      <div className="font-semibold text-black dark:text-white">{inrAmount(payment.netPay)}</div>
      {payment.lines.map((line, index) => (
        <div key={index} className={`text-[10px] ${line.kind === 'EARNING' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {line.kind === 'EARNING' ? '+' : '−'}{inrAmount(line.amount)} {line.label}
        </div>
      ))}
    </>
  );
};

const EmptyMonth: React.FC<{ isLoading: boolean; loadFailed: boolean; onRefresh: () => void }> = ({ isLoading, loadFailed, onRefresh }) => {
  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin mx-auto" aria-label="Loading month" />;
  if (loadFailed) {
    return <button type="button" onClick={onRefresh} className="font-semibold text-black dark:text-white cursor-pointer">Try again</button>;
  }
  return <>Choose a month above.</>;
};

/**
 * One month's salaries: who still has to be paid, what waits for confirmation and what is paid, with the actions the
 * signed-in user may take (the server enforces the same rules: nobody confirms a salary they recorded, or their own).
 */
export const MonthPayrollPanel: React.FC<{
  view: MonthView | null;
  isLoading: boolean;
  loadFailed: boolean;
  onRefresh: () => void;
  onChanged: () => void;
}> = ({ view, isLoading, loadFailed, onRefresh, onChanged }) => {
  const { can } = useAccess();
  const userId = useAuthStore((state) => state.user?.userId ?? null);
  const actions = usePayrollActions(onChanged);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  if (!view) {
    return (
      <section aria-label="Month" className="apple-card p-10 text-center text-xs text-gray-500">
        <EmptyMonth isLoading={isLoading} loadFailed={loadFailed} onRefresh={onRefresh} />
      </section>
    );
  }

  const access: RowAccess = {
    canRecord: can('PAYMENT_RECORD') && view.open,
    canWithdraw: can('PAYMENT_RECORD'),
    canResend: can('PAYMENT_RECORD'),
    canApprove: can('PAYMENT_APPROVE'),
    userId,
  };
  // What this user may confirm: waiting, not recorded by them, not their own salary
  const confirmable = (row: MonthRow) =>
    access.canApprove && row.payment?.status === 'PENDING_APPROVAL' && row.payment.recordedBy !== userId && row.userId !== userId;
  const unpaid = view.rows.filter((row) => row.payable && !live(row.payment));
  const toConfirm = view.rows.filter(confirmable);
  const period = periodLabel(view.year, view.month);
  const tiles = [
    { label: 'To pay', value: `${view.payableEmployees} employees`, warn: false },
    { label: 'Not recorded yet', value: String(view.notRecorded), warn: view.notRecorded > 0 },
    { label: 'Awaiting confirmation', value: `${view.pendingApproval} · ${inrAmount(view.pendingNetPay)}`, warn: view.pendingApproval > 0 },
    { label: 'Paid & confirmed', value: `${view.approved} · ${inrAmount(view.approvedNetPay)}`, warn: false },
  ];

  return (
    <section aria-label={`Salaries for ${period}`} className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white">Salaries for {period}</h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-0.5 max-w-2xl">
            Transfer salaries from the bank, then record them here. Once a different Level 2 approver confirms, each salary is booked
            in Accounts &amp; Finance and the payslip is emailed to the employee.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {access.canRecord && unpaid.length > 0 && (
            <button type="button" onClick={() => setDialog({ kind: 'record', rows: unpaid })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold cursor-pointer">
              <Send className="w-3.5 h-3.5" /> Record all unpaid ({unpaid.length})
            </button>
          )}
          {toConfirm.length > 0 && (
            <button type="button" onClick={() => setDialog({ kind: 'confirm', rows: toConfirm })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer">
              <CheckCheck className="w-3.5 h-3.5" /> Confirm all waiting ({toConfirm.length})
            </button>
          )}
          <button type="button" onClick={onRefresh} disabled={isLoading} aria-label="Refresh month"
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tiles.map(({ label, value, warn }) => (
          <div key={label} className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wider text-gray-400">{label}</dt>
            <dd className={`mt-0.5 font-semibold tabular-nums ${warn ? 'text-amber-700 dark:text-amber-400' : 'text-black dark:text-white'}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {view.rows.length === 0 ? (
        <p className="py-10 text-center text-gray-500" role="status">Nobody was employed in {period}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label={`Salaries for ${period}`}>
            <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="pb-2 pr-3 font-semibold">Employee</th>
                <th className="pb-2 pr-3 font-semibold text-right">Monthly salary</th>
                <th className="pb-2 pr-3 font-semibold text-right">Net pay</th>
                <th className="pb-2 pr-3 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
              {view.rows.map((row) => (
                <tr key={row.employeeId}>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-black dark:text-white">{row.name}</div>
                    <div className="text-gray-400">{[row.employeeCode, row.designation, row.department].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">{row.monthlySalary ? inrAmount(row.monthlySalary) : '—'}</td>
                  <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap"><NetPayCell payment={row.payment} /></td>
                  <td className="py-3 pr-3"><StatusCell row={row} /></td>
                  <td className="py-3">
                    <SalaryRowActions row={row} access={access} confirmable={confirmable(row)} live={live(row.payment)}
                      isSubmitting={actions.isSubmitting} onDialog={setDialog} onResend={actions.resend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.kind === 'record' && (
        <RecordSalaryModal year={view.year} month={view.month} rows={dialog.rows} isSubmitting={actions.isSubmitting} onClose={close}
          onSubmit={(payload) => actions.record(view.year, view.month, payload)} />
      )}
      {dialog?.kind === 'confirm' && (
        <ConfirmationModal
          isOpen
          actionType="CONFIRM"
          tone="approve"
          title={dialog.rows.length === 1 ? `Confirm ${dialog.rows[0].name}'s salary?` : `Confirm ${dialog.rows.length} salaries?`}
          description={`${inrAmount(sum(dialog.rows, (row) => row.payment?.netPay))} for ${period}. Confirm only once the money has left the bank: it is booked in Accounts & Finance as salaries and each payslip is emailed. This can't be undone.`}
          confirmLabel="Yes, confirm"
          isSubmitting={actions.isSubmitting}
          onClose={close}
          onConfirm={async () => {
            if (await actions.confirm(dialog.rows.map((row) => row.payment!.id))) close();
          }}
        />
      )}
      {dialog?.kind === 'reject' && (
        <RejectSalaryDialog
          subtitle={`${dialog.rows.map((row) => row.name).join(', ')} · ${period}. The recorder is told why and can record it again.`}
          isSubmitting={actions.isSubmitting}
          onClose={close}
          onReject={(reason) => actions.reject(dialog.rows.map((row) => row.payment!.id), reason)}
        />
      )}
      {dialog?.kind === 'withdraw' && (
        <ConfirmationModal
          isOpen
          actionType="CONFIRM"
          tone="warning"
          title={`Withdraw ${dialog.row.name}'s salary?`}
          description={`The ${period} salary recorded as transferred is taken back before anyone confirms it. You can record it again.`}
          confirmLabel="Withdraw"
          isSubmitting={actions.isSubmitting}
          onClose={close}
          onConfirm={async () => {
            if (await actions.withdraw(dialog.row.payment!.id)) close();
          }}
        />
      )}
    </section>
  );
};
