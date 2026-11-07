import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ScanBarcode, Search } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { useBarcodeTrace } from '../hooks/useBarcodeTrace';
import { BarcodeTraceView } from '../components/BarcodeTraceView';
import { BarcodeRequestModal } from '../components/BarcodeRequestModal';
import { normalizeBarcode } from '../utils/barcode';

/**
 * Barcode Tracking: scan or type any barcode to see the piece or product unit it belongs to: its batch, purchase order
 * and supplier, the product it is fitted into or the parts inside it, and everything that happened to it.
 */
export const BarcodeTrackingPage: React.FC = () => {
  const { can } = useAccess();
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(params.get('code') ?? '');
  const { trace, notFound, isLoading, lookUp, refresh } = useBarcodeTrace();
  const [correcting, setCorrecting] = useState(false);
  const code = params.get('code');
  // The field shows the code in the address whenever that changes (e.g. a link from a stock or product view)
  const [addressCode, setAddressCode] = useState(code);
  if (code !== addressCode) {
    setAddressCode(code);
    setDraft(code ?? '');
  }

  // The code in the address is traced once per change
  useEffect(() => {
    if (code) void lookUp(code);
  }, [code, lookUp]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = normalizeBarcode(draft);
    if (!next) return;
    if (next === code) void lookUp(next);
    else setParams({ code: next });
  };

  const canCorrect = can('BARCODE_REQUEST') || can('BARCODE_APPROVE');
  const hasPendingCorrection = trace?.requests.some((request) => request.status === 'PENDING') ?? false;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#0071e3]/10 text-[#0071e3] rounded-2xl">
          <ScanBarcode className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white">Barcode Tracking</h1>
          <p className="text-xs text-gray-500">
            Scan any piece or product unit to see where it came from, what it is built into and everything that happened to it.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex gap-2" role="search">
        <div className="relative flex-1">
          <ScanBarcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            autoFocus
            aria-label="Barcode"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Scan or type a barcode, then Enter"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !draft.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Trace
        </button>
      </form>

      {notFound && !isLoading && (
        <p role="status" className="p-4 rounded-2xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm">
          No piece or product unit carries barcode <span className="font-mono font-semibold">{notFound}</span>.
        </p>
      )}

      {trace && !notFound && (
        <BarcodeTraceView
          trace={trace}
          hasPendingCorrection={hasPendingCorrection}
          onCorrect={canCorrect ? () => setCorrecting(true) : undefined}
        />
      )}

      {correcting && trace && (
        <BarcodeRequestModal
          target={{
            kind: 'CORRECTION',
            barcodeId: trace.unit.id,
            code: trace.unit.code,
            what: trace.unit.unitType === 'PRODUCT_UNIT' ? trace.unit.productTitle ?? 'product unit' : trace.unit.itemName ?? 'piece',
          }}
          onClose={() => setCorrecting(false)}
          onDone={(appliedCode) => {
            // Corrected at once: the barcode is shown (and linked) under its new code
            void refresh(appliedCode);
            if (appliedCode) {
              // The field follows at once, not only when the router renders the new address (it may defer that)
              setDraft(appliedCode);
              setAddressCode(appliedCode);
              setParams({ code: appliedCode });
            }
          }}
        />
      )}
    </div>
  );
};
