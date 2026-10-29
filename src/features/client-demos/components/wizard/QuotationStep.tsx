import React, { useState } from 'react';
import { Calculator, MapPin, Plus } from 'lucide-react';
import { CommonTextArea } from '../../../../components/ui/FormInputs';
import type { DemoDetail } from '../../types/clientDemo.types';
import { addDays, dayDate, formatDay, formatSlot, inrAmount } from '../../utils/clientDemo';
import {
  OTHER_HOTEL,
  PLAN_SLOTS,
  PLAN_SLOT_LABELS,
  billsTotal,
  endOf,
  extraAmount,
  orderedBills,
  previousJourney,
  proposedBudget,
  repeatable,
  stayClients,
  type PlanBill,
} from '../../utils/planForm';
import { planBlocks, takenFor } from '../../utils/timeBlocks';
import { BillOrderHandle } from './BillOrderHandle';
import { PlanBillCard, SlotIcon } from './PlanBillCard';
import { PlanField } from './PlanField';
import type { BillActions, PlanStepProps } from './planStepProps';

/**
 * Step 3: the quotation. Day by day, the planned journeys (as many as needed, each with its departure and arrival), the
 * night stay (check-in and check-out) and meals, each optional with its expected amount and, if there is one already,
 * its invoice. They become the demo's travel, stay and food bills; the travelling staff attach the invoices and record
 * actual amounts later on the demo. The proposed budget is their total plus any extra, which needs its reason.
 */
