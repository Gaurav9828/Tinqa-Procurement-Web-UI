import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface AlertProps {
  type: 'error' | 'success';
  message: string | null;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
  }, [message]);

  if (!message || !isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  const isError = type === 'error';

  return (
    <div
      className={`p-4 rounded-xl text-sm flex items-center justify-between gap-3 border transition-all ${
        isError
          ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
      }`}
    >
      <div className="flex items-center gap-3">
        {isError ? (
          <AlertCircle className="w-5 h-5 shrink-0" />
        ) : (
          <CheckCircle className="w-5 h-5 shrink-0" />
        )}
        <span>{message}</span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className={`p-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
          isError ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}
        aria-label="Dismiss alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};