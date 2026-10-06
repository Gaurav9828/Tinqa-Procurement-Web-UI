import React from 'react';
import { AlertTriangle, PackageSearch, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';
import { isRetryableErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

type StateVariant = 'empty' | 'noResults' | ApiErrorKind;

const CONTENT: Record<StateVariant, { icon: React.ElementType; title: string; body: string }> = {
  empty: {
    icon: PackageSearch,
    title: 'No orders yet',
    body: 'Orders placed on the ecommerce store will appear here.',
  },
  noResults: {
    icon: PackageSearch,
    title: 'No orders found',
    body: 'No orders match the current search or filters.',
  },
  forbidden: {
    icon: ShieldAlert,
    title: 'Permission denied',
    body: 'Your account is not allowed to view this information. Contact an Admin L2 if you need access.',
  },
  notFound: {
    icon: PackageSearch,
    title: 'Order not found',
    body: 'This order no longer exists or the order number is incorrect.',
  },
  conflict: {
    icon: AlertTriangle,
    title: 'Order changed',
    body: 'This order was changed by someone else. Refresh to see its latest state.',
  },
  rateLimited: {
    icon: AlertTriangle,
    title: 'Too many requests',
    body: 'Please wait a moment and try again.',
  },
  validation: {
    icon: AlertTriangle,
    title: 'Request rejected',
    body: 'The server rejected the request. Check the alert for details.',
  },
  server: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    body: 'The server could not complete the request. Please try again.',
  },
  network: {
    icon: WifiOff,
    title: 'Unable to reach the server',
    body: 'Check your connection and try again.',
  },
  unknown: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    body: 'The request failed. Please try again.',
  },
};

interface Props {
  variant: StateVariant;
  onRetry?: () => void;
  compact?: boolean;
}

/** Shared empty / error state for the order tracking page. */
export const OrderTrackingStateMessage: React.FC<Props> = ({ variant, onRetry, compact = false }) => {
  const { icon: Icon, title, body } = CONTENT[variant];
  const isInfo = variant === 'empty' || variant === 'noResults';
  const canRetry = !!onRetry && !isInfo && isRetryableErrorKind(variant);

  return (
    <div
      role={isInfo ? 'status' : 'alert'}
      className={`flex flex-col items-center text-center gap-2 text-gray-500 dark:text-neutral-400 ${compact ? 'p-6' : 'apple-card p-12'}`}
    >
      <Icon className="w-8 h-8 text-gray-400" />
      <h3 className="text-sm font-semibold text-black dark:text-white">{title}</h3>
      <p className="text-xs max-w-md">{body}</p>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
};
