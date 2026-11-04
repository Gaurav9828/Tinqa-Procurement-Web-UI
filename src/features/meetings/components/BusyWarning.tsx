import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BusySlot } from '../types/meeting.types';
import { busyMessage } from '../utils/busy';

/** Amber notice naming everyone already in another meeting at the chosen time; nothing when nobody is. */
export const BusyWarning: React.FC<{ clashes: BusySlot[] }> = ({ clashes }) => {
  if (clashes.length === 0) return null;
  return (
    <div role="alert" aria-label="Time clash" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
      <p className="font-semibold flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Already busy at this time
      </p>
      <ul className="list-disc pl-5 space-y-0.5">
        {clashes.map((slot) => <li key={`${slot.meetingId}-${slot.employeeId}`}>{busyMessage(slot)}.</li>)}
      </ul>
      <p>Nobody can be in two meetings at once: pick another time, or invite someone else.</p>
    </div>
  );
};
