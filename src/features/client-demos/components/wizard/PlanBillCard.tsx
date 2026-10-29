import React from 'react';
import { BedDouble, Bus, Coffee, Paperclip, Trash2, Utensils } from 'lucide-react';
import { CommonInput, CommonSelect } from '../../../../components/ui/FormInputs';
import { ICON_DANGER } from '../../../../components/ui/actionTones';
import type { ClientCategory, TravelMode } from '../../types/clientDemo.types';
import { CLIENT_CATEGORY_LABELS, TRAVEL_MODE_LABELS, addDays, formatDayTime } from '../../utils/clientDemo';
import {
  OTHER_HOTEL,
  PLAN_SLOT_LABELS,
  clientSource,
  endOf,
  stayVendor,
  timeLabels,
  type ClientForm,
  type PlanBill,
  type PlanSlot,
} from '../../utils/planForm';
import { clashOf, type TimeBlock } from '../../utils/timeBlocks';
import { DateTimeRange } from '../DateTimeRange';

const FILE_TYPES = '.pdf,.png,.jpg,.jpeg,.webp';
const COPY_PREFIX = 'copy:';

const SLOT_ICONS: Record<PlanSlot, React.ReactNode> = {
  TRAVEL: <Bus className="w-4 h-4 text-sky-500" />,
  STAY: <BedDouble className="w-4 h-4 text-indigo-500" />,
  BREAKFAST: <Coffee className="w-4 h-4 text-orange-500" />,
  LUNCH: <Utensils className="w-4 h-4 text-orange-500" />,
  SNACKS: <Coffee className="w-4 h-4 text-orange-500" />,
  DINNER: <Utensils className="w-4 h-4 text-orange-500" />,
};

export const SlotIcon: React.FC<{ slot: PlanSlot }> = ({ slot }) => <>{SLOT_ICONS[slot]}</>;

type VendorKey = 'vendorName' | 'vendorAddress' | 'vendorMapLink' | 'vendorPhone' | 'vendorGstin';

/**
 * When a stay or journey starts and ends, picked as one range (a night's check-out or an overnight journey's arrival
 * falls on the next day). It starts on its day (`day`) or the day after, and ends by `latest`. Only forward times can
 * be picked: the end after the start, and a journey's departure no earlier than the journey before arrives (`after`). Time already
 * taken (`taken`: visits and other journeys for a journey, other nights for a stay) is shaded grey and can't be picked.
 * A start moved past the end, or one whose span now runs into taken time, clears the end time, to pick again.
 */
const StartEnd: React.FC<{
  bill: PlanBill;
  day: string;
  latest: string;
  after: string;
  taken: TimeBlock[];
  onChange: (patch: Partial<PlanBill>) => void;
}> = ({ bill, day, latest, after, taken, onChange }) => {
  const earliest = after.slice(0, 10) > day ? after.slice(0, 10) : day;
  const startDates = day ? [earliest, addDays(day, 1)].filter((date, i, all) => all.indexOf(date) === i && date <= addDays(day, 1)) : [];
  const change = (patch: Partial<PlanBill>) => {
    const next = { ...bill, ...patch };
    const nextStart = next.startTime ? `${next.startDate}T${next.startTime}` : '';
    const stale = nextStart && endOf(next) && (endOf(next) <= nextStart || !!clashOf(taken, nextStart, endOf(next)));
    onChange(stale ? { ...patch, endTime: '' } : patch);
  };
  return (
    <div className="space-y-1">
      <DateTimeRange labels={timeLabels(bill.slot)} required value={bill} onChange={change} startDates={startDates} latest={latest} taken={taken}
        isStartBlocked={(date, time) => !!after && `${date}T${time}` < after} />
      {after && bill.slot === 'TRAVEL' && (
        <p className="text-gray-500">Departs from when the journey before arrives ({formatDayTime(after.slice(0, 10), after.slice(11))}).</p>
      )}
    </div>
  );
};

/**
 * One planned journey, stay or meal of a day. A journey says how, from where and to where, and when it departs and
 * arrives (date and time, as it may arrive the next day); a day can hold several. A stay's hotel is picked from the
 * trip's hotel clients (its address, location, GSTIN and phone are filled in from the client), copied from a hotel typed
 * on another night, or typed in; its check-in and check-out dates and times are given too. The expected amount is
 * entered here; the invoice is optional and can be attached later on the demo.
 */
