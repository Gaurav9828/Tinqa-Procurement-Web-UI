import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Validator } from '../../../utils/validator';
import { Alert } from '../../../components/ui/Alert';
import type { QuantityAdjustmentRequest } from '../types/stock.types';

interface Props {
  isOpen: boolean;
  type: 'ADD' | 'REDUCE';
  stockIdentity: string;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onRequestSubmit: (payload: QuantityAdjustmentRequest) => void;
}

export const QuantityAdjustmentModal: React.FC<Props> = ({
  isOpen,
  type,
  stockIdentity,
  isSubmitting,
  error: externalError,
  onClose,
  onRequestSubmit,
}) => {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Sync external API error
  useEffect(() => {
    if (externalError) {
      setDisplayError(externalError);
    }
  }, [externalError]);

  // Reset local state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setReason('');
      setTouched(false);
      setDisplayError(null);
    }
  }, [isOpen]);

  const validationError = useMemo(() => {
    const num = Number(quantity);
    if (!Validator.isValid(quantity) || isNaN(num) || num <= 0) {
      return 'Quantity must be greater than zero.';
    }
    if (!reason.trim()) {
      return 'Adjustment reason is required.';
    }
    return null;
  }, [quantity, reason]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (validationError) return;

    setDisplayError(null);
    onRequestSubmit({
      quantity: Number(quantity),
      reason: reason.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-2xl border border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
          <h3 className="text-base font-semibold text-black dark:text-white flex items-center gap-2">
            {type === 'ADD' ? <Plus className="w-4 h-4 text-emerald-500" /> : <Minus className="w-4 h-4 text-rose-500" />}
            {type === 'ADD' ? 'Add Quantity' : 'Reduce Quantity'} ({stockIdentity})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server / Form Error Alert */}
          {displayError && (
            <Alert
              type="error"
              message={displayError}
              onClose={() => setDisplayError(null)}
            />
          )}

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                setDisplayError(null);
                setQuantity(e.target.value);
              }}
              placeholder="e.g. 25"
              className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setDisplayError(null);
                setReason(e.target.value);
              }}
              placeholder="Provide reason for stock quantity adjustment..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          {touched && validationError && <p className="text-[11px] text-red-500">{validationError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(validationError && touched)}
              className="px-4 py-2 text-xs font-medium bg-[#0071e3] hover:bg-[#0071e3]/90 text-white rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};