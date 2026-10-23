import { useCallback, useEffect, useState } from 'react';
import { payrollApi } from '../api/payrollApi';
import type { ApiResponse } from '../../../types/common.types';
import type { MonthView, MyPayslip, YearSummary } from '../types/payroll.types';
import { useNotify } from '../../../hooks/useNotify';
import { useAccess } from '../../../hooks/useAccess';

/**
 * Loads one resource whenever its inputs (or `refresh`) change; an older answer never overwrites a newer one. Nothing is
 * asked for without its permission (`enabled`). State is only set when an answer arrives, so loading is derived: it is
 * whatever was last asked for and hasn't been answered yet.
 */
const useLoad = <T,>(load: () => Promise<ApiResponse<T>>, enabled: boolean, failure: string) => {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ data: T | null; failed: boolean; load: unknown; version: number }>({
    data: null,
    failed: false,
    load: null,
    version: -1,
  });
  const notify = useNotify();

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    const settle = (data: T | null, failed: boolean) =>
      setResult((prev) => ({ data: failed ? prev.data : data, failed, load, version }));
    load()
      .then((res) => {
        if (!current) return;
        if (!res.success) notify.error(res, failure);
        settle(res.data, !res.success);
      })
      .catch((err: unknown) => {
        if (!current) return;
        notify.error(err, failure);
        settle(null, true);
      });
    return () => {
      current = false;
    };
  }, [enabled, load, version, notify, failure]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const isLoading = enabled && (result.load !== load || result.version !== version);
  return { data: result.data, isLoading, loadFailed: result.failed, refresh };
};

/** GET /v1/admin/payroll/years/{year} (PAYMENT_VIEW). */
export const usePayrollYear = (year: number) => {
  const { can } = useAccess();
  const load = useCallback(() => payrollApi.year(year), [year]);
  return useLoad<YearSummary>(load, can('PAYMENT_VIEW'), 'The salary calendar could not be loaded.');
};

/** GET /v1/admin/payroll/years/{year}/months/{month} (PAYMENT_VIEW); nothing while no month is open. */
export const usePayrollMonth = (year: number, month: number | null) => {
  const { can } = useAccess();
  const load = useCallback(() => payrollApi.month(year, month ?? 1), [year, month]);
  return useLoad<MonthView>(load, can('PAYMENT_VIEW') && month !== null, 'The month could not be loaded.');
};

/** GET /v1/payroll/my-payslips (PAYSLIP_VIEW_OWN). */
export const useMyPayslips = () => {
  const { can } = useAccess();
  return useLoad<MyPayslip[]>(payrollApi.myPayslips, can('PAYSLIP_VIEW_OWN'), 'Your payslips could not be loaded.');
};
