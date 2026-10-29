import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Clock } from 'lucide-react';
import { formatTime } from '../utils/clientDemo';
import { usePopover } from '../hooks/usePopover';
import { at, clashOf, insideTaken, takenOn, type TakenRange, type TimeBlock } from '../utils/timeBlocks';

const SIZE = 232;
const CENTER = SIZE / 2;
const NUMBER_RADIUS = 88;
const BAND_INNER = 66;
const BAND_OUTER = 112;
const PANEL_WIDTH = 280;
const PANEL_HEIGHT = 440;
const MINUTES = Array.from({ length: 60 }, (_, m) => m);

type Face = 'hour' | 'minute';

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;
const twelve = (hour: number) => ((hour + 11) % 12) + 1;
const hourLabel = (hour: number) => `${twelve(hour)} ${hour < 12 ? 'am' : 'pm'}`;
const clockLabel = (minutes: number) => (minutes >= 24 * 60 ? 'midnight' : formatTime(timeOf(Math.floor(minutes / 60), minutes % 60)));

// Where a point at an angle (degrees clockwise from 12) and radius sits on the dial
const point = (degrees: number, radius: number) => {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(radians), y: CENTER + radius * Math.sin(radians) };
};

// A ring slice from one angle to another; a full turn is drawn as two halves, as one arc can't close on itself
const slice = (from: number, to: number): string => {
  if (to - from >= 359.99) return `${slice(from, from + 180)} ${slice(from + 180, from + 360)}`;
  const large = to - from > 180 ? 1 : 0;
  const [a, b, c, d] = [point(from, BAND_OUTER), point(to, BAND_OUTER), point(to, BAND_INNER), point(from, BAND_INNER)];
  return `M${a.x} ${a.y} A${BAND_OUTER} ${BAND_OUTER} 0 ${large} 1 ${b.x} ${b.y} L${c.x} ${c.y} A${BAND_INNER} ${BAND_INNER} 0 ${large} 0 ${d.x} ${d.y}Z`;
};

// The taken ranges within a window of the day (the half-day on the hour face, the hour on the minute face), as slices
const takenSlices = (ranges: TakenRange[], start: number, length: number): string[] =>
  ranges
    .map((range) => [Math.max(range.from, start), Math.min(range.to, start + length)])
    .filter(([from, to]) => to > from)
    .map(([from, to]) => slice(((from - start) / length) * 360, ((to - start) / length) * 360));

// A number on the dial: chosen (blue), taken by something else (grey), out of order (faint), or free
const numberTone = (isSelected: boolean, isTaken: boolean, isOff: boolean): string => {
  if (isSelected) return 'bg-[#0071e3] text-white';
  if (isTaken) return 'bg-gray-200/80 dark:bg-neutral-700 text-gray-400 dark:text-gray-500 cursor-not-allowed';
  if (isOff) return 'text-gray-300 dark:text-gray-600 cursor-not-allowed';
  return 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-[#0071e3]/10 cursor-pointer';
};

// Where on the face (degrees clockwise from 12) a pointer is
const degreesAt = (event: React.MouseEvent<HTMLElement | SVGSVGElement>): number | null => {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width) return null;
  return ((Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180) / Math.PI + 450) % 360;
};

// Where the face's hand points (degrees, null before a time of it is chosen) and its taken time, as slices
const handAndSlices = (face: Face, pm: boolean, hour: number | null, minuteOf: (h: number) => number | null, ranges: TakenRange[]) => {
  if (face === 'hour') {
    return { hand: hour !== null && hour >= 12 === pm ? (hour % 12) * 30 : null, slices: takenSlices(ranges, pm ? 720 : 0, 720) };
  }
  if (hour === null) return { hand: null, slices: [] };
  const minute = minuteOf(hour);
  return { hand: minute === null ? null : minute * 6, slices: takenSlices(ranges, hour * 60, 60) };
};

interface DialProps {
  face: Face;
  pm: boolean;
  /** The hour picked so far, null before one is. */
  hour: number | null;
  value: string;
  ranges: TakenRange[];
  /** Whether a time can't be picked, and whether it lies in taken time (shaded grey). */
  blocked: (time: string) => boolean;
  occupied: (time: string) => boolean;
  onHour: (hour: number) => void;
  onMinute: (minute: number) => void;
}

