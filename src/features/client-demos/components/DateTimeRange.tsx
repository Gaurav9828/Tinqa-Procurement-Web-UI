import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ArrowRight, CalendarClock, MoonStar } from 'lucide-react';
import { usePopover } from '../hooks/usePopover';
import { addDays, daysBetween, formatDay, formatTime } from '../utils/clientDemo';
import { at, datesFrom, spanLength, type DateTimeSpan, type TimeBlock } from '../utils/timeBlocks';
import { ClockPanel, type ClockRules } from './TimeSelect';

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 560;
const SHORT_DAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
const MONTH = new Intl.DateTimeFormat('en-IN', { month: 'short' });

type Side = 'start' | 'end';

const dateOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const whenText = (date: string, time: string) => {
  if (!date && !time) return 'Choose';
  return [date ? SHORT_DAY.format(dateOf(date)) : 'date?', time ? formatTime(time) : 'time?'].join(' · ');
};

interface EndProps {
  name: string;
  text: string;
  onClick: () => void;
}

/** One end of the range on the field, opening the panel on it. */
const EndButton: React.FC<EndProps & { isActive: boolean }> = ({ name, text, isActive, onClick }) => (
  <button type="button" aria-label={name} aria-haspopup="dialog" aria-expanded={isActive} onClick={onClick}
    className={`flex-1 min-w-0 text-left px-2 py-1 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] ${
      isActive ? 'bg-[#0071e3]/10' : ''}`}>
    <span className="block text-[11px] font-medium text-gray-500">{name}</span>
    <span className={`block truncate text-sm ${text === 'Choose' ? 'text-gray-400' : 'text-[#1d1d1f] dark:text-[#f5f5f7]'}`}>{text}</span>
  </button>
);

