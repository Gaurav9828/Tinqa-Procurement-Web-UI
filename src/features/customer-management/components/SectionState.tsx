import React from 'react';
import { RefreshCw } from 'lucide-react';
import { isRetryableErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

const ERROR_TEXT: Partial<Record<ApiErrorKind, string>> = {
  forbidden: "You don't have permission to see this.",
  notFound: 'This customer does not exist.',
  network: 'Could not reach the server. Check your connection.',
};

/** Loading, failed or empty state of one block of a customer page. The alert already carries the server's message. */
export const SectionState: React.FC<{
  isLoading?: boolean;
  errorKind?: ApiErrorKind | null;
  empty?: string;
  onRetry?: () => void;
}> = ({ isLoading, errorKind, empty, onRetry }) => {
  if (isLoading) {
    return (
      <p role="status" className="p-6 text-center text-xs text-gray-500 dark:text-neutral-400">
        Loading...
      </p>
    );
  }
  if (errorKind) {
    return (
      <div role="alert" className="p-6 text-center text-xs text-gray-500 dark:text-neutral-400 space-y-2">
        <p>{ERROR_TEXT[errorKind] ?? 'This could not be loaded.'}</p>
        {onRetry && isRetryableErrorKind(errorKind) && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        )}
      </div>
    );
  }
  return <p className="p-6 text-center text-xs text-gray-500 dark:text-neutral-400">{empty}</p>;
};
