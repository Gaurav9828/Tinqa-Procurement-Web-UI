import React, { useState } from 'react';
import { Check, Loader2, RefreshCw, ScanBarcode, X } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { SOLID_TONE } from '../../../components/ui/actionTones';
import { RejectionModal } from '../../approvals/components/RejectionModal';
import type { BarcodeRequest } from '../types/barcode.types';
import { BarcodeCode } from './BarcodeCode';

interface Props {
  requests: BarcodeRequest[];
  isLoading: boolean;
  isSubmitting: boolean;
  onRefresh: () => void;
  onDecide: (request: BarcodeRequest, decision: { decision: 'APPROVED' | 'REJECTED'; reason?: string }) => Promise<boolean>;
}

const describe = (request: BarcodeRequest) => {
  if (request.requestType === 'ASSIGNMENT') {
    return `${request.itemName} · ${request.codes?.length ?? 0} barcode(s) for stock ${request.stockIdentityNumber} (batch ${request.batchNumber})`;
  }
  const what = request.unitType === 'PRODUCT_UNIT' ? request.productTitle : request.itemName;
  return `${what} · barcode ${request.currentCode} → ${request.newCode}`;
};

/**
 * The Approvals hub's Barcodes tab (Level 2 Super Admins): corrections of locked barcodes and barcodes for stock received
 * before they were recorded. Approving applies the change; rejecting needs a reason, which the requester is told.
 */
export const BarcodeRequestsPanel: React.FC<Props> = ({ requests, isLoading, isSubmitting, onRefresh, onDecide }) => {
  const [approving, setApproving] = useState<BarcodeRequest | null>(null);
  const [rejecting, setRejecting] = useState<BarcodeRequest | null>(null);
  const [rejection, setRejection] = useState<{ request: BarcodeRequest; reason: string } | null>(null);

  return (
    <section aria-label="Barcode requests awaiting approval" className="apple-card p-5 space-y-4 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <ScanBarcode className="w-4 h-4 text-[#0071e3]" /> Barcode requests
          </h2>
          <p className="text-gray-500 dark:text-neutral-400 mt-1 max-w-2xl">
            Barcodes are locked once their stock entry or product is approved. Only a Super Admin changes them: approve a
            correction to relabel the piece or unit, or an assignment to label stock received before barcodes were recorded.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh barcode requests"
          className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-gray-500">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'No barcode request waiting.'}</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((request) => (
            <li key={request.id}>
              <article className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-black/[0.03] dark:bg-white/5">
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold">
                    {request.requestType === 'CORRECTION' ? 'Correction' : 'Assignment'} · {describe(request)}
                  </p>
                  {request.requestType === 'CORRECTION' && request.currentCode && (
                    <p className="text-xs">Trace: <BarcodeCode code={request.currentCode} /></p>
                  )}
                  {request.requestType === 'ASSIGNMENT' && request.codes && (
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">{request.codes.join(', ')}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Asked by {request.requestedByUsername ?? '—'} on {new Date(request.requestedAt).toLocaleString('en-IN')} · Reason: {request.reason}
                  </p>
                </div>
                <div className="flex gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setApproving(request)}
                    aria-label={`Approve barcode request ${request.id}`}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.approve}`}
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setRejecting(request)}
                    aria-label={`Reject barcode request ${request.id}`}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.danger}`}
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <ConfirmationModal
        isOpen={!!approving}
        actionType="APPROVED"
        title="Approve barcode request"
        description={approving ? `${describe(approving)}. The change is applied and recorded in the barcode's history.` : undefined}
        isSubmitting={isSubmitting}
        onClose={() => setApproving(null)}
        onConfirm={async () => {
          if (approving && (await onDecide(approving, { decision: 'APPROVED' }))) setApproving(null);
        }}
      />
      <RejectionModal
        isOpen={!!rejecting}
        requestId={rejecting?.id ?? null}
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => {
          if (rejecting) setRejection({ request: rejecting, reason });
          setRejecting(null);
        }}
      />
      <ConfirmationModal
        isOpen={!!rejection}
        actionType="REJECTED"
        title="Reject barcode request"
        description={rejection ? `${describe(rejection.request)}. The barcode stays as it is.` : undefined}
        rejectionReason={rejection?.reason}
        isSubmitting={isSubmitting}
        onClose={() => setRejection(null)}
        onConfirm={async () => {
          if (rejection && (await onDecide(rejection.request, { decision: 'REJECTED', reason: rejection.reason }))) setRejection(null);
        }}
      />
    </section>
  );
};
