import { useNotify } from '../../../hooks/useNotify';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { hasFormChanges } from '../../../utils/formChanges';
import type {
  CategoryResponse,
  ItemResponse,
  CreateItemRequest,
  UpdateItemRequest,
} from '../types/item.types';
import { AttributeInputBuilder } from '../../../components/ui/AttributeInputBuilder';
import { UnitOfMeasureSelect } from '../../../components/ui/UnitOfMeasureSelect';
import { ItemWarrantiesEditor, type WarrantyEditorChange } from './ItemWarrantiesEditor';
import {
  dropWarrantyErrors,
  nonWarrantyErrors,
  toWarrantyForms,
  toWarrantyRequests,
  validateWarrantyForms,
  warrantiesComplete,
  type WarrantyFormItem,
} from '../utils/itemWarranty';

interface Props {
  isOpen: boolean;
  isSubmitting: boolean;
  categories: CategoryResponse[];
  items: ItemResponse[];
  initialData: ItemResponse | null;
  onClose: () => void;
  onSubmit: (data: CreateItemRequest | UpdateItemRequest) => Promise<boolean>;
  /** Backend 400 field errors from the last save (e.g. `warranties[0].title`). */
  serverFieldErrors?: Record<string, string>;
}

// Keep in sync with the backend item constraints.
const validateItemPayload = (
  payload: { categoryIds: number[]; name: string; mrp: number; unitOfMeasure: string; countryOfOrigin: string }
): string | null => {
  if (payload.categoryIds.length === 0) return 'Please select at least one category.';
  if (payload.categoryIds.length > 20) return 'An item cannot have more than 20 categories.';
  if (payload.name.length < 2 || payload.name.length > 150) return 'Item name must be 2-150 characters.';
  if (!Number.isFinite(payload.mrp) || payload.mrp <= 0 || payload.mrp > 10_000_000) {
    return 'MRP must be a positive amount.';
  }
  if (!payload.unitOfMeasure) return 'Unit of measure is required.';
  if (!payload.countryOfOrigin) return 'Country of origin is required.';
  return null;
};

