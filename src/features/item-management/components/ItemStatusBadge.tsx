import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  active: boolean;
}

export const ItemStatusBadge: React.FC<Props> = ({ active }) => {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" /> Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 dark:text-neutral-400 border border-gray-500/20">
      <XCircle className="w-3.5 h-3.5" /> Inactive
    </span>
  );
};