import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CommonTextArea } from '../../../../components/ui/FormInputs';
import type { DemoDetail, StaffMember } from '../../types/clientDemo.types';
import { CLIENT_CATEGORY_LABELS, DEMO_TYPE_LABELS, dayDate, formatDay, formatSlot, inrAmount } from '../../utils/clientDemo';
import { billsTotal, extraAmount, proposedBudget, unitsOf, type ClientForm } from '../../utils/planForm';
import type { PlanStepProps } from './planStepProps';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const categoryOf = (client: ClientForm) =>
  client.clientCategory === 'OTHER' ? client.clientCategoryOther : client.clientCategory && CLIENT_CATEGORY_LABELS[client.clientCategory];

/** Step 4: everything planned, at a glance, with the reason for the change when an approved demo is edited. */
export const ReviewStep: React.FC<PlanStepProps & {
  editing: DemoDetail | null;
  days: number;
  staffById: Map<number, StaffMember>;
}> = ({ editing, days, staffById, form, errors, set }) => {
  const planned = billsTotal(form.bills);
  const extra = extraAmount(form);
  const budget = proposedBudget(form);
  const journeys = form.bills.filter((bill) => bill.slot === 'TRAVEL').length;
  const stays = form.bills.filter((bill) => bill.slot === 'STAY').length;
  const meals = form.bills.length - stays - journeys;
  const approvalChange = editing?.status === 'APPROVED'
    && (budget !== editing.proposedBudget || Number(form.numberOfDays) !== editing.numberOfDays);
  const clients = [...form.clients].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber) || a.startTime.localeCompare(b.startTime));
  const rows: [string, string][] = [
    ['Type', form.demoType ? DEMO_TYPE_LABELS[form.demoType] : ''],
    ['When', `${formatDay(form.startDate)} · ${plural(days, 'day', 'days')}`],
    ['Products', form.products.map((product) => `${product.productName} × ${unitsOf(product)}`
      + (product.barcodes.length ? ` (${product.barcodes.join(', ')})` : '')).join('; ')],
    ['Attending staff', form.staffEmployeeIds.map((id) => staffById.get(id)?.name ?? `#${id}`).join(', ')],
    ['Day by day', form.bills.length
      ? `${plural(journeys, 'journey', 'journeys')}, ${plural(stays, 'night', 'nights')}, ${plural(meals, 'meal', 'meals')} · ${inrAmount(planned)}`
      : 'None planned'],
    ['Extra budget', extra > 0 ? `${inrAmount(extra)} · ${form.extraBudgetReason.trim()}` : 'None'],
    ['Proposed budget', inrAmount(budget)],
  ];

  return (
    <div className="space-y-4">
      <section aria-label="Clients to visit" className="space-y-2">
        <h2 className="text-sm font-semibold">{plural(form.clients.length, 'client', 'clients')} to visit</h2>
        <ol className="space-y-1.5">
          {clients.map((client) => (
            <li key={client.key} className="rounded-xl bg-black/[0.03] dark:bg-white/5 px-3 py-2">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{client.clientName} · {categoryOf(client) || ''}</span>
              <span className="block text-gray-500">
                Day {client.dayNumber}{form.startDate ? ` (${formatDay(dayDate(form.startDate, Number(client.dayNumber)))})` : ''}
                {' · '}{formatSlot(client.startTime, client.endTime)} · {[client.addressLine, client.city].filter(Boolean).join(', ')}
              </span>
              {(client.legalName || client.gstin) && (
                <span className="block text-gray-400">{[client.legalName, client.gstin && `GSTIN ${client.gstin.toUpperCase()}`].filter(Boolean).join(' · ')}</span>
              )}
            </li>
          ))}
        </ol>
      </section>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2 border-b border-black/5 dark:border-white/5 py-1.5">
            <dt className="w-32 shrink-0 text-gray-400">{label}</dt>
            <dd className="text-gray-800 dark:text-gray-200 break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      {approvalChange && (
        <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" /> The budget or number of days changed, so the quotation goes back for approval.
        </p>
      )}
      {editing && editing.status !== 'DRAFT' && (
        <CommonTextArea label="Reason for the change" required value={form.changeReason} maxLength={500} error={errors.changeReason}
          placeholder="e.g. Client moved the meeting to the afternoon" onChange={(e) => set('changeReason', e.target.value)} />
      )}
    </div>
  );
};
