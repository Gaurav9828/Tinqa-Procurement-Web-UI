import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { CommonInput } from '../../../components/ui/FormInputs';
import type { CreateCategoryRequest } from '../types/item.types';

interface Props {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryRequest) => Promise<boolean>;
}

export const CategoryFormModal: React.FC<Props> = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }
    const ok = await onSubmit({ name: name.trim(), code: code.trim(), description: description.trim() });
    if (ok) {
      setName('');
      setCode('');
      setDescription('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
          <h3 className="font-bold text-base text-black dark:text-white">Create Category</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-black dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <CommonInput
            label="Category Name"
            name="name"
            required
            placeholder="e.g. Hardware & Electronics"
            value={name}
            onChange={(e) => {
              setError(null);
              setName(e.target.value);
            }}
          />
          <CommonInput
            label="Category Code"
            name="code"
            placeholder="e.g. CAT-HW-01"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <CommonInput
            label="Description"
            name="description"
            placeholder="Optional brief overview..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> Save Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};