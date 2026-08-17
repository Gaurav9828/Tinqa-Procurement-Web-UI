import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import type { CreateCategoryRequest } from '../types/dealer.types';

interface DealerCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryRequest) => Promise<boolean>;
  isSubmitting: boolean;
  actionError?: string | null;
}

export const DealerCategoryFormModal: React.FC<DealerCategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  actionError,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCode('');
      setDescription('');
      setTouched({});
    }
  }, [isOpen]);

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Category name is required.';
    if (!code.trim()) errors.code = 'Category code is required.';
    return errors;
  }, [name, code]);

  const isValid = Object.keys(validationErrors).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const success = await onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
    });

    if (success) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Create New Category
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {actionError && <Alert type="error" message={actionError} />}

          {!isValid && Object.keys(touched).length > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Please fill in all required category fields.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onBlur={() => setTouched((p) => ({ ...p, name: true }))}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electrical Equipment"
              className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
            {touched.name && validationErrors.name && (
              <p className="mt-1 text-[11px] text-red-500">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
              Category Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onBlur={() => setTouched((p) => ({ ...p, code: true }))}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ELEC_EQP"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
            {touched.code && validationErrors.code && (
              <p className="mt-1 text-[11px] text-red-500">{validationErrors.code}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-neutral-300">
              Description
            </label>

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of category items..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`px-4 py-2 text-xs font-medium text-white rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                isValid && !isSubmitting
                  ? 'bg-[#0071e3] hover:bg-blue-600 shadow-sm'
                  : 'bg-gray-400 opacity-60 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Create Category</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};