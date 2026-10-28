import React from 'react';
import { CalendarDays, MapPin, Phone, Users } from 'lucide-react';
import type { DemoDetail } from '../types/clientDemo.types';
import { formatDateTime, formatDay, formatTime, inrAmount } from '../utils/clientDemo';

/** The client, the visit and the attending staff of a demo. */
export const DemoOverview: React.FC<{ demo: DemoDetail }> = ({ demo }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <section aria-label="Client" className="apple-card p-5 space-y-2 text-xs">
      <h2 className="text-sm font-semibold">Client</h2>
      <p className="font-semibold text-gray-800 dark:text-gray-200">{demo.clientName} <span className="font-normal text-gray-400">· {demo.clientCategoryLabel}</span></p>
      {demo.contactPerson && <p>{demo.contactPerson}</p>}
      <p className="flex items-center gap-1.5">
        <Phone className="w-3.5 h-3.5 text-gray-400" /> <a href={`tel:${demo.contactPhone}`} className="text-[#0071e3] hover:underline">{demo.contactPhone}</a>
      </p>
      {demo.contactEmail && <p><a href={`mailto:${demo.contactEmail}`} className="text-[#0071e3] hover:underline">{demo.contactEmail}</a></p>}
      <p className="text-gray-600 dark:text-gray-400">{[demo.addressLine, demo.city, demo.state, demo.pincode].filter(Boolean).join(', ')}</p>
      {demo.mapLink && (
        <a href={demo.mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0071e3] font-semibold hover:underline">
          <MapPin className="w-3.5 h-3.5" /> Open in Google Maps
        </a>
      )}
    </section>
    <section aria-label="Visit" className="apple-card p-5 space-y-2 text-xs">
      <h2 className="text-sm font-semibold">Visit</h2>
      <p className="flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
        {formatDay(demo.startDate)} at {formatTime(demo.startTime)}{demo.numberOfDays > 1 && <> → {formatDay(demo.endDate)}</>}
        <span className="text-gray-400">({demo.numberOfDays} {demo.numberOfDays === 1 ? 'day' : 'days'})</span>
      </p>
      {demo.purpose && <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{demo.purpose}</p>}
      {demo.outcome && <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line"><span className="font-semibold">Outcome: </span>{demo.outcome}</p>}
      <p className="text-gray-400">Planned by {demo.createdByName ?? '—'} · {formatDateTime(demo.createdAt)}</p>
    </section>
    <section aria-label="Attending staff" className="apple-card p-5 space-y-2 text-xs">
      <h2 className="text-sm font-semibold flex items-center gap-1.5"><Users className="w-4 h-4 text-[#0071e3]" /> Attending staff</h2>
      <ul className="space-y-1">
        {demo.staff.map((member) => (
          <li key={member.employeeId}>
            <span className="font-semibold">{member.name}</span>
            <span className="text-gray-400"> · {member.employeeCode}{member.designation ? ` · ${member.designation}` : ''}</span>
          </li>
        ))}
      </ul>
      <p className="pt-1"><span className="text-gray-400">Proposed budget </span><strong>{inrAmount(demo.proposedBudget)}</strong></p>
      {demo.bookedTotal !== 0 && <p><span className="text-gray-400">Booked to the company account </span><strong>{inrAmount(demo.bookedTotal)}</strong></p>}
    </section>
  </div>
);
