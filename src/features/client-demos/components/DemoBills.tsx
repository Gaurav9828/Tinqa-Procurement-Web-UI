import React, { useState } from 'react';
import { BedDouble, Bus, Download, Loader2, MapPin, Paperclip, Pencil, Plus, Receipt, Trash2, Utensils } from 'lucide-react';
import { ICON_DANGER } from '../../../components/ui/actionTones';
import type { DemoDetail, DemoExpense, ExpenseKind } from '../types/clientDemo.types';
import { EXPENSE_KINDS, EXPENSE_KIND_LABELS, MEAL_LABELS, TRAVEL_MODE_LABELS, dayDate, formatDay, inrAmount } from '../utils/clientDemo';

const KIND_ICONS: Record<ExpenseKind, React.ReactNode> = {
  STAY: <BedDouble className="w-3.5 h-3.5 text-indigo-500" />,
  FOOD: <Utensils className="w-3.5 h-3.5 text-orange-500" />,
  TRAVEL: <Bus className="w-3.5 h-3.5 text-sky-500" />,
  OTHER: <Receipt className="w-3.5 h-3.5 text-gray-500" />,
};

const describe = (expense: DemoExpense): React.ReactNode => {
  switch (expense.kind) {
    case 'STAY':
      return (
        <>
          <span className="font-semibold">{expense.vendorName}</span>
          {expense.vendorAddress && <span className="text-gray-500"> · {expense.vendorAddress}</span>}
          {expense.vendorGstin && <span className="block text-gray-400 font-mono">GSTIN {expense.vendorGstin}</span>}
        </>
      );
    case 'FOOD':
      return (
        <>
          <span className="font-semibold">{expense.mealType ? MEAL_LABELS[expense.mealType] : 'Meal'}</span> at {expense.vendorName}
          {expense.vendorGstin && <span className="block text-gray-400 font-mono">GSTIN {expense.vendorGstin}</span>}
        </>
      );
    case 'TRAVEL':
      return (
        <>
          <span className="font-semibold">{expense.fromPlace} → {expense.toPlace}</span>
          <span className="text-gray-500"> · {expense.travelMode ? TRAVEL_MODE_LABELS[expense.travelMode] : ''}{expense.vendorName ? ` (${expense.vendorName})` : ''}</span>
        </>
      );
    case 'OTHER':
      return (
        <>
          <span className="font-semibold">{expense.description}</span>
          {expense.reason && <span className="block text-gray-500 italic">Why: {expense.reason}</span>}
        </>
      );
  }
};

/**
 * The demo's bills, day by day (stay, food, travel, other), with what each kind cost and the total against the budget.
 * The total is the server's: it books exactly this when the completion is approved.
 */