/**
 * The round face: twelve hours of the chosen half-day, or the sixty minutes of the chosen hour, taken time in grey. The
 * minute face shows only the five-minute marks: the exact minute is picked by pointing anywhere around the face, the hand
 * following the pointer and the minute it would pick shown in the middle.
 */
const Dial: React.FC<DialProps> = ({ face, pm, hour, value, ranges, blocked, occupied, onHour, onMinute }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const minuteOf = (h: number) => (value && Number(value.slice(0, 2)) === h ? Number(value.slice(3, 5)) : null);
  const hourOpen = (h: number) => MINUTES.some((m) => !blocked(timeOf(h, m)));

  // A click between the numbers picks the nearest hour or minute
  const pickAtPointer = (event: React.MouseEvent<SVGSVGElement>) => {
    const degrees = degreesAt(event);
    if (degrees === null) return;
    if (face === 'hour') {
      const h = (Math.round(degrees / 30) % 12) + (pm ? 12 : 0);
      if (hourOpen(h)) onHour(h);
    } else if (hour !== null) {
      const m = Math.round(degrees / 6) % 60;
      if (!blocked(timeOf(hour, m))) onMinute(m);
    }
  };
  const followPointer = (event: React.MouseEvent<HTMLDivElement>) => {
    const degrees = face === 'minute' && hour !== null ? degreesAt(event) : null;
    setHovered(degrees === null ? null : Math.round(degrees / 6) % 60);
  };

  const { hand, slices } = handAndSlices(face, pm, hour, minuteOf, ranges);
  const tip = hand === null ? null : point(hand, NUMBER_RADIUS);
  const preview = face === 'minute' && hour !== null && hovered !== null ? { time: timeOf(hour, hovered), at: point(hovered * 6, NUMBER_RADIUS) } : null;
  const previewOff = !!preview && blocked(preview.time);

  const hourButton = (index: number) => {
    const h = index + (pm ? 12 : 0);
    const spot = point(index * 30, NUMBER_RADIUS);
    const allTaken = !hourOpen(h) && MINUTES.every((m) => occupied(timeOf(h, m)));
    return (
      <button key={h} type="button" aria-label={hourLabel(h)} disabled={!hourOpen(h)} onClick={() => onHour(h)} style={{ left: spot.x, top: spot.y }}
        className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-sm font-semibold ${numberTone(hour === h, allTaken, !hourOpen(h))}`}>
        {twelve(h)}
      </button>
    );
  };
  // The five-minute marks are numbered; the minutes between them are unmarked spots, seen only when focused by keyboard
  const minuteButton = (h: number, m: number) => {
    const time = timeOf(h, m);
    const spot = point(m * 6, NUMBER_RADIUS);
    const off = blocked(time);
    const tone = m % 5 === 0
      ? `w-8 h-8 text-xs font-semibold ${numberTone(value === time, off && occupied(time), off)}`
      : 'w-3 h-3 opacity-0 focus-visible:opacity-100 bg-[#0071e3] cursor-pointer disabled:cursor-not-allowed';
    return (
      <button key={m} type="button" aria-label={formatTime(time)} disabled={off} onClick={() => onMinute(m)} style={{ left: spot.x, top: spot.y }}
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${tone}`}>
        {m % 5 === 0 ? pad(m) : null}
      </button>
    );
  };

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }} onMouseMove={followPointer} onMouseLeave={() => setHovered(null)}>
      <svg width={SIZE} height={SIZE} className="absolute inset-0 cursor-pointer" onClick={pickAtPointer} aria-hidden>
        <circle cx={CENTER} cy={CENTER} r={BAND_OUTER + 2} className="fill-gray-100 dark:fill-neutral-800" />
        {slices.map((path) => <path key={path} d={path} className="fill-gray-300 dark:fill-neutral-600" />)}
        {preview && (
          <>
            <line x1={CENTER} y1={CENTER} x2={preview.at.x} y2={preview.at.y} className={previewOff ? 'stroke-gray-400' : 'stroke-[#0071e3]/40'} strokeWidth={2} />
            <circle cx={preview.at.x} cy={preview.at.y} r={13} className={previewOff ? 'fill-gray-400/20' : 'fill-[#0071e3]/15'} />
          </>
        )}
        {tip && <line x1={CENTER} y1={CENTER} x2={tip.x} y2={tip.y} className="stroke-[#0071e3]" strokeWidth={2} />}
        {tip && face === 'minute' && hand !== null && (hand / 6) % 5 !== 0 && <circle cx={tip.x} cy={tip.y} r={5} className="fill-[#0071e3]" />}
        <circle cx={CENTER} cy={CENTER} r={3} className="fill-[#0071e3]" />
      </svg>
      {preview && (
        <span aria-hidden style={{ left: CENTER, top: CENTER + 22 }}
          className={`absolute -translate-x-1/2 pointer-events-none rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
            previewOff ? 'bg-gray-200 dark:bg-neutral-700 text-gray-500' : 'bg-[#0071e3] text-white'}`}>
          {previewOff ? `${formatTime(preview.time)} · taken` : formatTime(preview.time)}
        </span>
      )}
      {face === 'hour' && Array.from({ length: 12 }, (_, index) => hourButton(index))}
      {face === 'minute' && hour !== null && MINUTES.map((m) => minuteButton(hour, m))}
    </div>
  );
};

