import React from 'react';
import { X } from 'lucide-react';

/** Modal frame for the finance dialogs. */
export const DialogShell: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  disabled?: boolean;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, disabled, wide, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-4 text-xs`}
    >
      <div className="flex justify-between items-start gap-3 border-b border-black/10 dark:border-white/10 pb-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-black dark:text-white">{title}</h3>
          {subtitle && <p className="text-gray-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          disabled={disabled}
          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);