export const DemoBills: React.FC<{
  demo: DemoDetail;
  /** Whether the caller may add bills right now. */
  canAdd: boolean;
  downloadingId: number | null;
  onAdd: (kind: ExpenseKind, day: number | null) => void;
  onEdit: (expense: DemoExpense) => void;
  onRemove: (expense: DemoExpense) => void;
  onAttach: (expense: DemoExpense, file: File) => void;
  onDownload: (expense: DemoExpense) => void;
}> = ({ demo, canAdd, downloadingId, onAdd, onEdit, onRemove, onAttach, onDownload }) => {
  const [day, setDay] = useState<number | 'all'>('all');
  const days = Array.from({ length: demo.numberOfDays }, (_, index) => index + 1);
  const undated = demo.expenses.filter((expense) => expense.dayNumber === null);
  const shownDays = day === 'all' ? days : [day];
  const over = demo.budgetLeft < 0;

  const dayTotal = (number: number) => demo.expenses.filter((expense) => expense.dayNumber === number).reduce((sum, expense) => sum + expense.amount, 0);

  const rows = (expenses: DemoExpense[]) => (
    <ul className="divide-y divide-black/5 dark:divide-white/5">
      {expenses.map((expense) => (
        <li key={expense.id} className="py-2.5 flex items-start gap-3">
          <span className="mt-0.5 shrink-0" title={EXPENSE_KIND_LABELS[expense.kind]}>{KIND_ICONS[expense.kind]}</span>
          <div className="min-w-0 flex-1 text-gray-700 dark:text-gray-300">
            {describe(expense)}
            <span className="block text-[10px] text-gray-400">
              {expense.referenceNumber && <>{expense.kind === 'TRAVEL' ? 'Ticket' : 'Invoice'} {expense.referenceNumber} · </>}
              Added by {expense.addedByName ?? 'someone'}
              {expense.updatedByName && <> · changed by {expense.updatedByName}</>}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono font-semibold">{inrAmount(expense.amount)}</span>
            {expense.gstAmount !== null && <span className="block text-[10px] text-gray-400">incl. GST {inrAmount(expense.gstAmount)}</span>}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {expense.kind === 'STAY' && expense.vendorMapLink && (
              <a href={expense.vendorMapLink} target="_blank" rel="noopener noreferrer" aria-label={`Hotel location of ${expense.vendorName}`}
                className="p-1.5 rounded-lg text-[#0071e3] hover:bg-[#0071e3]/10"><MapPin className="w-3.5 h-3.5" /></a>
            )}
            {expense.invoiceFileName && (
              <button type="button" onClick={() => onDownload(expense)} aria-label={`Download ${expense.invoiceFileName}`} title={expense.invoiceFileName}
                className="p-1.5 rounded-lg text-[#0071e3] hover:bg-[#0071e3]/10 cursor-pointer">
                {downloadingId === expense.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              </button>
            )}
            {expense.editableByYou && (
              <>
                <label aria-label={expense.invoiceFileName ? 'Replace invoice' : 'Attach invoice'} title={expense.invoiceFileName ? 'Replace invoice' : 'Attach invoice'}
                  className={`p-1.5 rounded-lg cursor-pointer hover:bg-[#0071e3]/10 ${expense.invoiceFileName ? 'text-gray-400' : 'text-amber-500'}`}>
                  <Paperclip className="w-3.5 h-3.5" />
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onAttach(expense, file);
                      e.target.value = '';
                    }} />
                </label>
                <button type="button" onClick={() => onEdit(expense)} aria-label="Change bill"
                  className="p-1.5 rounded-lg text-[#0071e3] hover:bg-[#0071e3]/10 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => onRemove(expense)} aria-label="Remove bill"
                  className={`p-1.5 rounded-lg cursor-pointer ${ICON_DANGER}`}><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label="Bills" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Stay, food, travel & other bills</h2>
          <p className="text-gray-500 mt-0.5">Every bill of the visit, day by day. The total is worked out from them and booked once the completion is approved.</p>
        </div>
        {canAdd && (
          <button type="button" onClick={() => onAdd('STAY', day === 'all' ? null : day)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add bill
          </button>
        )}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {EXPENSE_KINDS.map((kind) => (
          <div key={kind} className="rounded-xl bg-black/[0.03] dark:bg-white/5 px-3 py-2">
            <dt className="flex items-center gap-1 text-gray-500">{KIND_ICONS[kind]} {EXPENSE_KIND_LABELS[kind]}</dt>
            <dd className="font-mono font-semibold mt-0.5">{inrAmount(demo.totalsByKind[kind] ?? 0)}</dd>
          </div>
        ))}
        <div className="rounded-xl bg-[#0071e3]/10 px-3 py-2">
          <dt className="text-[#0071e3] dark:text-blue-400 font-semibold">Total spent</dt>
          <dd className="font-mono font-bold mt-0.5">{inrAmount(demo.total)}</dd>
        </div>
        <div className={`rounded-xl px-3 py-2 ${over ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
          <dt className={`font-semibold ${over ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {over ? 'Over budget by' : 'Budget left'}
          </dt>
          <dd className="font-mono font-bold mt-0.5">{inrAmount(Math.abs(demo.budgetLeft))}</dd>
          <dd className="text-[10px] text-gray-400">of {inrAmount(demo.proposedBudget)}</dd>
        </div>
      </dl>

      <div role="tablist" aria-label="Visit days" className="flex flex-wrap gap-1">
        {(['all', ...days] as (number | 'all')[]).map((option) => (
          <button key={option} type="button" role="tab" aria-selected={day === option} onClick={() => setDay(option)}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${day === option ? 'bg-[#0071e3] text-white' : 'bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-black/10'}`}>
            {option === 'all' ? 'All days' : `Day ${option}`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {shownDays.map((number) => {
          const expenses = demo.expenses.filter((expense) => expense.dayNumber === number);
          return (
            <div key={number} className="rounded-xl border border-black/10 dark:border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Day {number} · {formatDay(dayDate(demo.startDate, number))}</h3>
                <span className="font-mono text-gray-500">{inrAmount(dayTotal(number))}</span>
              </div>
              {expenses.length === 0 ? (
                <p className="text-gray-400 py-2">No bills for this day yet.</p>
              ) : rows(expenses)}
              {canAdd && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {EXPENSE_KINDS.filter((kind) => kind !== 'OTHER').map((kind) => (
                    <button key={kind} type="button" onClick={() => onAdd(kind, number)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#0071e3]/30 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/10 cursor-pointer">
                      <Plus className="w-3 h-3" /> {EXPENSE_KIND_LABELS[kind]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {day === 'all' && undated.length > 0 && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-3">
            <h3 className="font-semibold">Not tied to a day</h3>
            {rows(undated)}
          </div>
        )}
      </div>
    </section>
  );
};
