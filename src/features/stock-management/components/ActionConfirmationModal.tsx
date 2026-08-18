import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ActionConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  isSubmitting = false,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-black/10 dark:border-white/10 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-amber-500 mb-3">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-base font-semibold text-black dark:text-white">{title}</h3>
        </div>

        <p className="text-xs text-gray-600 dark:text-neutral-400 mb-6">{description}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};