export const PlanBillCard: React.FC<{
  bill: PlanBill;
  /** Which journey of the day it is (1, 2 …); travel only. */
  number?: number;
  /** Its drag handle, to move it on its day. */
  handle?: React.ReactNode;
  /** When the journey before arrives ("2030-05-10T18:00"), blank when there is none or its arrival isn't given; travel only. */
  after?: string;
  /** Time other visits, journeys or nights already take, that this one can't overlap. */
  taken: TimeBlock[];
  /** The date of the bill's day, and the last date it may end (the day after the trip); blank until the trip's start is known. */
  day: string;
  latest: string;
  hotels: ClientForm[];
  /** Hotels typed on other nights, to stay at again. */
  typedHotels: PlanBill[];
  clients: ClientForm[];
  error?: string;
  onChange: (patch: Partial<PlanBill>) => void;
  onRemove: () => void;
}> = ({ bill, number, handle, after = '', taken, day, latest, hotels, typedHotels, clients, error, onChange, onRemove }) => {
  const stay = bill.slot === 'STAY';
  const travel = bill.slot === 'TRAVEL';
  const title = travel && number ? `${PLAN_SLOT_LABELS.TRAVEL} ${number}` : PLAN_SLOT_LABELS[bill.slot];
  const paper = travel ? 'ticket' : 'invoice';
  const linked = stay && bill.source !== OTHER_HOTEL && hotels.some((hotel) => clientSource(hotel.key) === bill.source);
  const vendor = stayVendor(bill, clients);
  const vendorField = (key: VendorKey, label: string, extra: Partial<React.ComponentProps<typeof CommonInput>> = {}) => (
    <CommonInput label={label} value={vendor[key]} readOnly={linked} onChange={(e) => onChange({ [key]: e.target.value })} {...extra} />
  );

  const chooseHotel = (value: string) => {
    if (value.startsWith(COPY_PREFIX)) {
      const from = typedHotels.find((other) => String(other.key) === value.slice(COPY_PREFIX.length));
      if (from) {
        onChange({ source: OTHER_HOTEL, vendorName: from.vendorName, vendorAddress: from.vendorAddress, vendorMapLink: from.vendorMapLink,
          vendorPhone: from.vendorPhone, vendorGstin: from.vendorGstin });
      }
      return;
    }
    const hotel = hotels.find((candidate) => clientSource(candidate.key) === value);
    // A client's details are copied too, so they stay if the client is later removed from the trip
    onChange(hotel ? { source: value, ...stayVendor({ ...bill, source: value }, clients) } : { source: OTHER_HOTEL });
  };
  const hotelOptions = [
    ...hotels.map((hotel) => ({ value: clientSource(hotel.key), label: `${hotel.clientName} · ${CLIENT_CATEGORY_LABELS[hotel.clientCategory as ClientCategory]} on this trip` })),
    ...typedHotels.map((other) => ({ value: `${COPY_PREFIX}${other.key}`, label: `${other.vendorName} · as on day ${other.dayNumber}` })),
    { value: OTHER_HOTEL, label: 'Another hotel (enter its details)' },
  ];

  return (
    <div role="group" aria-label={`${title} · day ${bill.dayNumber}`} className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          {handle}
          {SLOT_ICONS[bill.slot]} {title}
          {travel && bill.fromPlace.trim() && bill.toPlace.trim() && <span className="font-normal text-gray-500">· {bill.fromPlace.trim()} → {bill.toPlace.trim()}</span>}
        </h4>
        <button type="button" aria-label={`Remove ${title.toLowerCase()} of day ${bill.dayNumber}`} onClick={onRemove}
          className={`p-1.5 rounded-lg cursor-pointer ${ICON_DANGER}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {travel && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <CommonSelect label="Travel by" required value={bill.travelMode} placeholder="Choose how"
              options={(Object.keys(TRAVEL_MODE_LABELS) as TravelMode[]).map((mode) => ({ value: mode, label: TRAVEL_MODE_LABELS[mode] }))}
              onChange={(e) => onChange({ travelMode: e.target.value as TravelMode })} />
            <CommonInput label="From" required value={bill.fromPlace} maxLength={150} placeholder="e.g. Delhi" onChange={(e) => onChange({ fromPlace: e.target.value })} />
            <CommonInput label="To" required value={bill.toPlace} maxLength={150} placeholder="e.g. Manali" onChange={(e) => onChange({ toPlace: e.target.value })} />
            <CommonInput label="Expected amount (₹)" required value={bill.amount} inputMode="decimal" placeholder="0.00" onChange={(e) => onChange({ amount: e.target.value })} />
          </div>
          <StartEnd bill={bill} day={day} latest={latest} after={after} taken={taken} onChange={onChange} />
        </>
      )}
      {stay && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <CommonSelect label="Hotel / property" required value={linked ? bill.source : OTHER_HOTEL} options={hotelOptions}
                onChange={(e) => chooseHotel(e.target.value)} />
            </div>
            {vendorField('vendorName', 'Hotel name', { required: true, maxLength: 150 })}
            <div className="sm:col-span-2">{vendorField('vendorAddress', 'Hotel address', { maxLength: 300 })}</div>
            {vendorField('vendorMapLink', 'Hotel location (Google Maps)', { type: 'url', maxLength: 500, placeholder: 'https://maps.app.goo.gl/…' })}
            {vendorField('vendorGstin', 'Hotel GSTIN', { maxLength: 15, placeholder: '22AAAAA0000A1Z5' })}
            {vendorField('vendorPhone', 'Hotel phone', { type: 'tel', maxLength: 16 })}
            <CommonInput label="Expected amount (₹)" required value={bill.amount} inputMode="decimal" placeholder="0.00" onChange={(e) => onChange({ amount: e.target.value })} />
          </div>
          <StartEnd bill={bill} day={day} latest={latest} after="" taken={taken} onChange={onChange} />
        </>
      )}
      {!travel && !stay && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CommonInput label="Restaurant / place" required value={bill.vendorName} maxLength={150} onChange={(e) => onChange({ vendorName: e.target.value })} />
          <CommonInput label="GSTIN" value={bill.vendorGstin} maxLength={15} placeholder="Optional" onChange={(e) => onChange({ vendorGstin: e.target.value })} />
          <CommonInput label="Expected amount (₹)" required value={bill.amount} inputMode="decimal" placeholder="0.00" onChange={(e) => onChange({ amount: e.target.value })} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#0071e3]/40 text-[#0071e3] dark:text-blue-400 font-semibold cursor-pointer hover:bg-[#0071e3]/5">
          <Paperclip className="w-3.5 h-3.5" />
          {bill.file?.name ?? (bill.invoiceFileName ? `Replace ${bill.invoiceFileName}` : `Attach the ${paper} (optional)`)}
          <input type="file" accept={FILE_TYPES} className="sr-only" aria-label={`Invoice of ${title.toLowerCase()} day ${bill.dayNumber}`}
            onChange={(e) => onChange({ file: e.target.files?.[0] ?? null })} />
        </label>
        {error && <span className="text-rose-500">{error}</span>}
      </div>
    </div>
  );
};
