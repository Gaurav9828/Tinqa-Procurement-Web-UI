import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pager: React.FC<{ page: number; totalPages: number; disabled?: boolean; onPage: (page: number) => void }> = ({
  page,
  totalPages,
  disabled,
  onPage,
}) =>
  totalPages > 1 ? (
    <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
      <span>
        Page {page + 1} of {totalPages}
      </span>
      <button type="button" aria-label="Previous page" disabled={page === 0 || disabled} onClick={() => onPage(page - 1)}
        className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 disabled:opacity-40 cursor-pointer">
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button type="button" aria-label="Next page" disabled={page >= totalPages - 1 || disabled} onClick={() => onPage(page + 1)}
        className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 disabled:opacity-40 cursor-pointer">
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  ) : null;
