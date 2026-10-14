import React from 'react';
import { Eye, EyeOff, PencilLine } from 'lucide-react';

export const ReviewStatusBadge: React.FC<{ active: boolean }> = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
      <Eye className="w-3 h-3" aria-hidden="true" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-500/10 text-gray-600 dark:text-neutral-300 border border-gray-500/20 whitespace-nowrap">
      <EyeOff className="w-3 h-3" aria-hidden="true" /> Hidden
    </span>
  );

/** Shown when the customer changed the review after first posting it. */
export const ReviewEditedBadge: React.FC<{ editedAt: string | null }> = ({ editedAt }) =>
  editedAt ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
      <PencilLine className="w-3 h-3" aria-hidden="true" /> Edited
    </span>
  ) : null;
