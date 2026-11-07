import React, { useRef } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import type { InvoiceCheck, InvoiceVerificationStatus, OrderInvoice } from '../types/order.types';
import { formatCurrency } from '../../order-tracking/utils/orderTracking.utils';
import { INVOICE_ACCEPT } from '../hooks/useOrderInvoice';

interface Props {
  invoice: OrderInvoice | null;
  loading: boolean;
  uploading?: boolean;
  /** Shows the upload button (PROCUREMENT_ORDER_UPDATE_STATUS, while the order can still take an invoice). */
  canUpload?: boolean;
  onUpload?: (file: File) => void;
  onDownload: () => void;
}

const STATUS: Record<InvoiceVerificationStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  MATCHED: { label: 'Matches the quotation', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', Icon: CheckCircle2 },
  MISMATCH: { label: "Doesn't match the quotation", className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', Icon: XCircle },
  UNVERIFIED: { label: "Couldn't be checked automatically", className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', Icon: AlertTriangle },
};

const shown = (check: InvoiceCheck, value: string | null) => {
  if (value === null) return '—';
  return check.key === 'gstin' ? value : formatCurrency(Number(value));
};

/**
 * The supplier's invoice and what checking it against the quotation found: each figure (total, taxable value, CGST/SGST
 * or IGST, cess, the supplier's GSTIN) side by side, and who accepted it when it didn't match.
 */
export const InvoiceVerificationPanel: React.FC<Props> = ({ invoice, loading, uploading = false, canUpload = false, onUpload, onDownload }) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onUpload?.(file);
  };

  return (
    <section aria-label="Supplier invoice" className="p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-black dark:text-white">Supplier's invoice</p>
        {canUpload && onUpload && (
          <>
            <input ref={fileInput} type="file" accept={INVOICE_ACCEPT} className="hidden" aria-label="Invoice PDF" onChange={pick} />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-lg text-[#0071e3] hover:bg-[#0071e3]/10 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
              {invoice ? 'Upload another' : 'Upload invoice PDF'}
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="flex items-center gap-1.5 text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading invoice…</p>
      ) : !invoice ? (
        <p className="text-gray-500">
          No invoice uploaded yet. Upload the PDF the supplier sent: its total, GST and GSTIN are checked against the quotation before the order can be marked delivered.
        </p>
      ) : (
        <>
          {(() => {
            const { label, className, Icon } = STATUS[invoice.status];
            return (
              <p role="status" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold ${className}`}>
                <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
              </p>
            );
          })()}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-500">
            <button type="button" onClick={onDownload} className="inline-flex items-center gap-1 font-semibold text-[#0071e3] hover:underline cursor-pointer">
              <Download className="w-3 h-3" /> {invoice.fileName || 'Invoice PDF'}
            </button>
            {invoice.invoiceNumber && <span>· No. {invoice.invoiceNumber}</span>}
            {invoice.uploadedByUsername && <span>· uploaded by {invoice.uploadedByUsername}</span>}
          </p>

          <table className="w-full text-[11px] tabular-nums" aria-label="Invoice checks">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="font-medium py-1">Figure</th>
                <th className="font-medium py-1 text-right">Quotation</th>
                <th className="font-medium py-1 text-right">Invoice</th>
                <th className="py-1 w-5"><span className="sr-only">Result</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {invoice.checks.map((check) => (
                <React.Fragment key={check.key}>
                  <tr>
                    <td className="py-1 text-gray-600 dark:text-gray-300">{check.label}</td>
                    <td className="py-1 text-right">{shown(check, check.expected)}</td>
                    <td className={`py-1 text-right ${check.ok ? '' : 'text-rose-600 dark:text-rose-400 font-semibold'}`}>{shown(check, check.found)}</td>
                    <td className="py-1 text-right">
                      {check.ok
                        ? <CheckCircle2 aria-label="Matches" className="inline w-3.5 h-3.5 text-emerald-600" />
                        : <XCircle aria-label="Differs" className="inline w-3.5 h-3.5 text-rose-600" />}
                    </td>
                  </tr>
                  {check.message && (
                    <tr>
                      <td colSpan={4} className={`pb-1.5 ${check.ok ? 'text-gray-400' : 'text-rose-600 dark:text-rose-400'}`}>{check.message}</td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {invoice.overrideReason && (
            <p className="flex items-start gap-1.5 p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-gray-600 dark:text-gray-300">
              <ShieldCheck className="w-3.5 h-3.5 mt-px shrink-0 text-amber-600" />
              <span>
                Accepted by {invoice.overrideByUsername ?? 'an approver'}: {invoice.overrideReason}
              </span>
            </p>
          )}
        </>
      )}
    </section>
  );
};
