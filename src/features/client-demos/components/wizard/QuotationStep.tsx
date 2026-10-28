import React from 'react';
import { BedDouble, Plus, Trash2 } from 'lucide-react';
import { CommonInput } from '../../../../components/ui/FormInputs';
import { ICON_DANGER } from '../../../../components/ui/actionTones';
import type { DemoDetail } from '../../types/clientDemo.types';
import { dayDate, formatDay, inrAmount } from '../../utils/clientDemo';
import { staysTotal, type StayForm } from '../../utils/planForm';
import { PlanField } from './PlanField';
import type { PlanStepProps } from './planStepProps';

const StayRow: React.FC<{
  stay: StayForm;
  days: number;
  startDate: string;
  error?: string;
  onChange: (patch: Partial<StayForm>) => void;
  onRemove: () => void;
}> = ({ stay, days, startDate, error, onChange, onRemove }) => (
  <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-2">
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
      <label className="text-[10px] font-semibold text-gray-500">
        Day
        <select aria-label="Stay day" value={stay.dayNumber} onChange={(e) => onChange({ dayNumber: e.target.value })}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-black/20 dark:border-white/20 bg-transparent text-sm">
          {Array.from({ length: days }, (_, index) => (
            <option key={index + 1} value={index + 1}>Day {index + 1}{startDate ? ` · ${formatDay(dayDate(startDate, index + 1))}` : ''}</option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2"><CommonInput label="Hotel name" required value={stay.hotelName} maxLength={150} onChange={(e) => onChange({ hotelName: e.target.value })} /></div>
      <CommonInput label="Expected amount (₹)" required value={stay.amount} inputMode="decimal" onChange={(e) => onChange({ amount: e.target.value })} />
      <div className="sm:col-span-2"><CommonInput label="Hotel address" value={stay.hotelAddress} maxLength={300} onChange={(e) => onChange({ hotelAddress: e.target.value })} /></div>
      <CommonInput label="Location (Google Maps)" type="url" value={stay.hotelMapLink} maxLength={500} onChange={(e) => onChange({ hotelMapLink: e.target.value })} />
      <CommonInput label="Hotel GSTIN" value={stay.hotelGstin} maxLength={15} onChange={(e) => onChange({ hotelGstin: e.target.value })} />
      <CommonInput label="Hotel phone" type="tel" value={stay.hotelPhone} maxLength={16} onChange={(e) => onChange({ hotelPhone: e.target.value })} />
    </div>
    <div className="flex items-center justify-between">
      <span className="text-rose-500">{error}</span>
      <button type="button" aria-label="Remove this night" onClick={onRemove} className={`p-1.5 rounded-lg cursor-pointer ${ICON_DANGER}`}>
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

/**
 * Step 3: the quotation, i.e. the proposed budget and (for a new demo) an optional schedule of stay, which hotel each
 * day. Planned stays become the demo's first stay bills; their invoices and amounts are changed later on the demo.
 */
export const QuotationStep: React.FC<PlanStepProps & {
  editing: DemoDetail | null;
  isNew: boolean;
  days: number;
  stays: StayForm[];
  onAddStay: () => void;
  onChangeStay: (key: number, patch: Partial<StayForm>) => void;
  onRemoveStay: (key: number) => void;
}> = ({ editing, isNew, days, stays, onAddStay, onChangeStay, onRemoveStay, ...props }) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
      <PlanField plan={props} name="proposedBudget" label="Proposed budget (₹)" required inputMode="decimal" placeholder="All stay, food and travel together" />
      <p className="text-gray-500 pt-2">
        The approver sees the budget against what is actually spent.
        {editing?.status === 'APPROVED' && ' Changing it (or the number of days) sends the quotation back for approval.'}
      </p>
    </div>
    {isNew ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-indigo-500" /> Schedule of stay <span className="font-normal text-gray-400">(optional)</span>
            </h2>
            <p className="text-gray-500">Which hotel each day, with its location and GST details. Invoices and amounts can be changed later on the demo.</p>
          </div>
          <button type="button" onClick={onAddStay}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#0071e3]/40 text-[#0071e3] dark:text-blue-400 font-semibold hover:bg-[#0071e3]/10 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add a night
          </button>
        </div>
        {stays.map((stay) => (
          <StayRow key={stay.key} stay={stay} days={days} startDate={props.form.startDate} error={props.errors[`stay-${stay.key}`]}
            onChange={(patch) => onChangeStay(stay.key, patch)} onRemove={() => onRemoveStay(stay.key)} />
        ))}
        {stays.length > 0 && <p className="text-gray-500">Planned stays: <strong>{inrAmount(staysTotal(stays))}</strong></p>}
      </div>
    ) : (
      <p className="text-gray-500">The stays and every other bill of this demo are kept on its page.</p>
    )}
  </>
);
