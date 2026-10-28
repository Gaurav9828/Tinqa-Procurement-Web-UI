import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CommonTextArea } from '../../../../components/ui/FormInputs';
import type { DemoDetail, StaffMember } from '../../types/clientDemo.types';
import { CLIENT_CATEGORY_LABELS, DEMO_TYPE_LABELS, formatDay, formatTime, inrAmount } from '../../utils/clientDemo';
import { staysTotal, type StayForm } from '../../utils/planForm';
import type { PlanStepProps } from './planStepProps';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Step 4: everything planned, at a glance, with the reason for the change when an approved demo is edited. */
export const ReviewStep: React.FC<PlanStepProps & {
  editing: DemoDetail | null;
  isNew: boolean;
  days: number;
  stays: StayForm[];
  staffById: Map<number, StaffMember>;
}> = ({ editing, isNew, days, stays, staffById, form, errors, set }) => {
  const planned = staysTotal(stays);
  const category = form.clientCategory === 'OTHER' ? form.clientCategoryOther : form.clientCategory && CLIENT_CATEGORY_LABELS[form.clientCategory];
  let plannedStays = 'On the demo’s page';
  if (isNew) plannedStays = stays.length ? `${plural(stays.length, 'night', 'nights')} · ${inrAmount(planned)}` : 'None';
  const approvalChange = editing?.status === 'APPROVED'
    && (Number(form.proposedBudget) !== editing.proposedBudget || Number(form.numberOfDays) !== editing.numberOfDays);
  const rows: [string, string][] = [
    ['Client', `${form.clientName} · ${category || ''}`],
    ['Contact', [form.contactPerson, form.contactPhone, form.contactEmail].filter(Boolean).join(' · ')],
    ['Address', [form.addressLine, form.city, form.state, form.pincode].filter(Boolean).join(', ')],
    ['Type', form.demoType ? DEMO_TYPE_LABELS[form.demoType] : ''],
    ['When', `${formatDay(form.startDate)} at ${formatTime(form.startTime)} · ${plural(days, 'day', 'days')}`],
    ['Attending staff', form.staffEmployeeIds.map((id) => staffById.get(id)?.name ?? `#${id}`).join(', ')],
    ['Proposed budget', inrAmount(Number(form.proposedBudget))],
    ['Planned stays', plannedStays],
  ];

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2 border-b border-black/5 dark:border-white/5 py-1.5">
            <dt className="w-32 shrink-0 text-gray-400">{label}</dt>
            <dd className="text-gray-800 dark:text-gray-200 break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      {form.mapLink && <a href={form.mapLink} target="_blank" rel="noopener noreferrer" className="text-[#0071e3] font-semibold hover:underline">Open the client’s location</a>}
      {Number(form.proposedBudget) > 0 && planned > Number(form.proposedBudget) && (
        <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" /> The planned stays alone are more than the budget.</p>
      )}
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
