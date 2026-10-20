import React, { useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, Image as ImageIcon, Loader2, Paperclip, Receipt, RotateCcw, Trash2, XCircle } from 'lucide-react';
import type { CheckLevel, InvoiceAnalysis, VoucherDocument, VoucherDocumentKind } from '../types/finance.types';
import type { StagedDocument } from '../hooks/useVoucherActions';
import { useDocumentDownload } from '../hooks/useDocumentDownload';
import { DOCUMENT_KIND_LABELS, storedNamePreview } from '../utils/gst';
import { financeApi } from '../api/financeApi';
import { VerificationBadge } from './VerificationBadge';
import { compressImage, formatFileSize } from '../../../utils/compressImage';
import { getApiErrorMessage } from '../../../utils/apiError';
import { getApiErrorKind } from '../../../utils/apiErrorKind';

// Keep in sync with finance.documents.* in the Ecommerce backend
export const MAX_DOCUMENTS = 10;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
/** Photos may be larger when chosen: they are compressed before upload. */
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const TYPES: Record<string, { mime: string; extension: string }> = {
  pdf: { mime: 'application/pdf', extension: 'pdf' },
  jpg: { mime: 'image/jpeg', extension: 'jpg' },
  jpeg: { mime: 'image/jpeg', extension: 'jpg' },
  png: { mime: 'image/png', extension: 'png' },
  webp: { mime: 'image/webp', extension: 'webp' },
};
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
const ACCEPT_INVOICE = '.pdf,application/pdf';
// An invoice is only ever attached through "Attach invoice", where it is read and checked
const OTHER_KINDS = (Object.keys(DOCUMENT_KIND_LABELS) as VoucherDocumentKind[]).filter((kind) => kind !== 'INVOICE');

const CHECK_ICON: Record<CheckLevel, React.ReactNode> = {
  OK: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" aria-label="Passed" />,
  WARN: <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" aria-label="Check" />,
  ERROR: <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" aria-label="Failed" />,
};

const InvoiceChecks: React.FC<{ analysis: InvoiceAnalysis }> = ({ analysis }) => (
  <ul aria-label="Invoice checks" className="mt-1.5 space-y-0.5">
    {analysis.checks.map((check) => (
      <li key={check.code + check.message} className="flex items-start gap-1.5 text-[10px] text-gray-600 dark:text-gray-300">
        {CHECK_ICON[check.level]}
        <span>{check.message}</span>
      </li>
    ))}
  </ul>
);

const typeOf = (file: File) => {
  const byExtension = TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''];
  const byMime = Object.values(TYPES).find((type) => type.mime === file.type);
  return byMime ?? byExtension ?? null;
};

let stagedKey = 0;

interface Props {
  /** Null while raising a new voucher (its number is given on save). */
  voucherId: number | null;
  voucherNumber: string | null;
  invoiceNumber: string;
  expenseDate: string;
  attached: VoucherDocument[];
  removed: number[];
  staged: StagedDocument[];
  disabled: boolean;
  onStage: (documents: StagedDocument[]) => void;
  onUnstage: (key: string) => void;
  onKindChange: (key: string, kind: VoucherDocumentKind) => void;
  onToggleRemove: (documentId: number) => void;
  /** An invoice was read: pre-fill the form from it. */
  onInvoiceRead: (analysis: InvoiceAnalysis, fileName: string) => void;
}

/**
 * Bills, receipts and payment proofs for the voucher. Photos are compressed as soon as they are chosen; everything is
 * uploaded when the voucher is saved, and the server stores each file under a name built from the voucher.
 */
