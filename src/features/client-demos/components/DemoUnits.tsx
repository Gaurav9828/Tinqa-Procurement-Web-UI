import React, { useMemo, useState } from 'react';
import { Barcode, PackageCheck } from 'lucide-react';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import type { DemoDetail, DemoUnit, DemoUnitStatus } from '../types/clientDemo.types';
import { formatDateTime, formatDay, todayIso } from '../utils/clientDemo';

const UNIT_BADGE: Record<DemoUnitStatus, string> = {
  RESERVED: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  OUT: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  RETURNED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  WRITTEN_OFF: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  NOT_TAKEN: 'bg-gray-500/10 text-gray-600 dark:text-gray-300',
};

// Whether today is one of the demo's days: units leave stock only then
const isDemoDay = (demo: DemoDetail, today = todayIso()) => today >= demo.startDate && today <= demo.endDate;

/**
 * Every product unit taken to the demo, by barcode, and where it is. While the approved demo runs, staff hand units
 * out on its days (they leave stock, also on the storefront) and back afterwards; scan a barcode or tick units, then
 * hand out or back. A Super Admin writes off a unit that did not come back.
 */
export const DemoUnits: React.FC<{
  demo: DemoDetail;
  canHandle: boolean;
  canWriteOff: boolean;
  busy: boolean;
  onHandOut: (barcodes: string[]) => Promise<unknown>;
  onHandBack: (barcodes: string[]) => Promise<unknown>;
  onWriteOff: (unit: DemoUnit) => void;
}> = ({ demo, canHandle, canWriteOff, busy, onHandOut, onHandBack, onWriteOff }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const byCode = useMemo(() => new Map(demo.units.map((unit) => [unit.barcode, unit])), [demo.units]);
  const demoDay = isDemoDay(demo);
  const actionable = (unit: DemoUnit) => canHandle && (unit.status === 'OUT' || (unit.status === 'RESERVED' && demoDay));
  const chosen = [...selected].map((barcode) => byCode.get(barcode)).filter((unit): unit is DemoUnit => unit !== undefined);
  const toOut = chosen.filter((unit) => unit.status === 'RESERVED').map((unit) => unit.barcode);
  const toBack = chosen.filter((unit) => unit.status === 'OUT').map((unit) => unit.barcode);
  const out = demo.units.filter((unit) => unit.status === 'OUT').length;

  if (demo.units.length === 0) return null;

  const days = demo.numberOfDays > 1 ? `${formatDay(demo.startDate)} to ${formatDay(demo.endDate)}` : formatDay(demo.startDate);
  const handlingHint = demoDay
    ? 'Scan or tick the units as they leave: they are out of stock (also on the storefront) until handed back. Every unit must be back before the demo is completed.'
    : `Units are handed out on the demo’s days (${days}); units out can be handed back any time.`;

  const toggle = (barcode: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(barcode)) next.delete(barcode);
    else next.add(barcode);
    return next;
  });

  // A scanned barcode ticks its unit, when it can be handed out or back now
  const scan = () => {
    const wanted = code.trim().toUpperCase();
    if (!wanted) return;
    const unit = byCode.get(wanted);
    if (!unit) setCodeError(`${wanted} is not picked for ${demo.reference}.`);
    else if (!actionable(unit)) {
      setCodeError(unit.status === 'RESERVED' ? `${wanted} can be handed out on the demo’s days only.` : `${wanted} is ${unit.statusLabel.toLowerCase()}.`);
    } else {
      setSelected((prev) => new Set(prev).add(wanted));
      setCode('');
    }
  };

  const send = async (call: (barcodes: string[]) => Promise<unknown>, barcodes: string[]) => {
    if ((await call(barcodes)) !== null) setSelected(new Set());
  };

  return (
    <section aria-label="Units taken" className="apple-card p-5 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <PackageCheck className="w-4 h-4 text-[#0071e3]" /> Units taken
          <span className="font-normal text-gray-400">· {demo.units.length} by barcode{out > 0 ? ` · ${out} out now` : ''}</span>
        </h2>
        {canHandle && (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || toOut.length === 0} onClick={() => send(onHandOut, toOut)}
              className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE.warning}`}>
              Hand out{toOut.length ? ` ${toOut.length}` : ''}
            </button>
            <button type="button" disabled={busy || toBack.length === 0} onClick={() => send(onHandBack, toBack)}
              className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${SOLID_TONE.approve}`}>
              Hand back{toBack.length ? ` ${toBack.length}` : ''}
            </button>
          </div>
        )}
      </div>
      {canHandle && (
        <>
          <p className="text-gray-500">{handlingHint}</p>
          <form className="flex items-start gap-2 max-w-md" onSubmit={(e) => { e.preventDefault(); scan(); }}>
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input aria-label="Scan a unit" value={code} maxLength={32} placeholder="Scan or type a unit’s barcode"
                onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-black/20 dark:border-white/20 bg-transparent text-sm font-mono focus:outline-none focus:border-[#0071e3]" />
            </div>
            <button type="submit" disabled={!code.trim()} className={`px-3 py-2 rounded-xl font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.primary}`}>Select</button>
          </form>
          {codeError && <p role="alert" className="text-rose-500">{codeError}</p>}
        </>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-gray-400">
            <tr>
              {canHandle && <th className="py-1.5 pr-2 w-6"><span className="sr-only">Select</span></th>}
              <th className="py-1.5 pr-3 font-semibold">Barcode</th>
              <th className="py-1.5 pr-3 font-semibold">Product</th>
              <th className="py-1.5 pr-3 font-semibold">Where</th>
              <th className="py-1.5 pr-3 font-semibold">Handed out</th>
              <th className="py-1.5 pr-3 font-semibold">Back</th>
              {canWriteOff && <th className="py-1.5"><span className="sr-only">Write off</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {demo.units.map((unit) => (
              <tr key={unit.barcode}>
                {canHandle && (
                  <td className="py-1.5 pr-2">
                    <input type="checkbox" aria-label={`Select ${unit.barcode}`} disabled={!actionable(unit)} checked={selected.has(unit.barcode)}
                      onChange={() => toggle(unit.barcode)} className="cursor-pointer disabled:cursor-not-allowed" />
                  </td>
                )}
                <td className="py-1.5 pr-3 font-mono">{unit.barcode}</td>
                <td className="py-1.5 pr-3">{unit.productName ?? `#${unit.productId}`}</td>
                <td className="py-1.5 pr-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${UNIT_BADGE[unit.status]}`}>{unit.statusLabel}</span>
                  {unit.writeOffReason && <span className="block text-gray-500 mt-0.5">{unit.writeOffReason}</span>}
                </td>
                <td className="py-1.5 pr-3 text-gray-500">{unit.handedOutAt ? `${formatDateTime(unit.handedOutAt)} · ${unit.handedOutByName ?? '—'}` : '—'}</td>
                <td className="py-1.5 pr-3 text-gray-500">{unit.returnedAt ? `${formatDateTime(unit.returnedAt)} · ${unit.returnedByName ?? '—'}` : '—'}</td>
                {canWriteOff && (
                  <td className="py-1.5">
                    {unit.status === 'OUT' && (
                      <button type="button" disabled={busy} onClick={() => onWriteOff(unit)}
                        className={`px-2 py-1 rounded-lg font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.danger}`}>Write off</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