export const QuotationStep: React.FC<PlanStepProps & BillActions & { editing: DemoDetail | null; days: number }> = ({
  editing,
  days,
  onAddBill,
  onMoveBill,
  onChangeBill,
  onRemoveBill,
  ...props
}) => {
  const { form, errors, set } = props;
  const planned = billsTotal(form.bills);
  const extra = extraAmount(form);
  const hotels = stayClients(form);
  // Hotels typed on other nights, once each
  const typedHotels = (bill: PlanBill) => [...new Map(form.bills
    .filter((other) => other.slot === 'STAY' && other.dayNumber !== bill.dayNumber && other.source === OTHER_HOTEL && other.vendorName.trim())
    .map((other) => [other.vendorName.trim().toLowerCase(), other])).values()];
  const pastEnd = [...new Set(form.bills.filter((bill) => bill.dayNumber > days).map((bill) => bill.dayNumber))].sort((a, b) => a - b);
  const dayNumbers = [...Array.from({ length: days }, (_, index) => index + 1), ...pastEnd];
  const latest = form.startDate ? addDays(dayDate(form.startDate, days), 1) : '';
  const blocks = planBlocks(form);
  // The bill being dragged (its day and place on it) and the place it is over; it moves only within its day
  const [dragged, setDragged] = useState<{ day: number; index: number } | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const endDrag = () => {
    setDragged(null);
    setOverIndex(null);
  };
  const dropTarget = (day: number, index: number) => (dragged?.day === day ? {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (overIndex !== index) setOverIndex(index);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      onMoveBill(day, dragged.index, index);
      endDrag();
    },
  } : {});
  // A line above or below the place the dragged bill will take, on the side it is coming from
  const dropLine = (day: number, index: number) => {
    if (dragged?.day !== day || overIndex !== index || dragged.index === index) return '';
    return dragged.index < index ? 'shadow-[0_2px_0_#0071e3]' : 'shadow-[0_-2px_0_#0071e3]';
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Day by day <span className="font-normal text-gray-400">(all optional)</span></h2>
          <p className="text-gray-500">
            Add each day’s travel (as many journeys as needed, in the order they’re made), night stay and meals with their expected
            amounts. Drag a card by its handle (or use ↑ ↓ on it) to change its place on the day; journeys run in the order shown. Give the date with every time: a night’s check-out or an overnight journey’s arrival is on the next day. Times
            only go forward: an arrival after its departure, and each journey after the one before arrives. Time already taken by a client
            visit or another journey (or, for a night, another night) is shaded grey on the clock and can’t be picked. Invoices aren’t needed now: the
            travelling staff attach them on the demo later.
          </p>
        </div>
        {dayNumbers.map((day) => {
          const bills = orderedBills(form.bills.filter((bill) => bill.dayNumber === day));
          const visits = form.clients.filter((client) => Number(client.dayNumber) === day && client.clientName.trim());
          const addable = PLAN_SLOTS.filter((slot) => repeatable(slot) || !bills.some((bill) => bill.slot === slot));
          const beyond = day > days;
          const dayIso = form.startDate ? dayDate(form.startDate, day) : '';
          let journeys = 0;
          return (
            <section key={day} aria-label={`Day ${day}`} className={`rounded-2xl border p-4 space-y-3 ${beyond ? 'border-rose-500/40' : 'border-black/10 dark:border-white/10'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Day {day}{dayIso ? ` · ${formatDay(dayIso)}` : ''}
                  {beyond && <span className="ml-2 font-normal text-rose-500">past the end of the trip</span>}
                </h3>
                <span className="font-mono text-gray-500">{inrAmount(billsTotal(form.bills, day))}</span>
              </div>
              {visits.length > 0 && (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-[#0071e3]" />
                  {visits.map((client) => <span key={client.key}>{client.clientName} · {formatSlot(client.startTime, client.endTime)}</span>)}
                </p>
              )}
              {bills.map((bill, index) => {
                const number = bill.slot === 'TRAVEL' ? ++journeys : undefined;
                const title = number ? `travel ${number}` : PLAN_SLOT_LABELS[bill.slot].toLowerCase();
                return (
                  <div key={bill.key} {...dropTarget(day, index)}
                    className={`rounded-xl transition-opacity ${dragged?.day === day && dragged.index === index ? 'opacity-40' : ''} ${dropLine(day, index)}`}>
                    <PlanBillCard bill={bill} number={number} day={dayIso} latest={latest}
                      handle={bills.length > 1 && (
                        <BillOrderHandle title={`${title} of day ${day}`} index={index} count={bills.length}
                          onDragStart={() => setDragged({ day, index })} onDragEnd={endDrag} onMove={(from, to) => onMoveBill(day, from, to)} />
                      )}
                      after={bill.slot === 'TRAVEL' ? endOf(previousJourney(form.bills, day, bill)) : ''}
                      taken={takenFor(blocks, `bill-${bill.key}`, bill.slot === 'STAY' ? 'stay' : 'busy')}
                      hotels={hotels} typedHotels={typedHotels(bill)} clients={form.clients} error={errors[`bill-${bill.key}`]}
                      onChange={(patch) => onChangeBill(bill.key, patch)} onRemove={() => onRemoveBill(bill.key)} />
                  </div>
                );
              })}
              {!beyond && (
                <div className="flex flex-wrap gap-1.5">
                  {addable.map((slot) => {
                    const another = repeatable(slot) && bills.some((bill) => bill.slot === slot);
                    const label = another ? `Another ${PLAN_SLOT_LABELS[slot].toLowerCase()}` : PLAN_SLOT_LABELS[slot];
                    return (
                      <button key={slot} type="button" onClick={() => onAddBill(slot, day)} aria-label={`Add ${label.toLowerCase()} on day ${day}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#0071e3]/30 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/10 cursor-pointer">
                        <Plus className="w-3 h-3" /> <SlotIcon slot={slot} /> {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {editing && <p className="text-gray-500">Other bills of this demo are kept on its page.</p>}
      </div>

      <section aria-label="Budget" className="rounded-2xl border border-[#0071e3]/30 bg-[#0071e3]/[0.03] p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5"><Calculator className="w-4 h-4 text-[#0071e3]" /> Proposed budget</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          <div className="space-y-1">
            <p className="font-semibold text-gray-600 dark:text-gray-300">Day by day (worked out)</p>
            <p className="font-mono text-base font-semibold py-1.5" aria-label="Day-by-day total">{inrAmount(planned)}</p>
            <p className="text-gray-400">The travel, stays and meals above.</p>
          </div>
          <PlanField plan={props} name="extraBudget" label="Extra budget (₹)" inputMode="decimal" placeholder="0.00 (optional)" />
          <div className="space-y-1">
            <p className="font-semibold text-gray-600 dark:text-gray-300">Total proposed budget</p>
            <p className="font-mono text-base font-bold py-1.5 text-[#0071e3] dark:text-blue-400" aria-label="Total proposed budget">{inrAmount(proposedBudget(form))}</p>
            <p className="text-gray-400">What the approver approves.</p>
          </div>
        </div>
        {extra > 0 && (
          <CommonTextArea label={`Why the extra ${inrAmount(extra)} is needed, with its breakup`} required value={form.extraBudgetReason} maxLength={1000} rows={3}
            error={errors.extraBudgetReason} placeholder="e.g. Snow chains for the cab ₹1,200; local guide at Mall Road ₹800"
            onChange={(e) => set('extraBudgetReason', e.target.value)} />
        )}
        {editing?.status === 'APPROVED' && (
          <p className="text-gray-500">Changing the total (or the number of days) sends the quotation back for approval.</p>
        )}
      </section>
    </>
  );
};
