import React, { useState } from 'react';
import { Check, Loader2, Paperclip, Pencil, RotateCcw, Truck, Undo2, X } from 'lucide-react';
import type { FinanceCategory, Voucher } from '../types/finance.types';
import { VoucherStatusBadge } from './VoucherStatusBadge';
import { CommentDialog } from './CommentDialog';
import { VoucherFormModal } from './VoucherFormModal';
import { useVoucherAccess } from '../hooks/useVoucherAccess';
import { useVoucherActions } from '../hooks/useVoucherActions';
import { useDocumentDownload } from '../hooks/useDocumentDownload';
import { DOCUMENT_KIND_LABELS } from '../utils/gst';
import { VerificationBadge } from './VerificationBadge';
import { rupees, signTone } from '../utils/money';
import { formatDate } from '../utils/period';
import { formatDateTime } from '../../order-tracking/utils/orderTracking.utils';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';

type Dialog =
  | { kind: 'edit'; voucher: Voucher }
  | { kind: 'approve'; voucher: Voucher }
  | { kind: 'reject'; voucher: Voucher }
  | { kind: 'reverse'; voucher: Voucher }
  | { kind: 'withdraw'; voucher: Voucher };

/** "Taxable ₹1,000.00 · CGST ₹90.00 + SGST ₹90.00 @ 18% · GSTIN 27AAPFU0939F1ZV" */
const gstSummary = (voucher: Voucher) => {
  if (voucher.taxTreatment === 'NONE') return null;
  const taxes = voucher.taxTreatment === 'INTRA_STATE'
    ? `CGST ${rupees(voucher.cgstPaise)} + SGST ${rupees(voucher.sgstPaise)}`
    : `IGST ${rupees(voucher.igstPaise)}`;
  return [
    `Taxable ${rupees(voucher.taxablePaise)}`,
    `${taxes}${voucher.gstRate !== null ? ` @ ${voucher.gstRate}%` : ''}`,
    voucher.cessPaise ? `Cess ${rupees(voucher.cessPaise)}` : null,
    voucher.otherChargesPaise ? `Other ${rupees(voucher.otherChargesPaise)}` : null,
    voucher.roundOffPaise ? `Round off ${rupees(voucher.roundOffPaise)}` : null,
    `GSTIN ${voucher.supplierGstin}`,
    voucher.hsnSac ? `HSN/SAC ${voucher.hsnSac}` : null,
  ].filter(Boolean).join(' · ');
};

/** What the approver should know about the bills before posting. */
const approvalHint = (voucher: Voucher) => {
  const posting = 'Posting moves the money in the company account right away.';
  if (!voucher.documents.length) return `No bill or receipt is attached. ${posting}`;
  const review = voucher.documents.filter((doc) => doc.verificationStatus === 'NEEDS_REVIEW');
  if (review.length) return `Check the invoice: ${review.map((doc) => doc.verificationNotes).join(' ')} ${posting}`;
  if (!voucher.documents.some((doc) => doc.kind === 'INVOICE')) return `No invoice is attached, only other documents. ${posting}`;
  return posting;
};

const actionButton =
  'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/** Vouchers with the actions the signed-in user may take on each (the server enforces the same rules). */