export const ItemFormModal: React.FC<Props> = ({
  isOpen,
  isSubmitting,
  categories,
  items,
  initialData,
  onClose,
  onSubmit,
  serverFieldErrors,
}) => {
  const [formData, setFormData] = useState({
    // Kept sorted, so the order categories were picked in doesn't count as a change
    categoryIds: [] as number[],
    name: '',
    brand: '',
    unitOfMeasure: 'PCS',
    mrp: '',
    countryOfOrigin: 'India',
    rawMaterialsUsed: '',
    termsAndCondition: '',
    description: '',
  });

  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [warranties, setWarranties] = useState<WarrantyFormItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // What the form opened with; Save stays disabled until something differs from it.
  const [baseline, setBaseline] = useState<{ formData: typeof formData; attributes: Record<string, string>; warranties: WarrantyFormItem[] } | null>(null);
  const notify = useNotify();

  // Show backend field errors from the latest save on their cards (adjusted during render, not in an effect).
  const [shownServerErrors, setShownServerErrors] = useState(serverFieldErrors);
  if (serverFieldErrors !== shownServerErrors) {
    setShownServerErrors(serverFieldErrors);
    setFieldErrors(serverFieldErrors ?? {});
  }

  useEffect(() => {
    if (initialData) {
      const initialForm = {
        categoryIds: (initialData.categories ?? []).map((c) => c.id).sort((a, b) => a - b),
        name: initialData.name,
        brand: initialData.brand || '',
        unitOfMeasure: initialData.unitOfMeasure,
        mrp: String(initialData.mrp),
        countryOfOrigin: initialData.countryOfOrigin || 'India',
        rawMaterialsUsed: initialData.rawMaterialsUsed || '',
        termsAndCondition: initialData.termsAndCondition || '',
        description: initialData.description || '',
      };
      const initialWarranties = toWarrantyForms(initialData.warranties);
      setFormData(initialForm);
      setAttributes(initialData.attributes || {});
      setWarranties(initialWarranties);
      setBaseline({ formData: initialForm, attributes: initialData.attributes || {}, warranties: initialWarranties });
    } else {
      const initialForm = {
        categoryIds: [] as number[],
        name: '',
        brand: '',
        unitOfMeasure: 'PCS',
        mrp: '',
        countryOfOrigin: 'India',
        rawMaterialsUsed: '',
        termsAndCondition: '',
        description: '',
      };
      setFormData(initialForm);
      setAttributes({});
      setWarranties([]);
      setBaseline({ formData: initialForm, attributes: {}, warranties: [] });
    }
    setFieldErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isEdit = !!initialData;
  const isFormComplete =
    formData.categoryIds.length > 0 &&
    !!formData.name.trim() &&
    !!formData.unitOfMeasure.trim() &&
    Number(formData.mrp) > 0 &&
    !!formData.countryOfOrigin.trim() &&
    warrantiesComplete(warranties);
  // `uid` is a client-only card key, not data.
  const withoutUids = (list: WarrantyFormItem[]) => list.map((w) => ({ ...w, uid: '' }));
  const hasChanges =
    !baseline ||
    hasFormChanges(
      { formData, attributes, warranties: withoutUids(warranties) },
      { ...baseline, warranties: withoutUids(baseline.warranties) }
    );

  const toggleCategory = (id: number) =>
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id].sort((a, b) => a - b),
    }));

  const handleWarrantiesChange: WarrantyEditorChange = (items, edited) => {
    setWarranties(items);
    setFieldErrors((prev) => dropWarrantyErrors(prev, edited));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete || !hasChanges) return;

    const basePayload = {
      categoryIds: formData.categoryIds,
      name: formData.name.trim(),
      brand: formData.brand.trim() || undefined,
      unitOfMeasure: formData.unitOfMeasure.trim(),
      mrp: Number(formData.mrp),
      countryOfOrigin: formData.countryOfOrigin.trim(),
      rawMaterialsUsed: formData.rawMaterialsUsed.trim() || undefined,
      termsAndCondition: formData.termsAndCondition.trim() || undefined,
      description: formData.description.trim() || undefined,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    };

    const error = validateItemPayload(basePayload);
    if (error) {
      notify.error(error);
      return;
    }

    const warrantyErrors = validateWarrantyForms(warranties);
    setFieldErrors(warrantyErrors);
    if (Object.keys(warrantyErrors).length > 0) {
      notify.error('Please fix the highlighted warranty fields.');
      return;
    }

    // Edit: always the complete set (saved ones with id, new ones without; [] removes all).
    // Create: never ids, and no key at all when there are none.
    const payload: CreateItemRequest | UpdateItemRequest = initialData
      ? { ...basePayload, isActive: initialData.isActive, warranties: toWarrantyRequests(warranties, true) }
      : {
          ...basePayload,
          ...(warranties.length > 0 ? { warranties: toWarrantyRequests(warranties, false) } : {}),
        };

    const success = await onSubmit(payload);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl border border-black/10 dark:border-white/10 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-black dark:text-white">
            {initialData ? 'Edit Item' : 'Create New Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Categories: dealers assigned any of them can quote for the item */}
            <div className="sm:col-span-2">
              <span className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                Categories *
              </span>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 max-h-36 overflow-y-auto">
                {categories.length === 0 && (
                  <span className="text-[11px] text-gray-400">No categories yet — create one with "New Category".</span>
                )}
                {categories.map((c) => {
                  const isSelected = formData.categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleCategory(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#0071e3] text-white'
                          : 'bg-black/5 dark:bg-white/10 text-gray-700 dark:text-neutral-300 hover:bg-black/10'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.categoryIds && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.categoryIds}</p>}
            </div>

            {/* SKU: always generated by the server and never editable */}
            <div>
              <label htmlFor="item-sku" className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                SKU
              </label>
              <input
                id="item-sku"
                type="text"
                readOnly
                disabled
                value={initialData?.sku ?? ''}
                placeholder="Generated on save, e.g. TQ-20261028-0001"
                className="w-full px-3 py-2 text-xs font-mono bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl disabled:opacity-60"
              />
              <p className="mt-1 text-[11px] text-gray-500 dark:text-neutral-400">
                TQ-year month day-number of the item that day. Assigned automatically and can't be changed.
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. ESP32 Microcontroller Board"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Espressif"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            {/* Unit of Measure (fixed list) */}
            <UnitOfMeasureSelect
              id="item-unit-of-measure"
              label="Unit of Measure"
              required
              value={formData.unitOfMeasure}
              onChange={(unitOfMeasure) => setFormData({ ...formData, unitOfMeasure })}
            />

            {/* MRP */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                MRP (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                placeholder="499.00"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            {/* Country of Origin */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                Country of Origin *
              </label>
              <input
                type="text"
                required
                value={formData.countryOfOrigin}
                onChange={(e) => setFormData({ ...formData, countryOfOrigin: e.target.value })}
                placeholder="e.g. India"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

          {/* Warranties (after pricing / origin) */}
          <ItemWarrantiesEditor
            items={warranties}
            onChange={handleWarrantiesChange}
            errors={fieldErrors}
            isEdit={isEdit}
            disabled={isSubmitting}
          />

          {/* Raw Materials */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
              Raw Materials Used
            </label>
            <input
              type="text"
              value={formData.rawMaterialsUsed}
              onChange={(e) => setFormData({ ...formData, rawMaterialsUsed: e.target.value })}
              placeholder="e.g. FR-4 Glass Epoxy, Silicon Chip"
              className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed item summary..."
              className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          {/* Terms & Conditions */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
              Terms & Conditions
            </label>
            <textarea
              rows={2}
              value={formData.termsAndCondition}
              onChange={(e) => setFormData({ ...formData, termsAndCondition: e.target.value })}
              placeholder="Handling instructions, return policy terms..."
              className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          {/* Dynamic Attribute Builder */}
          <AttributeInputBuilder
            existingItems={items}
            attributes={attributes}
            onChange={setAttributes}
          />

          {nonWarrantyErrors(fieldErrors).length > 0 && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 space-y-1">
              <p className="font-semibold">The server rejected some fields:</p>
              <ul className="list-disc pl-4">
                {nonWarrantyErrors(fieldErrors).map(([field, message]) => (
                  <li key={field}>
                    <span className="font-mono">{field}</span>: {message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormComplete || !hasChanges}
              title={!hasChanges ? 'No changes to save.' : undefined}
              className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Saving...'
                : initialData
                ? 'Update Item'
                : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};