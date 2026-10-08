import React, { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { WARRANTY_LIMITS } from '../types/product.types';
import {
  emptyWarranty,
  warrantyErrorKey,
  WARRANTY_FIELD_LABELS,
  type WarrantyFormItem,
  type WarrantyTextField,
} from '../utils/warrantyForm';

/** `edited` is the error key to clear: one field, or 'all' when rows were added/removed (indexes shift). */
export type WarrantiesChange = (items: WarrantyFormItem[], edited: string | 'all') => void;

interface WarrantiesSectionProps {
  items: WarrantyFormItem[];
  onChange: WarrantiesChange;
  /** Keyed `warranties[i].<field>` (client validation or backend 400 field errors). */
  errors: Record<string, string>;
  disabled?: boolean;
}

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white ${
    hasError ? 'border-rose-500' : 'border-black/10 dark:border-white/10'
  }`;

const formatUpdatedAt = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const WarrantyTextInput: React.FC<{
  idPrefix: string;
  field: WarrantyTextField;
  value: string;
  error?: string;
  rows?: number;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}> = ({ idPrefix, field, value, error, rows, placeholder, disabled, onChange }) => {
  const id = `${idPrefix}-${field}`;
  const max = WARRANTY_LIMITS[field];
  const length = value.trim().length;
  const props = {
    id,
    value,
    placeholder,
    disabled,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${id}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    className: `${inputClass(!!error)}${rows ? ' resize-y' : ''}`,
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="font-medium text-gray-700 dark:text-gray-300">
          {WARRANTY_FIELD_LABELS[field]} *
        </label>
        <span className={`text-[10px] tabular-nums ${length > max ? 'text-rose-500 font-semibold' : 'text-gray-400'}`} data-testid={`${id}-count`}>
          {length.toLocaleString()}/{max.toLocaleString()}
        </span>
      </div>
      {rows ? <textarea rows={rows} {...props} /> : <input type="text" {...props} />}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
};

/** Product-level warranties for the create/edit product forms. Read/write shape lives in utils/warrantyForm. */
export const WarrantiesSection: React.FC<WarrantiesSectionProps> = ({ items, onChange, errors, disabled }) => {
  const baseId = useId();
  const [pendingRemoval, setPendingRemoval] = useState<WarrantyFormItem | null>(null);

  const update = (index: number, patch: Partial<WarrantyFormItem>, field?: WarrantyTextField) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next, field ? warrantyErrorKey(index, field) : warrantyErrorKey(index));
  };

  const remove = (uid: string) => onChange(items.filter((item) => item.uid !== uid), 'all');

  const requestRemove = (item: WarrantyFormItem) => {
    // Unsaved rows can go straight away; saved ones are deleted permanently on save.
    if (item.id === undefined) remove(item.uid);
    else setPendingRemoval(item);
  };

  return (
    <div className="space-y-3 pt-2 border-t border-black/10 dark:border-white/10" role="group" aria-label="Warranties">
      <div>
        <span className="block font-medium text-gray-700 dark:text-gray-300">Warranties</span>
        <p className="text-gray-400 mt-0.5">Overall product warranties. Inactive ones stay saved but are hidden from the store.</p>
      </div>

      {items.length === 0 && <p className="text-gray-400 italic">No warranties added.</p>}

      {items.map((item, index) => {
        const idPrefix = `${baseId}-w${index}`;
        const rowError = errors[warrantyErrorKey(index)];
        return (
          <fieldset
            key={item.uid}
            aria-label={`Warranty ${index + 1}`}
            data-inactive={!item.isActive}
            className={`p-3 rounded-xl border border-black/10 dark:border-white/10 space-y-3 transition-opacity ${
              item.isActive ? 'bg-black/[0.01] dark:bg-white/[0.01]' : 'opacity-60 bg-black/[0.03] dark:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-black dark:text-white">Warranty {index + 1}</span>
                {!item.isActive && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full border bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20">
                    Inactive
                  </span>
                )}
                {item.id === undefined && <span className="text-[10px] text-[#0071e3] font-medium">New</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={item.isActive}
                    disabled={disabled}
                    onChange={(e) => update(index, { isActive: e.target.checked })}
                    className="rounded border-black/10 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer"
                  />
                  Active
                </label>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => requestRemove(item)}
                  className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                  aria-label={`Remove warranty ${index + 1}`}
                  title="Remove warranty"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <WarrantyTextInput
              idPrefix={idPrefix}
              field="title"
              value={item.title}
              error={errors[warrantyErrorKey(index, 'title')]}
              placeholder="e.g. 1 Year Manufacturer Warranty"
              disabled={disabled}
              onChange={(value) => update(index, { title: value }, 'title')}
            />
            <WarrantyTextInput
              idPrefix={idPrefix}
              field="description"
              value={item.description}
              error={errors[warrantyErrorKey(index, 'description')]}
              rows={3}
              placeholder="What the warranty covers"
              disabled={disabled}
              onChange={(value) => update(index, { description: value }, 'description')}
            />
            <WarrantyTextInput
              idPrefix={idPrefix}
              field="generalTermsAndConditions"
              value={item.generalTermsAndConditions}
              error={errors[warrantyErrorKey(index, 'generalTermsAndConditions')]}
              rows={6}
              placeholder="Exclusions, claim process, conditions…"
              disabled={disabled}
              onChange={(value) => update(index, { generalTermsAndConditions: value }, 'generalTermsAndConditions')}
            />

            {rowError && (
              <p role="alert" className="text-rose-500">
                {rowError}
              </p>
            )}
            {item.updatedAt && <p className="text-[10px] text-gray-400">Last updated {formatUpdatedAt(item.updatedAt)}</p>}
          </fieldset>
        );
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...items, emptyWarranty()], 'all')}
        className="flex items-center gap-1.5 text-[#0071e3] hover:underline font-medium pt-1 cursor-pointer disabled:opacity-50"
      >
        <Plus className="w-3.5 h-3.5" /> Add Warranty
      </button>

      <ConfirmationModal
        isOpen={!!pendingRemoval}
        actionType="DELETE"
        title="Remove saved warranty?"
        description={`"${pendingRemoval?.title.trim() || 'This warranty'}" will be permanently deleted when you save the product. To hide it from customers but keep it, turn off "Active" instead.`}
        isSubmitting={false}
        onClose={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) remove(pendingRemoval.uid);
          setPendingRemoval(null);
        }}
      />
    </div>
  );
};
