import React, { useCallback, useState } from 'react';
import { usePayrollMonth, usePayrollYear } from '../hooks/usePayrollData';
import { YearCalendar } from '../components/YearCalendar';
import { MonthPayrollPanel } from '../components/MonthPayrollPanel';

/**
 * Payments & Chalans: monthly salaries for now. The calendar shows every month of a year; the chosen month lists each
 * employee to pay, what is recorded, confirmed and emailed.
 */
export const PaymentsPage: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1);
  const yearData = usePayrollYear(year);
  const monthData = usePayrollMonth(year, month);
  const refreshYear = yearData.refresh;
  const refreshMonth = monthData.refresh;
  const changed = useCallback(() => {
    refreshMonth();
    refreshYear();
  }, [refreshMonth, refreshYear]);

  const chooseYear = (next: number) => {
    setYear(next);
    // The current month of this year, or none for another year until one is chosen
    setMonth(next === now.getFullYear() ? now.getMonth() + 1 : null);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">Payments & Chalans</h1>
        <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">
          Monthly salaries: record each transfer, have it confirmed, and every employee gets their payslip by email and under My Payslips.
        </p>
      </div>
      <YearCalendar year={year} summary={yearData.data} isLoading={yearData.isLoading} selectedMonth={month} onYear={chooseYear} onMonth={setMonth} />
      {month !== null && (
        <MonthPayrollPanel view={monthData.data?.month === month && monthData.data.year === year ? monthData.data : null}
          isLoading={monthData.isLoading} loadFailed={monthData.loadFailed} onRefresh={refreshMonth} onChanged={changed} />
      )}
    </div>
  );
};
