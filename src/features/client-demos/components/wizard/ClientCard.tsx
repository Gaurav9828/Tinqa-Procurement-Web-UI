import React from 'react';
import { Clock, Landmark, Loader2, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { CommonInput, CommonSelect } from '../../../../components/ui/FormInputs';
import { CHOICE_TONE, ICON_DANGER } from '../../../../components/ui/actionTones';
import { usePincodeLookup } from '../../../../hooks/usePincodeLookup';
import { PINCODE_MESSAGES } from '../../../../utils/pincode';
import type { ClientCategory } from '../../types/clientDemo.types';
import { CLIENT_CATEGORY_LABELS, dayDate, formatDay, hasLegalDetails } from '../../utils/clientDemo';
import type { ClientForm, PlanErrors } from '../../utils/planForm';
import { at, clashOf, planDayDate, type TimeBlock } from '../../utils/timeBlocks';
import { TimeSelect } from '../TimeSelect';

type TextKey = Exclude<keyof ClientForm, 'key' | 'clientCategory'>;

/**
 * One client of the trip: what kind of place, its own phone and email (which tell clients apart), where it is (city and
 * state come from the PIN code), its contact person, its legal details if it is a business, and when.
 */
export const ClientCard: React.FC<{
  client: ClientForm;
  index: number;
  days: number;
  startDate: string;
  errors: PlanErrors;
  /** Time other visits and journeys already take, shaded on the clock. */
  taken: TimeBlock[];
  removable: boolean;
  onChange: (patch: Partial<ClientForm>) => void;
  onRemove: () => void;
}> = ({ client, index, days, startDate, errors, taken, removable, onChange, onRemove }) => {
  const error = (field: string) => errors[`client-${client.key}-${field}`] || undefined;
  const field = (key: TextKey, label: string, extra: Partial<React.ComponentProps<typeof CommonInput>> = {}) => (
    <CommonInput label={label} value={client[key]} error={error(key)} onChange={(e) => onChange({ [key]: e.target.value })} {...extra} />
  );
  const dayLabel = (day: number) => (startDate ? `Day ${day} · ${formatDay(dayDate(startDate, day))}` : `Day ${day}`);
  const dayOptions = Array.from({ length: days }, (_, day) => ({ value: String(day + 1), label: dayLabel(day + 1) }));
  const name = client.clientName.trim() || `Client ${index + 1}`;
  const date = client.dayNumber ? planDayDate(startDate, Number(client.dayNumber)) : '';
  // A later start clears an end no longer after it, or one whose span now runs into taken time, to pick again
  const changeStart = (time: string) => {
    const stale = client.endTime && (client.endTime <= time || !!clashOf(taken, at(date, time), at(date, client.endTime)));
    onChange({ startTime: time, ...(stale ? { endTime: '' } : {}) });
  };

  // City and state come from the PIN code; typed in by hand only when the lookup service is unreachable. Changing the
  // PIN clears them, so filling blanks here never overwrites a saved plan's place on opening it.
  const pincodeLookup = usePincodeLookup(client.pincode, {
    onFound: (location) => {
      const patch: Partial<ClientForm> = {};
      if (!client.city.trim()) patch.city = location.city;
      if (!client.state.trim()) patch.state = location.state;
      if (Object.keys(patch).length) onChange(patch);
    },
  });
  const placeLocked = pincodeLookup.locked;
  const pincodeHints: Record<typeof pincodeLookup.status, React.ReactNode> = {
    idle: <p className="text-gray-400">City and state are filled from the PIN code.</p>,
    found: <p className="text-gray-400">City and state are filled from the PIN code.</p>,
    loading: (
      <p className="text-gray-400 flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> {PINCODE_MESSAGES.loading}
      </p>
    ),
    notFound: <p className="text-rose-500">{PINCODE_MESSAGES.notFound}</p>,
    error: (
      <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
        {PINCODE_MESSAGES.error}
        <button type="button" onClick={pincodeLookup.retry} className="inline-flex items-center gap-0.5 font-semibold underline cursor-pointer">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </p>
    ),
  };
  const pincodeHint = pincodeHints[pincodeLookup.status];

  return (
    <article aria-label={`Client ${index + 1}`} className="rounded-2xl border border-black/10 dark:border-white/10 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0071e3] text-white text-[10px] font-bold mr-1.5">{index + 1}</span>
          {name}
        </h3>
        {removable && (
          <button type="button" aria-label={`Remove ${name}`} onClick={onRemove} className={`p-1.5 rounded-lg cursor-pointer ${ICON_DANGER}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Kind of client <span className="text-rose-500">*</span></p>
        <div role="radiogroup" aria-label="Kind of client" className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(CLIENT_CATEGORY_LABELS) as ClientCategory[]).map((category) => (
            <button key={category} type="button" role="radio" aria-checked={client.clientCategory === category} onClick={() => onChange({ clientCategory: category })}
              className={`px-3 py-2.5 rounded-xl border font-semibold cursor-pointer ${client.clientCategory === category ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}>
              {CLIENT_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
        {error('clientCategory') && <p className="text-rose-500">{error('clientCategory')}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {client.clientCategory === 'OTHER' && (
          <div className="sm:col-span-2">{field('clientCategoryOther', 'What kind of place', { required: true, maxLength: 100, placeholder: 'e.g. School, Gym, Showroom' })}</div>
        )}
        <div className="sm:col-span-2">{field('clientName', 'Client name', { required: true, maxLength: 150, placeholder: 'e.g. Hotel Sunrise' })}</div>
        {field('clientPhone', 'Client phone', { required: true, type: 'tel', maxLength: 16, placeholder: 'Front desk / reception, +919876543210' })}
        {field('clientEmail', 'Client email', { type: 'email', maxLength: 255, placeholder: 'e.g. frontdesk@hotelsunrise.com' })}
        <p className="sm:col-span-2 text-gray-400 -mt-1">
          The client’s own number and email, not a person’s. They tell clients apart: the same client can’t be visited twice in a row on one day.
        </p>
        <div className="sm:col-span-2">{field('addressLine', 'Address', { required: true, maxLength: 300 })}</div>
        <div className="space-y-1">
          {field('pincode', 'PIN code', {
            required: true,
            inputMode: 'numeric',
            maxLength: 6,
            placeholder: 'e.g. 302001',
            // A new PIN code brings its own city and state
            onChange: (e) => {
              const pincode = e.target.value.replace(/\D/g, '');
              onChange(pincode === client.pincode ? { pincode } : { pincode, city: '', state: '' });
            },
          })}
          {pincodeHint}
        </div>
        {field('city', 'City', { required: true, maxLength: 100, readOnly: placeLocked })}
        {field('state', 'State', { maxLength: 100, readOnly: placeLocked })}
        {field('mapLink', 'Location (Google Maps link)', { type: 'url', maxLength: 500, placeholder: 'https://maps.app.goo.gl/…' })}
        <p className="sm:col-span-2 text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 pt-1">
          <UserRound className="w-3.5 h-3.5 text-[#0071e3]" /> Contact person
          <span className="font-normal text-gray-400">· may be the same person at several clients</span>
        </p>
        {field('contactPerson', 'Contact person', { maxLength: 100 })}
        {field('contactPhone', 'Contact phone', { required: true, type: 'tel', maxLength: 16, placeholder: '+919876543210' })}
        {field('contactEmail', 'Contact email', { type: 'email', maxLength: 255 })}
      </div>

      {hasLegalDetails(client.clientCategory) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-indigo-500" /> Legal details <span className="font-normal text-gray-400">(optional)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field('legalName', 'Legal (registered) name', { maxLength: 150, placeholder: 'As on the GST certificate' })}
            {field('gstin', 'GSTIN', { maxLength: 15, placeholder: '22AAAAA0000A1Z5' })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#0071e3]" /> Visit time <span className="text-rose-500">*</span>
          <span className="font-normal text-gray-400">· when the staff are expected at this client</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CommonSelect label="Day" required value={client.dayNumber} options={dayOptions} placeholder="Choose the day" error={error('dayNumber')}
            onChange={(e) => onChange({ dayNumber: e.target.value })} />
          <TimeSelect label="From" required value={client.startTime} error={error('startTime')} date={date} taken={taken} onChange={changeStart} />
          <TimeSelect label="To" required value={client.endTime} error={error('endTime')} onChange={(time) => onChange({ endTime: time })}
            date={date} taken={taken} startAt={client.startTime ? at(date, client.startTime) : ''}
            isBlocked={(time) => !!client.startTime && time <= client.startTime} />
        </div>
        {error('slot') && <p className="text-rose-500">{error('slot')}</p>}
      </div>
    </article>
  );
};
