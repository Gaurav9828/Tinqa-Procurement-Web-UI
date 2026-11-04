import React from 'react';
import type { AttendeeStatus, MeetingStatus } from '../types/meeting.types';
import { ATTENDEE_BADGE, ATTENDEE_LABELS, STATUS_BADGE, STATUS_LABELS } from '../utils/meeting';

const pill = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap';

export const MeetingStatusBadge: React.FC<{ status: MeetingStatus }> = ({ status }) => (
  <span className={`${pill} ${STATUS_BADGE[status]}`}>{STATUS_LABELS[status]}</span>
);

export const AttendeeStatusBadge: React.FC<{ status: AttendeeStatus }> = ({ status }) => (
  <span className={`${pill} ${ATTENDEE_BADGE[status]}`}>{ATTENDEE_LABELS[status]}</span>
);