/** One end of the range in the panel; the end can't be picked before the start is. */
const SideTab: React.FC<EndProps & { isSelected: boolean; isDisabled?: boolean }> = ({ name, text, isSelected, isDisabled, onClick }) => (
  <button type="button" role="tab" aria-selected={isSelected} disabled={isDisabled} onClick={onClick}
    className={`flex-1 rounded-lg px-2 py-1.5 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
      isSelected ? 'bg-[#0071e3] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'}`}>
    <span className="block font-semibold">{name}</span>
    <span className={`block truncate ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{text}</span>
  </button>
);

/** The days to pick from, as a row of chips: weekday, date, and for an end how many days after the start it is. */
const DayStrip: React.FC<{ label: string; dates: string[]; chosen: string; from: string; onPick: (date: string) => void }> = ({
  label, dates, chosen, from, onPick,
}) => (
  <div role="radiogroup" aria-label={label} className="flex gap-1.5 overflow-x-auto pb-1">
    {dates.map((day) => {
      const shown = dateOf(day);
      const later = from ? daysBetween(from, day) : 0;
      return (
        <button key={day} type="button" role="radio" aria-checked={chosen === day} aria-label={formatDay(day)} onClick={() => onPick(day)}
          className={`shrink-0 w-14 rounded-xl border px-1 py-1.5 text-center cursor-pointer ${chosen === day
            ? 'border-[#0071e3] bg-[#0071e3] text-white'
            : 'border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-[#f5f5f7] hover:border-[#0071e3]/60'}`}>
          <span className="block text-[10px] uppercase opacity-70">{WEEKDAY.format(shown)}</span>
          <span className="block text-base font-semibold leading-tight">{shown.getDate()}</span>
          <span className="block text-[10px] opacity-70">{later > 0 ? `+${later} day` : MONTH.format(shown)}</span>
        </button>
      );
    })}
  </div>
);

/** One end's day and time: the day from the strip, then the time on the clock for that day. */
const SidePicker: React.FC<{
  label: string;
  date: string;
  time: string;
  dates: string[];
  from: string;
  rules: ClockRules;
  onPickDate: (date: string) => void;
  onPickTime: (time: string) => void;
}> = ({ label, date, time, dates, from, rules, onPickDate, onPickTime }) => {
  if (!dates.length) return <p className="text-gray-500">Choose the trip&apos;s start date first.</p>;
  return (
    <>
      <DayStrip label={`${label} date`} dates={dates} chosen={date} from={from} onPick={onPickDate} />
      {date
        ? <ClockPanel key={date} value={time} onPick={onPickTime} {...rules} />
        : <p className="text-gray-500">Pick the {label.toLowerCase()} day, then its time.</p>}
    </>
  );
};

/**
 * When a journey or stay starts and ends, picked as one range: a single field shows both ends and how long it lasts,
 * and opens one panel where the start's day and time are picked, then the end's. Days are picked from the ones allowed
 * (`startDates`; the end from the start's day to `latest`), times on the clock, never typed. Time already taken
 * (`taken`) is shaded grey and can't be picked, nor can an end before its start or a start `isStartBlocked` refuses.
 * Picking the start moves to the end, its day following the start's when it was before it; picking the end closes it.
 */
export const DateTimeRange: React.FC<{
  /** What each end is called ("Departure", "Arrival"). */
  labels: [string, string];
  value: DateTimeSpan;
  onChange: (patch: Partial<DateTimeSpan>) => void;
  /** The days it may start on; none until the trip's dates are known. */
  startDates: string[];
  /** The last day it may end on. */
  latest: string;
  taken: TimeBlock[];
  isStartBlocked?: (date: string, time: string) => boolean;
  required?: boolean;
  errors?: { start?: string; end?: string };
}> = ({ labels: [start, end], value, onChange, startDates, latest, taken, isStartBlocked, required, errors = {} }) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const { open, setOpen, panelRef, position } = usePopover(triggerRef, PANEL_HEIGHT, PANEL_WIDTH);
  const [side, setSide] = useState<Side>('start');

  const startAt = value.startDate && value.startTime ? at(value.startDate, value.startTime) : '';
  const firstDay = value.startDate || startDates[0] || '';
  const endDates = datesFrom(firstDay, latest || (firstDay && addDays(firstDay, 1)));
  const nights = value.startDate && value.endDate ? daysBetween(value.startDate, value.endDate) : 0;
  const length = spanLength(value);
  const error = errors.start || errors.end;

  const show = (which: Side) => {
    setSide(which === 'end' && !startAt ? 'start' : which);
    setOpen(true);
  };
  const pickDate = (date: string) => {
    if (side === 'end') onChange({ endDate: date });
    else onChange({ startDate: date, ...(!value.endDate || value.endDate < date ? { endDate: date } : {}) });
  };
  const pickTime = (time: string) => {
    if (side === 'end') {
      onChange({ endTime: time });
      setOpen(false);
      return;
    }
    onChange({ startTime: time, ...(!value.endDate || value.endDate < value.startDate ? { endDate: value.startDate } : {}) });
    setSide('end');
  };

  const shown = side === 'start'
    ? { label: start, date: value.startDate, time: value.startTime, dates: startDates, from: '', rules: { date: value.startDate, taken,
      isBlocked: (time: string) => !!value.startDate && !!isStartBlocked?.(value.startDate, time) } }
    : { label: end, date: value.endDate, time: value.endTime, dates: endDates, from: value.startDate, rules: { date: value.endDate, taken, startAt,
      isBlocked: (time: string) => !!startAt && !!value.endDate && at(value.endDate, time) <= startAt } };

  let borderTone = 'border-black/20 dark:border-white/20';
  if (error) borderTone = 'border-red-500/80';
  else if (open) borderTone = 'border-[#0071e3] dark:border-blue-400';
  return (
    <div className="relative pt-2 space-y-1 w-full sm:col-span-2">
      <div ref={triggerRef} tabIndex={-1} className={`relative rounded-xl border transition-colors ${borderTone}`}>
        <div className="absolute -top-2.5 left-3 px-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 pointer-events-none z-10 rounded-sm bg-white dark:bg-[#161617]">
          <span>{start} → {end}</span>
          {required && <span className="text-red-500 font-bold">*</span>}
        </div>
        <div className="flex items-center gap-1 px-1.5 py-1.5">
          <CalendarClock className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
          <EndButton name={start} text={whenText(value.startDate, value.startTime)} isActive={open && side === 'start'} onClick={() => show('start')} />
          <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
          <EndButton name={end} text={whenText(value.endDate, value.endTime)} isActive={open && side === 'end'} onClick={() => show('end')} />
          {length && <span className="shrink-0 rounded-full bg-[#0071e3]/10 text-[#0071e3] px-2 py-0.5 text-[11px] font-semibold mr-1">{length}</span>}
        </div>
      </div>
      {nights > 0 && (
        <p className="flex items-center gap-1 px-1 text-xs text-indigo-600 dark:text-indigo-400">
          <MoonStar className="w-3.5 h-3.5" /> {end} on {formatDay(value.endDate)}, {nights === 1 ? 'the next day' : `${nights} days later`}
        </p>
      )}
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1 px-1 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}

      {open && createPortal(
        <div ref={panelRef} role="dialog" aria-label={`${start} and ${end} clock`} style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
          className="fixed z-[60] rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-2xl p-3 space-y-3 text-xs">
          <div role="tablist" aria-label={`${start} or ${end}`} className="flex gap-1 rounded-xl border border-black/10 dark:border-white/10 p-1">
            <SideTab name={start} text={whenText(value.startDate, value.startTime)} isSelected={side === 'start'} onClick={() => setSide('start')} />
            <SideTab name={end} text={whenText(value.endDate, value.endTime)} isSelected={side === 'end'} isDisabled={!startAt} onClick={() => setSide('end')} />
          </div>
          <SidePicker key={side} {...shown} onPickDate={pickDate} onPickTime={pickTime} />
          <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 pt-2">
            <span className="text-gray-500">{length ? `Lasts ${length}` : `Pick the ${start.toLowerCase()}, then the ${end.toLowerCase()}`}</span>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 rounded-lg font-semibold text-[#0071e3] hover:bg-[#0071e3]/10 cursor-pointer">
              Done
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
