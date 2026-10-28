import React from 'react';
import { Lock } from 'lucide-react';
import type { BarcodeStatus } from '../types/barcode.types';
import { BARCODE_STATUS_LABELS, BARCODE_STATUS_STYLES } from '../utils/barcode';

export const BarcodeStatusBadge: React.FC<{ status: BarcodeStatus; locked?: boolean }> = ({ status, locked }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${BARCODE_STATUS_STYLES[status]}`}>
    {locked && <Lock className="w-2.5 h-2.5" aria-label="Locked" />}
    {BARCODE_STATUS_LABELS[status]}
  </span>
);
