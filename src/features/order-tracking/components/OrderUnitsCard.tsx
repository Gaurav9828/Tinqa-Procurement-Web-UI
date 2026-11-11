import React, { useMemo, useState } from 'react';
import { Loader2, ScanBarcode, ShieldCheck } from 'lucide-react';
import type { OrderItemUnits } from '../types/orderTracking.types';
import { orderTrackingApi } from '../api/orderTrackingApi';
import { useApiAction } from '../../../hooks/useApiAction';
import { getApiFieldErrors } from '../../../utils/apiError';
import { UnitSerialFields } from './UnitSerialFields';
import { collectSerials, linesNeedingSerials, SERIALS_RECORDABLE, serialSlots } from '../utils/unitSerials';
import { formatDate } from '../utils/orderTracking.utils';

interface Props {
  orderNumber: string;
  units: OrderItemUnits[];
  currentStatus: string | null;
  /** CUSTOMER_ORDER_TRACKING_UPDATE: may record serials for an order shipped without them. */
  canRecord: boolean;
  onRecorded: () => void;
}

/**
 * The serial of every unit on the order and its warranty (from delivery to the last covered day). Orders that shipped
 * before serials were recorded can have them added here, once per line.
 */
export const OrderUnitsCard: React.FC<Props> = ({ orderNumber, units, currentStatus, canRecord, onRecorded }) => {
  const missing = useMemo(() => linesNeedingSerials(units), [units]);
  const slots = useMemo(() => serialSlots(missing), [missing]);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | undefined>();
  const { isSubmitting, run } = useApiAction(() => {
    setOpen(false);
    setValues({});
    onRecorded();
  });

  const recordable = canRecord && missing.length > 0 && !!currentStatus && SERIALS_RECORDABLE.has(currentStatus);
  const recorded = units.filter((line) => line.units.length > 0);
  if (recorded.length === 0 && !recordable) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { serials, errors: problems } = collectSerials(slots, values);
    setErrors(problems);
    setServerError(undefined);
    if (Object.keys(problems).length > 0) return;
    await run(() => orderTrackingApi.recordUnits(orderNumber, serials), {
      success: 'Serials recorded.',
      failure: 'Could not record the serials.',
      onError: (err) => setServerError(Object.values(getApiFieldErrors(err))[0]),
    });
  };

  return (
    <section aria-label="Units and warranty" className="apple-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-black dark:text-white flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Units and warranty
      </h2>
      {recorded.length > 0 && (
        <ul className="space-y-2">
          {recorded.flatMap((line) =>
            line.units.map((unit) => (
              <li key={`${line.orderItemId}-${unit.serial}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px]">
                <span className="min-w-0">
                  <span className="font-mono text-black dark:text-white">{unit.serial}</span>
                  <span className="text-gray-500"> · {line.title}</span>
                  {unit.released && <span className="ml-1 text-[10px] uppercase tracking-wider text-gray-400">(released)</span>}
                </span>
                <span className="text-gray-500">
                  {!unit.warrantyTitle
                    ? 'No warranty'
                    : unit.coverageEndsOn
                      ? `${unit.warrantyTitle}: ${formatDate(unit.coverageStartsOn)} – ${formatDate(unit.coverageEndsOn)}`
                      : `${unit.warrantyTitle}: starts on delivery`}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
      {recordable && !open && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            {missing.length === 1 ? '1 line has' : `${missing.length} lines have`} no serials yet, so their warranty can&rsquo;t be traced.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#0071e3]/40 bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/20 cursor-pointer"
          >
            <ScanBarcode className="w-3.5 h-3.5" /> Record serials
          </button>
        </div>
      )}
      {recordable && open && (
        <form onSubmit={save} aria-label="Record serials" className="space-y-2" noValidate>
          <UnitSerialFields
            slots={slots}
            values={values}
            errors={errors}
            error={serverError}
            disabled={isSubmitting}
            onChange={(key, value) => {
              setValues((prev) => ({ ...prev, [key]: value }));
              setErrors((prev) => ({ ...prev, [key]: '' }));
              setServerError(undefined);
            }}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={isSubmitting} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-black/10 dark:border-white/10 cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 cursor-pointer">
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />} Save serials
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
