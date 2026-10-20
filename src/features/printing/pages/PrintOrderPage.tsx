import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Printer, X } from 'lucide-react';
import { usePrintableOrder } from '../hooks/usePrintableOrder';
import { PrintableDocument } from '../components/PrintableDocument';
import { PRINT_DOCUMENT_LABEL, printableDocuments, type PrintDocument } from '../printDocuments';
import { SOLID_TONE } from '../../../components/ui/actionTones';

const isPrintDocument = (value: string | undefined): value is PrintDocument =>
  value === 'quotation' || value === 'order' || value === 'bill';

/** /print/orders/:orderId/:document — a bare page (no app chrome) that prints itself once loaded. */
export const PrintOrderPage: React.FC = () => {
  const params = useParams();
  const orderId = Number(params.orderId);
  const document = isPrintDocument(params.document) ? params.document : null;
  const { printable, error } = usePrintableOrder(orderId);
  const available = !!printable && !!document && printableDocuments(printable.order.orderStatus).includes(document);

  useEffect(() => {
    if (!available) return;
    window.document.title = `${PRINT_DOCUMENT_LABEL[document!]} ${printable!.order.orderNumber}`;
    // Give the logo a moment to load before the print dialog opens
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [available, document, printable]);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white py-6 print:py-0 px-4 print:px-0 text-black">
      <div className="mx-auto max-w-[800px] mb-4 flex justify-end gap-2 print:hidden">
        <button
          type="button"
          disabled={!available}
          onClick={() => window.print()}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 ${SOLID_TONE.primary}`}
        >
          <Printer className="w-4 h-4" /> Print
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-black/15 bg-white hover:bg-gray-50 cursor-pointer"
        >
          <X className="w-4 h-4" /> Close
        </button>
      </div>

      {!printable && !error && (
        <div className="py-20 flex justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}
      {error && <p className="mx-auto max-w-[800px] text-sm text-rose-600">{error}</p>}
      {printable && !available && (
        <p className="mx-auto max-w-[800px] text-sm text-gray-600">
          This document isn't available for order {printable.order.orderNumber} yet.
        </p>
      )}
      {available && <PrintableDocument document={document!} printable={printable!} />}
    </div>
  );
};
