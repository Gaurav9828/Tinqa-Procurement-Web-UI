import React from 'react';
import type { DemoStatus } from '../types/clientDemo.types';
import { STATUS_BADGE, STATUS_LABELS } from '../utils/clientDemo';

export const DemoStatusBadge: React.FC<{ status: DemoStatus }> = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${STATUS_BADGE[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);
