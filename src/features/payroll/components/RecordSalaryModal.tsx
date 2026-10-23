import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { CommonInput, CommonTextArea } from '../../../components/ui/FormInputs';
import { DialogShell } from '../../finance/components/DialogShell';
import { ICON_DANGER, SOLID_TONE } from '../../../components/ui/actionTones';
import type { MonthRow, RecordPayload, SalaryLineKind } from '../types/payroll.types';
import { defaultTransferDate, inrAmount, monthStartIso, periodLabel, todayIso } from '../utils/payroll';

const MAX_LINES = 20;
const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;
const TEXT = /^[\p{L}\p{N}#(][\p{L}\p{M}\p{N} .,'&()/#:+_@%-]*$/u;

interface LineForm {
  key: number;
  kind: SalaryLineKind;
  label: string;
  amount: string;
}

/**
 * Records that a month's salaries were transferred from the bank: one employee (with this month's extra earnings and
 * deductions) or several at once (each at their monthly salary). Nothing is booked or emailed until someone else
 * confirms it.
 */
export const RecordSalaryModal: React.FC<{
  year: number;
  month: number;
  rows: MonthRow[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: RecordPayload) => Promise<boolean>;
}> = ({ year, month, rows, isSubmitting, onClose, onSubmit }) => {
  const single = rows.length === 1 ? rows[0] : null;
  const [transferDate, setTransferDate] = useState(() => defaultTransferDate(year, month));
  const [bankReference, setBankReference] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineForm[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const monthly = single?.monthlySalary ?? 0;
  const totals = useMemo(() => {
    const sum = (kind: SalaryLineKind) =>
      lines.filter((line) => line.kind === kind && AMOUNT.test(line.amount.trim())).reduce((total, line) => total + Number(line.amount), 0);
    const earnings = monthly + sum('EARNING');
    const deductions = sum('DEDUCTION');
    return { earnings, deductions, net: Math.round((earnings - deductions) * 100) / 100 };
  }, [lines, monthly]);
  const batchTotal = rows.reduce((total, row) => total + (row.monthlySalary ?? 0), 0);

  const addLine = (kind: SalaryLineKind) => {
    setLines((prev) => [...prev, { key: nextKey, kind, label: '', amount: '' }]);
    setNextKey((key) => key + 1);
  };
  const updateLine = (key: number, patch: Partial<LineForm>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    setErrors((prev) => ({ ...prev, [`line-${key}`]: '', net: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!transferDate) next.transferDate = 'The transfer date is required.';
    else if (transferDate > todayIso()) next.transferDate = "The transfer date can't be in the future.";
    else if (transferDate < monthStartIso(year, month)) next.transferDate = `The transfer date can't be before ${periodLabel(year, month)} starts.`;
    if (bankReference.trim() && !TEXT.test(bankReference.trim())) next.bankReference = 'Use letters, numbers and simple punctuation only.';
    for (const line of lines) {
      if (!line.label.trim()) next[`line-${line.key}`] = 'Describe it, e.g. Festival bonus or TDS.';
      else if (!TEXT.test(line.label.trim())) next[`line-${line.key}`] = 'Use letters, numbers and simple punctuation only.';
      else if (!AMOUNT.test(line.amount.trim()) || Number(line.amount) <= 0) next[`line-${line.key}`] = 'Enter an amount above zero, with at most 2 decimals.';
    }
    if (single && totals.net <= 0) next.net = 'The deductions leave nothing to pay.';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const invalid = validate();
    if (Object.keys(invalid).length) {
      setErrors(invalid);
      return;
    }
    const ok = await onSubmit({
      transferDate,
      bankReference: bankReference.trim() || null,
      note: note.trim() || null,
      entries: rows.map((row) => ({
        employeeId: row.employeeId,
        lines: single ? lines.map((line) => ({ kind: line.kind, label: line.label.trim(), amount: Number(line.amount) })) : [],
      })),
    });
    if (ok) onClose();
  };

  return (
    <DialogShell
      wide
      title={single ? `Record ${single.name}'s salary` : `Record ${rows.length} salaries`}
      subtitle={`${periodLabel(year, month)} — marks the bank transfer as done. A different Level 2 approver confirms it; only then is it booked and the payslip emailed.`}
      disabled={isSubmitting}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Record salary">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CommonInput label="Transferred on" aria-label="Transfer date" type="date" required value={transferDate}
            min={monthStartIso(year, month)} max={todayIso()} error={errors.transferDate} disabled={isSubmitting}
            onChange={(e) => { setTransferDate(e.target.value); setErrors((prev) => ({ ...prev, transferDate: '' })); }} />
          <CommonInput label="Bank reference / UTR" aria-label="Bank reference" maxLength={100} value={bankReference}
            error={errors.bankReference} disabled={isSubmitting} placeholder={single ? 'e.g. UTR 4321…' : 'Shared by every transfer (optional)'}
            onChange={(e) => { setBankReference(e.target.value); setErrors((prev) => ({ ...prev, bankReference: '' })); }} />
        </div>

        {single ? (
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Monthly salary ({single.employeeCode})</span>
              <span className="font-semibold text-black dark:text-white tabular-nums">{inrAmount(monthly)}</span>
            </div>
            {lines.map((line) => (
              <div key={line.key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <select aria-label="Earning or deduction" value={line.kind} disabled={isSubmitting}
                    onChange={(e) => updateLine(line.key, { kind: e.target.value as SalaryLineKind })}
                    className="px-2 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-black dark:text-white cursor-pointer">
                    <option value="EARNING" className="bg-white dark:bg-[#1c1c1e]">+ Earning</option>
                    <option value="DEDUCTION" className="bg-white dark:bg-[#1c1c1e]">− Deduction</option>
                  </select>
                  <input aria-label="Description" value={line.label} maxLength={100} disabled={isSubmitting}
                    placeholder={line.kind === 'EARNING' ? 'e.g. Festival bonus, overtime' : 'e.g. Unpaid leave (2 days), TDS, PF'}
                    onChange={(e) => updateLine(line.key, { label: e.target.value })}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-black dark:text-white" />
                  <input aria-label="Amount" value={line.amount} inputMode="decimal" disabled={isSubmitting} placeholder="0.00"
                    onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                    className="w-28 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-right text-black dark:text-white tabular-nums" />
                  <button type="button" aria-label="Remove line" disabled={isSubmitting}
                    onClick={() => setLines((prev) => prev.filter((other) => other.key !== line.key))}
                    className={`p-2 rounded-lg cursor-pointer ${ICON_DANGER}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {errors[`line-${line.key}`] && <p className="text-[11px] text-rose-500 px-1">{errors[`line-${line.key}`]}</p>}
              </div>
            ))}
            {lines.length < MAX_LINES && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addLine('EARNING')} disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Add earning
                </button>
                <button type="button" onClick={() => addLine('DEDUCTION')} disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Add deduction
                </button>
              </div>
            )}
            <div className="border-t border-black/10 dark:border-white/10 pt-2 space-y-1 tabular-nums">
              <div className="flex justify-between text-gray-500"><span>Total earnings</span><span>{inrAmount(totals.earnings)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Total deductions</span><span>{inrAmount(totals.deductions)}</span></div>
              <div className="flex justify-between text-sm font-bold text-black dark:text-white"><span>Net pay transferred</span><span>{inrAmount(totals.net)}</span></div>
              {errors.net && <p className="text-[11px] text-rose-500">{errors.net}</p>}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-2">
            <p className="text-gray-500">
              Everyone below is recorded at their monthly salary. To add a bonus or a deduction for someone, record them on their own instead.
            </p>
            <ul className="max-h-48 overflow-y-auto divide-y divide-black/5 dark:divide-white/5" aria-label="Employees to record">
              {rows.map((row) => (
                <li key={row.employeeId} className="flex justify-between py-1.5">
                  <span className="text-black dark:text-white">{row.name} <span className="text-gray-400">{row.employeeCode}</span></span>
                  <span className="tabular-nums">{inrAmount(row.monthlySalary)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-black/10 dark:border-white/10 pt-2 text-sm font-bold text-black dark:text-white tabular-nums">
              <span>Total transferred</span><span>{inrAmount(batchTotal)}</span>
            </div>
          </div>
        )}

        <CommonTextArea label="Note (optional)" aria-label="Note" rows={2} maxLength={500} value={note} disabled={isSubmitting}
          onChange={(e) => setNote(e.target.value)} placeholder="Anything the approver should know" />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white font-semibold cursor-pointer disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold cursor-pointer disabled:opacity-60 ${SOLID_TONE.primary}`}>
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Record for confirmation
          </button>
        </div>
      </form>
    </DialogShell>
  );
};
