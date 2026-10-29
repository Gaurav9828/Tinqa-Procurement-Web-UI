import React from 'react';
import { Building2, CalendarDays, Clock, Mail, MapPin, Package, Phone, UserRound, Users } from 'lucide-react';
import type { DemoDetail, DemoVisit } from '../types/clientDemo.types';
import { formatDateTime, formatDay, formatSlot, formatTime, inrAmount } from '../utils/clientDemo';

const VisitCard: React.FC<{ visit: DemoVisit; index: number }> = ({ visit, index }) => (
  <li className="rounded-xl border border-black/10 dark:border-white/10 p-3 space-y-1.5">
    <p className="font-semibold text-gray-800 dark:text-gray-200">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0071e3] text-white text-[9px] font-bold mr-1.5">{index + 1}</span>
      {visit.clientName} <span className="font-normal text-gray-400">· {visit.clientCategoryLabel}</span>
    </p>
    <p className="flex items-center gap-1.5 text-[#0071e3] dark:text-blue-400 font-semibold">
      <Clock className="w-3.5 h-3.5" /> Day {visit.dayNumber} · {formatDay(visit.date)} · {formatSlot(visit.startTime, visit.endTime)}
    </p>
    {(visit.legalName || visit.gstin) && (
      <p className="text-gray-500">{visit.legalName}{visit.legalName && visit.gstin && ' · '}{visit.gstin && <span className="font-mono">GSTIN {visit.gstin}</span>}</p>
    )}
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Building2 className="w-3.5 h-3.5 text-gray-400" aria-label="Client" />
      <span className="inline-flex items-center gap-1">
        <Phone className="w-3.5 h-3.5 text-gray-400" /> <a href={`tel:${visit.clientPhone}`} className="text-[#0071e3] hover:underline">{visit.clientPhone}</a>
      </span>
      {visit.clientEmail && (
        <span className="inline-flex items-center gap-1">
          <Mail className="w-3.5 h-3.5 text-gray-400" /> <a href={`mailto:${visit.clientEmail}`} className="text-[#0071e3] hover:underline">{visit.clientEmail}</a>
        </span>
      )}
    </p>
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <UserRound className="w-3.5 h-3.5 text-gray-400" aria-label="Contact person" />
      {visit.contactPerson && <span>{visit.contactPerson}</span>}
      <a href={`tel:${visit.contactPhone}`} className="text-[#0071e3] hover:underline">{visit.contactPhone}</a>
      {visit.contactEmail && <a href={`mailto:${visit.contactEmail}`} className="text-[#0071e3] hover:underline">{visit.contactEmail}</a>}
    </p>
    <p className="text-gray-600 dark:text-gray-400">{[visit.addressLine, visit.city, visit.state, visit.pincode].filter(Boolean).join(', ')}</p>
    {visit.mapLink && (
      <a href={visit.mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0071e3] font-semibold hover:underline">
        <MapPin className="w-3.5 h-3.5" /> Open in Google Maps
      </a>
    )}
  </li>
);

/** The clients visited (each with its time), the trip, the products shown and the attending staff of a demo. */
export const DemoOverview: React.FC<{ demo: DemoDetail }> = ({ demo }) => (
  <div className="space-y-5">
    <section aria-label="Clients" className="apple-card p-5 space-y-3 text-xs">
      <h2 className="text-sm font-semibold">{demo.clients.length === 1 ? 'Client' : `${demo.clients.length} clients`}</h2>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {demo.clients.map((visit, index) => <VisitCard key={visit.id} visit={visit} index={index} />)}
      </ol>
    </section>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <section aria-label="Visit" className="apple-card p-5 space-y-2 text-xs">
        <h2 className="text-sm font-semibold">Trip</h2>
        <p className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
          {formatDay(demo.startDate)} at {formatTime(demo.startTime)}{demo.numberOfDays > 1 && <> → {formatDay(demo.endDate)}</>}
          <span className="text-gray-400">({demo.numberOfDays} {demo.numberOfDays === 1 ? 'day' : 'days'})</span>
        </p>
        {demo.purpose && <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{demo.purpose}</p>}
        {demo.outcome && <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line"><span className="font-semibold">Outcome: </span>{demo.outcome}</p>}
        <p className="text-gray-400">Planned by {demo.createdByName ?? '—'} · {formatDateTime(demo.createdAt)}</p>
      </section>
      <section aria-label="Products to demo" className="apple-card p-5 space-y-2 text-xs">
        <h2 className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4 text-[#0071e3]" /> Products to demo</h2>
        {demo.products.length === 0 ? (
          <p className="text-gray-400">None chosen.</p>
        ) : (
          <ul className="space-y-1">
            {demo.products.map((product) => (
              <li key={product.productId} className="flex flex-wrap justify-between gap-x-2">
                <span className="font-semibold">{product.productName}</span>
                <span className="text-gray-500 shrink-0">{product.quantity} {product.quantity === 1 ? 'unit' : 'units'}</span>
                {product.barcodes.length > 0 && <span className="basis-full font-mono text-gray-500 break-all">{product.barcodes.join(', ')}</span>}
              </li>
            ))}
          </ul>
        )}
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
        {demo.extraBudget > 0 && (
          <p className="text-gray-500">
            {inrAmount(demo.proposedBudget - demo.extraBudget)} day by day + {inrAmount(demo.extraBudget)} extra
            <span className="block italic">Why the extra: {demo.extraBudgetReason}</span>
          </p>
        )}
        {demo.bookedTotal !== 0 && <p><span className="text-gray-400">Booked to the company account </span><strong>{inrAmount(demo.bookedTotal)}</strong></p>}
      </section>
    </div>
  </div>
);
