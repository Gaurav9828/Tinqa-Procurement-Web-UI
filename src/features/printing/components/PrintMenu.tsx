import React from 'react';
import { Printer } from 'lucide-react';
import type { OrderStatus } from '../../../types/common.types';
import { PRINT_DOCUMENT_LABEL, openPrintView, printableDocuments } from '../printDocuments';

/** One button per document the order has so far: quotation, purchase order, bill. */
export const PrintMenu: React.FC<{ orderId: number; status: OrderStatus; compact?: boolean }> = ({ orderId, status, compact }) => (
  <div className="flex flex-wrap items-center gap-2">
    {printableDocuments(status).map((document) => (
      <button
        key={document}
        type="button"
        onClick={() => openPrintView(orderId, document)}
        aria-label={`Print ${PRINT_DOCUMENT_LABEL[document].toLowerCase()}`}
        className={`inline-flex items-center gap-1.5 rounded-xl border border-[#0071e3]/30 bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400 hover:bg-[#0071e3]/20 font-semibold cursor-pointer transition-colors ${
          compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
      >
        <Printer className="w-3.5 h-3.5" />
        {PRINT_DOCUMENT_LABEL[document]}
      </button>
    ))}
  </div>
);
