import React from 'react';
import type { DealerStatusBadgeProps } from '../types/dealerComponentProps';

export const DealerStatusBadge: React.FC<DealerStatusBadgeProps> = ({ isActive }) => (
    <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
            isActive
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
        }`}
    >
        <span
            className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
        />
        {isActive ? 'Active' : 'Inactive'}
    </span>
);