export const VoucherTable: React.FC<{ vouchers: Voucher[]; categories: FinanceCategory[]; onChanged: () => void }> = ({
  vouchers,
  categories,
  onChanged,
}) => {
  const access = useVoucherAccess();
  const actions = useVoucherActions(onChanged);
  const { download, busyId } = useDocumentDownload();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" aria-label="Vouchers">
          <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="pb-2 pr-3 font-semibold">Voucher</th>
              <th className="pb-2 pr-3 font-semibold">For</th>
              <th className="pb-2 pr-3 font-semibold text-right">Amount</th>
              <th className="pb-2 pr-3 font-semibold">Status</th>
              <th className="pb-2 pr-3 font-semibold">Raised</th>
              <th className="pb-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5 text-gray-700 dark:text-gray-300 align-top">
            {vouchers.map((voucher) => (
              <tr key={voucher.id}>
                <td className="py-3 pr-3 whitespace-nowrap">
                  <div className="font-mono font-semibold text-black dark:text-white">{voucher.voucherNumber}</div>
                  <div className="text-gray-400">{formatDate(voucher.expenseDate)}</div>
                  {voucher.source === 'SHIPMENT' && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-500">
                      <Truck className="w-3 h-3" aria-hidden /> From shipment
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3 max-w-xs">
                  <div className="font-semibold text-black dark:text-white break-words">{voucher.title}</div>
                  <div className="text-gray-500">{voucher.categoryLabel}</div>
                  {(voucher.payee || voucher.reference || voucher.invoiceNumber) && (
                    <div className="text-gray-400 break-words">
                      {[voucher.payee, voucher.reference && `Ref ${voucher.reference}`, voucher.invoiceNumber && `Bill ${voucher.invoiceNumber}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                  {gstSummary(voucher) && (
                    <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 break-words" aria-label="GST breakdown">{gstSummary(voucher)}</div>
                  )}
                  {voucher.documents.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {voucher.documents.map((doc) => (
                        <span key={doc.id} className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => download(voucher.id, doc)} disabled={busyId === doc.id}
                          title={`${DOCUMENT_KIND_LABELS[doc.kind]} · ${doc.fileName}`} aria-label={`Download ${doc.fileName}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/20 cursor-pointer">
                          {busyId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" aria-hidden />}
                          {DOCUMENT_KIND_LABELS[doc.kind]}
                        </button>
                        <VerificationBadge document={doc} compact />
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className={`py-3 pr-3 text-right whitespace-nowrap font-semibold tabular-nums ${signTone(voucher.signedAmountPaise)}`}>
                  {voucher.signedAmountPaise > 0 ? '+' : ''}
                  {rupees(voucher.signedAmountPaise)}
                  {!voucher.cashImpact && <div className="text-[10px] font-normal text-gray-400">non-cash</div>}
                  {voucher.gstPaise > 0 && <div className="text-[10px] font-normal text-gray-400">incl. GST {rupees(voucher.gstPaise)}</div>}
                </td>
                <td className="py-3 pr-3">
                  <VoucherStatusBadge status={voucher.status} />
                  {voucher.decidedBy && voucher.status !== 'SUBMITTED' && (
                    <div className="mt-1 text-gray-400">
                      by {voucher.decidedBy}
                      {voucher.decisionComment && <div className="text-gray-500 break-words max-w-[14rem]">“{voucher.decisionComment}”</div>}
                    </div>
                  )}
                  {voucher.reversalReason && <div className="mt-1 text-purple-600 dark:text-purple-300 max-w-[14rem] break-words">{voucher.reversalReason}</div>}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  <div className="font-semibold">{voucher.submittedBy}</div>
                  <div className="text-gray-400">{formatDateTime(voucher.submittedAt)}</div>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {access.canDecide(voucher) && (
                      <>
                        <button type="button" className={`${actionButton} bg-emerald-600 text-white`} disabled={actions.isSubmitting}
                          onClick={() => setDialog({ kind: 'approve', voucher })}>
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button type="button" className={`${actionButton} bg-rose-500/10 text-rose-600`} disabled={actions.isSubmitting}
                          onClick={() => setDialog({ kind: 'reject', voucher })}>
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}
                    {access.canEdit(voucher) && (
                      <button type="button" className={`${actionButton} bg-black/5 dark:bg-white/10 text-black dark:text-white`}
                        disabled={actions.isSubmitting} onClick={() => setDialog({ kind: 'edit', voucher })}>
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    )}
                    {access.canWithdraw(voucher) && (
                      <button type="button" className={`${actionButton} bg-black/5 dark:bg-white/10 text-black dark:text-white`}
                        disabled={actions.isSubmitting} onClick={() => setDialog({ kind: 'withdraw', voucher })}>
                        <Undo2 className="w-3 h-3" /> Withdraw
                      </button>
                    )}
                    {access.canReverse(voucher) && (
                      <button type="button" className={`${actionButton} bg-purple-500/10 text-purple-700 dark:text-purple-300`}
                        disabled={actions.isSubmitting} onClick={() => setDialog({ kind: 'reverse', voucher })}>
                        <RotateCcw className="w-3 h-3" /> Reverse
                      </button>
                    )}
                    {voucher.status === 'SUBMITTED' && access.isApprover && access.isOwn(voucher) && (
                      <span className="text-[10px] text-gray-400">Another approver decides</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog?.kind === 'edit' && (
        <VoucherFormModal categories={categories} voucher={dialog.voucher} isSubmitting={actions.isSubmitting} onClose={close}
          onSubmit={(payload, documents) => actions.save(dialog.voucher.id, payload, documents)} />
      )}
      {dialog?.kind === 'approve' && (
        <CommentDialog title="Approve and post" required={false} tone="approve" label="Comment" confirmLabel="Approve & post"
          hint={approvalHint(dialog.voucher)}
          subtitle={`${dialog.voucher.voucherNumber} · ${rupees(dialog.voucher.signedAmountPaise)} · ${dialog.voucher.categoryLabel}`}
          isSubmitting={actions.isSubmitting} onClose={close} onSubmit={(comment) => actions.approve(dialog.voucher.id, comment)} />
      )}
      {dialog?.kind === 'reject' && (
        <CommentDialog title="Reject voucher" required tone="danger" label="Reason" confirmLabel="Reject"
          hint="Shown to whoever raised it. Nothing is posted."
          subtitle={`${dialog.voucher.voucherNumber} · ${rupees(dialog.voucher.signedAmountPaise)}`}
          isSubmitting={actions.isSubmitting} onClose={close} onSubmit={(comment) => actions.reject(dialog.voucher.id, comment)} />
      )}
      {dialog?.kind === 'reverse' && (
        <CommentDialog title="Reverse posted voucher" required tone="danger" label="Reason" confirmLabel="Post reversal"
          hint="An equal and opposite entry is posted today; the original entry stays in the ledger."
          subtitle={`${dialog.voucher.voucherNumber} · ${rupees(dialog.voucher.signedAmountPaise)}`}
          isSubmitting={actions.isSubmitting} onClose={close} onSubmit={(comment) => actions.reverse(dialog.voucher.id, comment)} />
      )}
      <ConfirmationModal
        isOpen={dialog?.kind === 'withdraw'}
        actionType="CONFIRM"
        tone="danger"
        requestId={dialog?.voucher.voucherNumber ?? null}
        title="Withdraw this voucher?"
        description="It will no longer wait for approval. Nothing was posted, so the account doesn't change."
        isSubmitting={actions.isSubmitting}
        onClose={close}
        onConfirm={async () => {
          if (dialog?.kind !== 'withdraw') return;
          await actions.cancel(dialog.voucher.id);
          close();
        }}
      />
    </>
  );
};
