import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw, SearchX, ShieldAlert, WifiOff } from 'lucide-react';
import { LIMITS } from '../utils/companyProfileForm';
import { BUTTON, validateRejectComment } from '../utils/companyProfileUi';
import { isRetryableErrorKind, type ApiErrorKind } from '../../../utils/apiErrorKind';

const Backdrop: React.FC<{ label: string; onClose: () => void; children: React.ReactNode }> = ({ label, onClose, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('textarea, button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl text-xs p-6 space-y-4"
      >
        {children}
      </div>
    </div>
  );
};


interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: 'primary' | 'approve' | 'danger';
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, body, confirmLabel, tone = 'primary', busy, onConfirm, onClose }) => (
  <Backdrop label={title} onClose={onClose}>
    <h2 className="text-sm font-bold text-black dark:text-white">{title}</h2>
    <p className="text-gray-600 dark:text-gray-300">{body}</p>
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className={BUTTON.secondary}>
        Cancel
      </button>
      <button type="button" disabled={busy} onClick={onConfirm} className={BUTTON[tone]}>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  </Backdrop>
);

const COMMENT_MAX = LIMITS.rejectComment.max;

/** Reject with a required comment (3-500 chars, plain text). Resolves the server's field error too. */
export const RejectDialog: React.FC<{
  busy: boolean;
  serverError?: string;
  onReject: (comment: string) => void;
  onClose: () => void;
}> = ({ busy, serverError, onReject, onClose }) => {
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const error = validateRejectComment(comment);
  const shown = touched ? (error ?? serverError) : null;
  return (
    <Backdrop label="Reject change" onClose={onClose}>
      <h2 className="text-sm font-bold text-black dark:text-white">Reject change</h2>
      <p className="text-gray-600 dark:text-gray-300">The maker sees your comment and can edit and resubmit the change.</p>
      <div>
        <label htmlFor="reject-comment" className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Comment *
        </label>
        <textarea
          id="reject-comment"
          rows={4}
          value={comment}
          maxLength={COMMENT_MAX + 50}
          aria-invalid={!!shown}
          aria-describedby="reject-comment-help"
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="What needs to change?"
          className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-y"
        />
        <div id="reject-comment-help" className="flex justify-between text-[10px]">
          <span className="text-rose-500" role={shown ? 'alert' : undefined}>
            {shown}
          </span>
          <span className="text-gray-400">
            {comment.trim().length}/{COMMENT_MAX}
          </span>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={BUTTON.secondary}>
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setTouched(true);
            if (!error) onReject(comment.trim());
          }}
          className={BUTTON.danger}
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Reject
        </button>
      </div>
    </Backdrop>
  );
};

type StateVariant = ApiErrorKind | 'empty';

const STATE_CONTENT: Record<StateVariant, { icon: React.ElementType; title: string; body: string }> = {
  empty: { icon: Inbox, title: 'Nothing here yet', body: '' },
  forbidden: { icon: ShieldAlert, title: 'Permission denied', body: 'Your admin level is not allowed to view this.' },
  notFound: { icon: SearchX, title: 'Not found', body: 'This version does not exist.' },
  unsupported: { icon: AlertTriangle, title: 'Not supported', body: "The server doesn't support this request yet." },
  conflict: { icon: AlertTriangle, title: 'Changed elsewhere', body: 'Refresh to see the latest state.' },
  validation: { icon: AlertTriangle, title: 'Request rejected', body: 'The server rejected the request.' },
  rateLimited: { icon: AlertTriangle, title: 'Too many requests', body: 'Please wait a moment and try again.' },
  server: { icon: AlertTriangle, title: 'Something went wrong', body: 'The server could not complete the request.' },
  network: { icon: WifiOff, title: 'Unable to reach the server', body: 'Check your connection and try again.' },
  unknown: { icon: AlertTriangle, title: 'Something went wrong', body: 'The request failed. Please try again.' },
};

export const StateMessage: React.FC<{ variant: StateVariant; title?: string; body?: string; onRetry?: () => void }> = ({
  variant,
  title,
  body,
  onRetry,
}) => {
  const content = STATE_CONTENT[variant];
  const Icon = content.icon;
  const canRetry = !!onRetry && variant !== 'empty' && isRetryableErrorKind(variant);
  return (
    <div role={variant === 'empty' ? 'status' : 'alert'} className="apple-card p-10 flex flex-col items-center text-center gap-2 text-gray-500 dark:text-neutral-400">
      <Icon className="w-7 h-7 text-gray-400" />
      <h3 className="text-sm font-semibold text-black dark:text-white">{title ?? content.title}</h3>
      {(body ?? content.body) && <p className="text-xs max-w-md">{body ?? content.body}</p>}
      {canRetry && (
        <button type="button" onClick={onRetry} className={`${BUTTON.secondary} mt-2 text-xs`}>
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
};

/** Loading skeleton blocks. */
export const Skeleton: React.FC<{ lines?: number; label: string }> = ({ lines = 4, label }) => (
  <div role="status" aria-label={label} className="apple-card p-6 space-y-3 animate-pulse">
    {Array.from({ length: lines }, (_, i) => (
      <div key={i} className="h-3 rounded bg-black/10 dark:bg-white/10" style={{ width: `${90 - i * 12}%` }} />
    ))}
  </div>
);
