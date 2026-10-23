import { useCallback, useRef, useState } from 'react';
import { payrollApi } from '../api/payrollApi';
import type { ApiResponse } from '../../../types/common.types';
import type { RecordPayload } from '../types/payroll.types';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorKind } from '../../../utils/apiErrorKind';

/**
 * Every salary action: one in flight at a time, the outcome through the global alert (the server's message), and the
 * month reloaded from the server afterwards, also when the server refused because someone else got there first.
 */
export const usePayrollActions = (onChanged: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const notify = useNotify();

  const run = useCallback(
    async <T,>(call: () => Promise<ApiResponse<T>>, success: string, failure: string): Promise<boolean> => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const res = await call();
        if (!res.success) {
          notify.error(res, failure);
          return false;
        }
        notify.success(res.message || success);
        onChanged();
        return true;
      } catch (err: unknown) {
        notify.error(err, failure);
        const kind = getApiErrorKind(err);
        if (kind === 'conflict' || kind === 'notFound') onChanged();
        return false;
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [notify, onChanged]
  );

  return {
    isSubmitting,
    record: (year: number, month: number, payload: RecordPayload) =>
      run(() => payrollApi.record(year, month, payload), 'Salaries recorded for confirmation.', 'The salaries could not be recorded.'),
    confirm: (paymentIds: number[]) =>
      run(() => payrollApi.decide({ paymentIds, decision: 'APPROVED' }), 'Salaries confirmed.', 'The salaries could not be confirmed.'),
    reject: (paymentIds: number[], rejectionReason: string) =>
      run(() => payrollApi.decide({ paymentIds, decision: 'REJECTED', rejectionReason }), 'Salaries rejected.',
        'The salaries could not be rejected.'),
    withdraw: (id: number) => run(() => payrollApi.withdraw(id), 'Salary withdrawn.', 'The salary could not be withdrawn.'),
    resend: (id: number) => run(() => payrollApi.resendPayslip(id), 'The payslip will be emailed again.', 'The payslip could not be resent.'),
  };
};