export interface ClockRules {
  /** The date the time is on ("2030-05-10"), to know what is taken then; blank when not known yet. */
  date?: string;
  /** Others' time this one can't overlap. */
  taken?: TimeBlock[];
  /** For an end time, when its span starts ("2030-05-10T18:00"). */
  startAt?: string;
  /** True for a time that can't be picked. */
  isBlocked?: (time: string) => boolean;
}

/**
 * The clock itself: the hour first (am or pm), then the exact minute, on a round face. Time already taken that day is
 * shaded grey and listed below; it can't be picked, nor (for an end time, `startAt` given) a time that would run over
 * it, nor one `isBlocked` refuses. Opens on the chosen time, or on the half of the day where the first free hour is.
 */
export const ClockPanel: React.FC<ClockRules & { value: string; onPick: (time: string) => void }> = ({
  value, onPick, date = '', taken = [], startAt = '', isBlocked,
}) => {
  const occupied = (time: string) => !!date && insideTaken(taken, at(date, time));
  // A start can't be in taken time, and an end can't make its span run over any; the time already chosen stays as it is
  const runsOver = (time: string) => (startAt ? !!date && !!clashOf(taken, startAt, at(date, time)) : occupied(time));
  const blocked = (time: string) => time !== value && (!!isBlocked?.(time) || runsOver(time));
  const current = value ? Number(value.slice(0, 2)) : null;
  const [face, setFace] = useState<Face>('hour');
  const [hour, setHour] = useState<number | null>(current);
  const [pm, setPm] = useState(() => {
    const firstFree = Array.from({ length: 24 }, (_, h) => h).find((h) => MINUTES.some((m) => !blocked(timeOf(h, m)))) ?? 0;
    return (current ?? firstFree) >= 12;
  });

  const pickHour = (h: number) => {
    setHour(h);
    setFace('minute');
  };
  const pickMinute = (m: number) => {
    if (hour !== null) onPick(timeOf(hour, m));
  };
  const switchHalf = (toPm: boolean) => {
    setPm(toPm);
    if (hour !== null && hour >= 12 !== toPm) setHour(null);
    setFace('hour');
  };

  const shownMinute = hour !== null && value && Number(value.slice(0, 2)) === hour ? value.slice(3, 5) : '--';
  const ranges = takenOn(taken, date);
  const headerPart = (text: string, which: Face, enabled: boolean) => (
    <button type="button" disabled={!enabled} onClick={() => setFace(which)} aria-label={which === 'hour' ? 'Choose the hour' : 'Choose the minute'}
      className={`px-1.5 rounded-lg tabular-nums cursor-pointer disabled:cursor-default ${face === which ? 'text-[#0071e3] bg-[#0071e3]/10' : 'text-gray-500'}`}>
      {text}
    </button>
  );
  const halfButton = (toPm: boolean) => (
    <button type="button" aria-pressed={pm === toPm} onClick={() => switchHalf(toPm)}
      className={`px-2 py-0.5 rounded-md text-xs font-semibold cursor-pointer ${pm === toPm ? 'bg-[#0071e3] text-white' : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/10'}`}>
      {toPm ? 'pm' : 'am'}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-2xl font-semibold flex items-center">
          {headerPart(hour === null ? '--' : String(twelve(hour)), 'hour', true)}
          <span className="text-gray-400">:</span>
          {headerPart(shownMinute, 'minute', hour !== null)}
        </p>
        <div className="flex gap-0.5 rounded-lg border border-black/10 dark:border-white/10 p-0.5">{halfButton(false)}{halfButton(true)}</div>
      </div>
      <p className="text-gray-500">{face === 'hour' || hour === null ? 'Pick the hour' : `Pick the minute of ${hourLabel(hour)}`}</p>
      <Dial face={face} pm={pm} hour={hour} value={value} ranges={ranges} blocked={blocked} occupied={occupied} onHour={pickHour} onMinute={pickMinute} />
      {ranges.length > 0 && (
        <div className="space-y-1 border-t border-black/10 dark:border-white/10 pt-2">
          <p className="flex items-center gap-1.5 font-semibold text-gray-600 dark:text-gray-300">
            <span className="inline-block w-3 h-3 rounded-sm bg-gray-300 dark:bg-neutral-600" /> Already taken this day
          </p>
          <ul aria-label="Already taken this day" className="space-y-0.5 text-gray-500 max-h-20 overflow-y-auto">
            {ranges.map((range) => (
              <li key={`${range.from}-${range.label}`}>{clockLabel(range.from)} – {clockLabel(range.to)} · {range.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * A time picked on a round clock, never typed: the hour first (am or pm), then the exact minute. The staff can't be in
 * two places at once, so the time already taken that day by another visit, journey or stay (`taken`) is shaded grey and
 * can't be picked; for an end time (`startAt` given), nor can a time that would run over a taken one. Times that would
 * break the order (an arrival before its departure, a journey before the last one arrives) can't be picked either.
 */
export const TimeSelect: React.FC<ClockRules & {
  label: string;
  value: string;
  onChange: (time: string) => void;
  required?: boolean;
  error?: string;
}> = ({ label, value, onChange, required, error, ...rules }) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { open, setOpen, panelRef, position } = usePopover(triggerRef, PANEL_HEIGHT, PANEL_WIDTH);

  const pick = (time: string) => {
    onChange(time);
    setOpen(false);
    triggerRef.current?.focus();
  };

  let borderTone = 'border-black/20 dark:border-white/20';
  if (error) borderTone = 'border-red-500/80';
  else if (open) borderTone = 'border-[#0071e3] dark:border-blue-400';

  return (
    <div className="relative pt-2 space-y-1 w-full">
      <div className={`relative rounded-xl border transition-colors ${borderTone}`}>
        <div className="absolute -top-2.5 left-3 px-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 pointer-events-none z-10 rounded-sm bg-white dark:bg-[#161617]">
          <span>{label}</span>
          {required && <span className="text-red-500 font-bold">*</span>}
        </div>
        <button ref={triggerRef} type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between gap-2 px-3.5 py-3 text-sm text-left rounded-xl cursor-pointer focus:outline-none ${
            value ? 'text-[#1d1d1f] dark:text-[#f5f5f7]' : 'text-gray-400'}`}>
          {value ? formatTime(value) : 'Choose the time'}
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1 px-1 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}

      {open && createPortal(
        <div ref={panelRef} role="dialog" aria-label={`${label} clock`} style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
          className="fixed z-[60] rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-2xl p-3 text-xs">
          <ClockPanel value={value} onPick={pick} {...rules} />
        </div>,
        document.body,
      )}
    </div>
  );
};
