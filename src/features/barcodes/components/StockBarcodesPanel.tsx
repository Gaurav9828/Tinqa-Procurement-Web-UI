import React, { useCallback, useState } from 'react';
import { Loader2, ScanBarcode } from 'lucide-react';
import { barcodeApi } from '../api/barcodeApi';
import { useBarcodeList } from '../hooks/useBarcodeList';
import { useAccess } from '../../../hooks/useAccess';
import type { BarcodeStatus, BarcodeUnit } from '../types/barcode.types';
import { BARCODE_STATUS_LABELS } from '../utils/barcode';
import { BarcodeStatusBadge } from './BarcodeStatusBadge';
import { BarcodeCode } from './BarcodeCode';
import { BarcodeRequestModal } from './BarcodeRequestModal';

interface Props {
  stockId: number;
  stockIdentityNumber: string;
  /** Available units received before barcodes were recorded (approved entries only). */
  unitsWithoutBarcode?: number;
}

const SHOWN = 200;

/**
 * The barcodes of one stock entry's passed units: what each piece is doing now (in stock, fitted in a product...). Units
 * received before barcodes were recorded can be given theirs through a Super Admin.
 */
export const StockBarcodesPanel: React.FC<Props> = ({ stockId, stockIdentityNumber, unitsWithoutBarcode = 0 }) => {
  const { can } = useAccess();
  const load = useCallback((id: number) => barcodeApi.forStock(id), []);
  const { allowed, data: units, isLoading, refresh } = useBarcodeList<BarcodeUnit>(stockId, load, 'stock barcodes');
  const [assigning, setAssigning] = useState(false);

  if (!allowed) return null;
  const live = units.filter((unit) => unit.status !== 'VOID');
  const counts = live.reduce<Partial<Record<BarcodeStatus, number>>>((acc, unit) => ({ ...acc, [unit.status]: (acc[unit.status] ?? 0) + 1 }), {});

  return (
    <section aria-label="Unit barcodes" className="p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-gray-500 font-semibold">
          <ScanBarcode className="w-4 h-4 text-[#0071e3]" />
          <span>Unit barcodes ({live.length})</span>
        </div>
        {unitsWithoutBarcode > 0 && can('BARCODE_REQUEST') && (
          <button
            type="button"
            onClick={() => setAssigning(true)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
          >
            Assign barcodes to {unitsWithoutBarcode} unit{unitsWithoutBarcode === 1 ? '' : 's'}
          </button>
        )}
      </div>
      {unitsWithoutBarcode > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          {unitsWithoutBarcode} available unit{unitsWithoutBarcode === 1 ? ' has' : 's have'} no barcode (received before barcodes were recorded).
        </p>
      )}
      {isLoading && <p className="text-gray-400"><Loader2 className="inline w-3 h-3 animate-spin" /> Loading barcodes…</p>}
      {!isLoading && live.length === 0 && <p className="text-gray-400">No barcodes recorded for this batch.</p>}
      {!isLoading && live.length > 0 && (
        <>
          <p className="text-[11px] text-gray-500">
            {(Object.keys(counts) as BarcodeStatus[]).map((status) => `${counts[status]} ${BARCODE_STATUS_LABELS[status].toLowerCase()}`).join(' · ')}
          </p>
          <ul className="max-h-56 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
            {live.slice(0, SHOWN).map((unit) => (
              <li key={unit.id} className="flex items-center justify-between gap-2 py-1.5">
                <BarcodeCode code={unit.code} />
                <span className="flex items-center gap-2">
                  {unit.fittedIntoCode && <span className="text-[10px] text-gray-500">in {unit.productTitle ?? unit.fittedIntoCode}</span>}
                  <BarcodeStatusBadge status={unit.status} locked={unit.locked} />
                </span>
              </li>
            ))}
          </ul>
          {live.length > SHOWN && <p className="text-[11px] text-gray-400">Showing {SHOWN} of {live.length}. Trace any other code from Barcode Tracking.</p>}
        </>
      )}
      {assigning && (
        <BarcodeRequestModal
          target={{ kind: 'ASSIGNMENT', stockId, stockIdentityNumber, unitsWithoutBarcode }}
          onClose={() => setAssigning(false)}
          onDone={() => refresh()}
        />
      )}
    </section>
  );
};