export const VoucherDocumentsField: React.FC<Props> = ({
  voucherId, voucherNumber, invoiceNumber, expenseDate, attached, removed, staged, disabled,
  onStage, onUnstage, onKindChange, onToggleRemove, onInvoiceRead,
}) => {
  const inputId = useId();
  const invoiceInputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const invoiceInput = useRef<HTMLInputElement>(null);
  const [isPreparing, setIsPreparing] = useState<'invoice' | 'other' | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const { download, busyId } = useDocumentDownload();

  const kept = attached.filter((doc) => !removed.includes(doc.id));
  const room = MAX_DOCUMENTS - kept.length - staged.length;

  /** Reads an invoice PDF: refused when it isn't one, otherwise its details pre-fill the form. */
  const readInvoice = async (file: File, problems: string[]): Promise<StagedDocument | null> => {
    if (typeOf(file)?.mime !== 'application/pdf') {
      problems.push(`${file.name}: an invoice must be the supplier's PDF. Attach a photo of a bill as a receipt instead.`);
      return null;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      problems.push(`${file.name} is ${formatFileSize(file.size)}; the limit is 5 MB.`);
      return null;
    }
    const staged: StagedDocument = { key: `staged-${++stagedKey}`, file, kind: 'INVOICE', originalSize: file.size, compressed: false };
    try {
      const res = await financeApi.analyzeInvoice(file);
      const analysis = res.data;
      const error = analysis.checks.find((check) => check.level === 'ERROR');
      if (error) {
        problems.push(`${file.name}: ${error.message}`);
        return null;
      }
      if (analysis.textFound) onInvoiceRead(analysis, file.name);
      return { ...staged, analysis };
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'The invoice could not be read.');
      // A refusal (wrong type, too large) stops it; anything else lets the server check it on save
      if (getApiErrorKind(err) === 'validation') {
        problems.push(`${file.name}: ${message}`);
        return null;
      }
      return { ...staged, readError: `${message} Enter the details by hand.` };
    }
  };

  const choose = async (files: FileList | null, asInvoice: boolean) => {
    if (!files?.length) return;
    const problems: string[] = [];
    const picked = Array.from(files);
    if (picked.length > room) problems.push(`Only ${MAX_DOCUMENTS} files fit on a voucher; ${picked.length - Math.max(room, 0)} were left out.`);
    setIsPreparing(asInvoice ? 'invoice' : 'other');
    const ready: StagedDocument[] = [];
    for (const file of picked.slice(0, Math.max(room, 0))) {
      if (asInvoice) {
        const invoice = await readInvoice(file, problems);
        if (invoice) ready.push(invoice);
        continue;
      }
      const type = typeOf(file);
      if (!type) {
        problems.push(`${file.name}: only PDF, JPG, PNG or WEBP files can be attached.`);
        continue;
      }
      if (file.size === 0) {
        problems.push(`${file.name} is empty.`);
        continue;
      }
      const isPhoto = type.mime !== 'application/pdf';
      if (file.size > (isPhoto ? MAX_PHOTO_BYTES : MAX_DOCUMENT_BYTES)) {
        problems.push(`${file.name} is ${formatFileSize(file.size)}; the limit is ${formatFileSize(isPhoto ? MAX_PHOTO_BYTES : MAX_DOCUMENT_BYTES)}.`);
        continue;
      }
      const result = isPhoto ? await compressImage(file) : { file, originalSize: file.size, compressed: false };
      if (result.file.size > MAX_DOCUMENT_BYTES) {
        problems.push(`${file.name} is still ${formatFileSize(result.file.size)} after compression; the limit is 5 MB. Try a smaller photo or scan.`);
        continue;
      }
      ready.push({ key: `staged-${++stagedKey}`, file: result.file, kind: 'RECEIPT', originalSize: result.originalSize, compressed: result.compressed });
    }
    setIsPreparing(null);
    setErrors(problems);
    if (ready.length) onStage(ready);
    if (input.current) input.current.value = '';
    if (invoiceInput.current) invoiceInput.current.value = '';
  };

  // Mirrors how the server numbers files of the same kind
  const sequenceOf = (doc: StagedDocument) =>
    kept.filter((other) => other.kind === doc.kind).length +
    staged.slice(0, staged.indexOf(doc)).filter((other) => other.kind === doc.kind).length + 1;

  return (
    <fieldset className="space-y-2" aria-label="Bills and receipts" disabled={disabled}>
      <div className="flex items-center justify-between gap-2 px-1">
        <legend className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Bills & receipts</legend>
        <span className="text-[10px] text-gray-400">{kept.length + staged.length}/{MAX_DOCUMENTS} files</span>
      </div>

      {(attached.length > 0 || staged.length > 0) && (
        <ul className="space-y-1.5">
          {attached.map((doc) => {
            const isRemoved = removed.includes(doc.id);
            return (
              <li key={doc.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-black/5 dark:border-white/10 ${isRemoved ? 'opacity-50' : ''}`}>
                {doc.contentType === 'application/pdf' ? <FileText className="w-4 h-4 shrink-0 text-gray-400" aria-hidden /> : <ImageIcon className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <div className={`font-mono text-[11px] text-black dark:text-white break-all ${isRemoved ? 'line-through' : ''}`}>{doc.fileName}</div>
                  <div className="text-[10px] text-gray-400">
                    {DOCUMENT_KIND_LABELS[doc.kind]} · {formatFileSize(doc.sizeBytes)}
                    {doc.originalName && ` · was ${doc.originalName}`}
                    {isRemoved && ' · removed on save'}
                  </div>
                  <VerificationBadge document={doc} />
                </div>
                {voucherId !== null && !isRemoved && (
                  <button type="button" onClick={() => download(voucherId, doc)} disabled={busyId === doc.id} aria-label={`Download ${doc.fileName}`}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 cursor-pointer">
                    {busyId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button type="button" onClick={() => onToggleRemove(doc.id)} aria-label={isRemoved ? `Keep ${doc.fileName}` : `Remove ${doc.fileName}`}
                  className={`p-1.5 rounded-lg cursor-pointer ${isRemoved ? 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/10' : 'text-rose-600 hover:bg-rose-500/10'}`}>
                  {isRemoved ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </li>
            );
          })}
          {staged.map((doc) => (
            <li key={doc.key} className="flex flex-wrap sm:flex-nowrap items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#0071e3]/40 bg-[#0071e3]/[0.03]">
              <Paperclip className="w-4 h-4 shrink-0 text-[#0071e3]" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-black dark:text-white break-all">{doc.file.name}</div>
                <div className="text-[10px] text-gray-400">
                  {doc.compressed ? `${formatFileSize(doc.originalSize)} → ${formatFileSize(doc.file.size)} compressed` : formatFileSize(doc.file.size)}
                  {' · saved as '}
                  <span className="font-mono">
                    {storedNamePreview(voucherNumber, doc.kind, invoiceNumber, expenseDate, sequenceOf(doc), typeOf(doc.file)?.extension ?? 'pdf')}
                  </span>
                </div>
                {doc.analysis && <InvoiceChecks analysis={doc.analysis} />}
                {doc.readError && <p className="mt-1 text-[10px] text-amber-600">{doc.readError}</p>}
              </div>
              <select aria-label={`Kind of ${doc.file.name}`} value={doc.kind} onChange={(e) => onKindChange(doc.key, e.target.value as VoucherDocumentKind)}
                className="px-2 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent text-[11px] text-black dark:text-white cursor-pointer">
                {(doc.kind === 'INVOICE' ? ['INVOICE' as const, ...OTHER_KINDS] : OTHER_KINDS).map((kind) => (
                  <option key={kind} value={kind} className="bg-white dark:bg-[#1c1c1e]">{DOCUMENT_KIND_LABELS[kind]}</option>
                ))}
              </select>
              <button type="button" onClick={() => onUnstage(doc.key)} aria-label={`Don't attach ${doc.file.name}`}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label htmlFor={invoiceInputId}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl border border-dashed border-[#0071e3]/40 text-xs font-semibold text-[#0071e3] ${room > 0 && !isPreparing ? 'cursor-pointer hover:bg-[#0071e3]/[0.04]' : 'opacity-50 cursor-not-allowed'}`}>
          <span className="flex items-center gap-2">
            {isPreparing === 'invoice' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {isPreparing === 'invoice' ? 'Reading invoice…' : 'Attach invoice (PDF)'}
          </span>
          <span className="text-[10px] font-normal text-gray-500">Checked and read to fill in the form</span>
        </label>
        <label htmlFor={inputId}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-3 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-xs font-semibold text-gray-600 dark:text-gray-300 ${room > 0 && !isPreparing ? 'cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]' : 'opacity-50 cursor-not-allowed'}`}>
          <span className="flex items-center gap-2">
            {isPreparing === 'other' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
            {isPreparing === 'other' ? 'Compressing…' : 'Attach receipt or payment proof'}
          </span>
          <span className="text-[10px] font-normal text-gray-500">PDF or photo; photos are compressed</span>
        </label>
      </div>
      {room <= 0 && <p className="text-[11px] text-gray-500 px-1">File limit reached.</p>}
      <input id={invoiceInputId} ref={invoiceInput} type="file" accept={ACCEPT_INVOICE} multiple className="sr-only" aria-label="Attach invoice"
        disabled={disabled || Boolean(isPreparing) || room <= 0} onChange={(e) => choose(e.target.files, true)} />
      <input id={inputId} ref={input} type="file" accept={ACCEPT} multiple className="sr-only" aria-label="Attach receipt or proof"
        disabled={disabled || Boolean(isPreparing) || room <= 0} onChange={(e) => choose(e.target.files, false)} />
      {errors.map((message) => (
        <p key={message} className="text-[11px] text-rose-500 px-1">{message}</p>
      ))}
    </fieldset>
  );
};
