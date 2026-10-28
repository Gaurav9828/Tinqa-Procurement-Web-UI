import React from 'react';
import { Boxes, Building2, Clock3, Package, PencilLine } from 'lucide-react';
import type { BarcodeSource, BarcodeTrace, BarcodeUnit } from '../types/barcode.types';
import { BARCODE_EVENT_LABELS, BARCODE_STATUS_LABELS } from '../utils/barcode';
import { BarcodeStatusBadge } from './BarcodeStatusBadge';
import { BarcodeCode } from './BarcodeCode';

const formatDate = (value: string | null | undefined) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');
const formatTime = (value: string | null | undefined) => (value ? new Date(value).toLocaleString('en-IN') : '—');

// e.g. "Motherboard (MB-01)"
const itemLabel = (unit: BarcodeUnit) => (unit.itemSku ? `${unit.itemName} (${unit.itemSku})` : unit.itemName ?? '');

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</dt>
    <dd className="text-xs font-medium text-black dark:text-white">{children}</dd>
  </div>
);

/** Batch, purchase order and dealer a piece came from. */
const SourceFacts: React.FC<{ source: BarcodeSource }> = ({ source }) => (
  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    <Fact label="Dealer">{source.dealerName}</Fact>
    <Fact label="Purchase order">{source.orderNumber}</Fact>
    <Fact label="Ordered on">{formatDate(source.orderDate)}</Fact>
    <Fact label="Delivered on">{formatDate(source.deliveredOn)}</Fact>
    <Fact label="Batch">{source.batchNumber}</Fact>
    <Fact label="Stock entry">{source.stockIdentityNumber}</Fact>
    <Fact label="Arrived on">{formatDate(source.dateOfArrival)}</Fact>
    <Fact label="Received by">{source.receivedBy ?? '—'}</Fact>
    <Fact label="Approved by">{source.approvedBy ?? '—'}</Fact>
  </dl>
);

interface Props {
  trace: BarcodeTrace;
  /** Shown when the user can ask for (or make) a correction. */
  onCorrect?: () => void;
  /** Requests already waiting for this barcode. */
  hasPendingCorrection?: boolean;
}

/** Everything known about one barcode: what it is, where it came from or what is inside it, and its history. */
export const BarcodeTraceView: React.FC<Props> = ({ trace, onCorrect, hasPendingCorrection }) => {
  const { unit } = trace;
  const isProduct = unit.unitType === 'PRODUCT_UNIT';

  return (
    <div className="space-y-4" data-testid="barcode-trace">
      <section className="apple-card p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
              {isProduct ? 'Product unit' : 'Component piece'}
            </p>
            <h2 className="text-lg font-bold font-mono" data-testid="traced-code">{unit.code}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{isProduct ? unit.productTitle : itemLabel(unit)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <BarcodeStatusBadge status={unit.status} locked={unit.locked} />
            {onCorrect && unit.status !== 'VOID' && (
              <button
                type="button"
                onClick={onCorrect}
                disabled={hasPendingCorrection}
                title={hasPendingCorrection ? 'A correction of this barcode is already waiting for a Super Admin' : undefined}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PencilLine className="w-3.5 h-3.5" /> {hasPendingCorrection ? 'Correction pending' : 'Correct barcode'}
              </button>
            )}
          </div>
        </div>
        {unit.statusNote && <p className="text-xs text-gray-500">Note: {unit.statusNote}</p>}
        <p className="text-[11px] text-gray-400">
          Registered {formatTime(unit.createdAt)} by {unit.createdByName ?? '—'}
          {unit.lockedAt ? ` · locked ${formatTime(unit.lockedAt)}` : ' · not approved yet'}
        </p>
      </section>

      {trace.source && (
        <section aria-label="Where it came from" className="apple-card p-5 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="w-4 h-4 text-[#0071e3]" /> Where it came from</h3>
          <SourceFacts source={trace.source} />
        </section>
      )}

      {trace.fittedInto && (
        <section aria-label="Fitted into" className="apple-card p-5 space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Package className="w-4 h-4 text-[#0071e3]" /> Fitted into</h3>
          <p className="text-sm">
            {trace.fittedInto.productTitle} · unit <BarcodeCode code={trace.fittedInto.code} />{' '}
            <BarcodeStatusBadge status={trace.fittedInto.status} locked={trace.fittedInto.locked} />
          </p>
        </section>
      )}

      {isProduct && (
        <section aria-label="Parts inside" className="apple-card p-5 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Boxes className="w-4 h-4 text-[#0071e3]" /> Parts inside ({trace.parts.length})</h3>
          {trace.parts.length === 0 ? (
            <p className="text-xs text-gray-400">No component pieces were recorded for this unit.</p>
          ) : (
            <ul className="space-y-3">
              {trace.parts.map(({ unit: part, source }) => (
                <li key={part.id} className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/5 space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-2">
                    {part.itemName} · <BarcodeCode code={part.code} /> <BarcodeStatusBadge status={part.status} />
                  </p>
                  <SourceFacts source={source} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-label="History" className="apple-card p-5 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="w-4 h-4 text-[#0071e3]" /> History</h3>
        <ol className="space-y-2 border-l border-black/10 dark:border-white/10 pl-4">
          {trace.history.map((event, i) => (
            <li key={i} className="text-xs">
              <p className="font-semibold">
                {BARCODE_EVENT_LABELS[event.eventType]}
                {event.eventType === 'CODE_CORRECTED' && event.oldCode && ` (${event.oldCode} → ${event.newCode})`}
                {event.fittedIntoCode && event.eventType !== 'CODE_CORRECTED' && ` · unit ${event.fittedIntoCode}`}
              </p>
              <p className="text-[11px] text-gray-500">
                {formatTime(event.at)} · {event.actorName ?? 'system'} · now {BARCODE_STATUS_LABELS[event.toStatus].toLowerCase()}
                {event.note ? ` · ${event.note}` : ''}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {trace.requests.length > 0 && (
        <section aria-label="Correction requests" className="apple-card p-5 space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><PencilLine className="w-4 h-4 text-[#0071e3]" /> Correction requests</h3>
          <ul className="space-y-1.5 text-xs">
            {trace.requests.map((request) => (
              <li key={request.id}>
                {request.currentCode} → {request.newCode}: <strong>{request.status.toLowerCase()}</strong> · asked by{' '}
                {request.requestedByUsername ?? '—'} ({request.reason})
                {request.decidedByUsername ? ` · decided by ${request.decidedByUsername}` : ''}
                {request.decisionReason ? ` (${request.decisionReason})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
