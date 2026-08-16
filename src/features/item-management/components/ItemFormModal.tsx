import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type {
  CategoryResponse,
  ItemResponse,
  CreateItemRequest,
  UpdateItemRequest,
} from '../types/item.types';
import { AttributeInputBuilder } from './AttributeInputBuilder';

interface Props {
  isOpen: boolean;
  isSubmitting: boolean;
  apiError: string | null;
  categories: CategoryResponse[];
  items: ItemResponse[];
  initialData: ItemResponse | null;
  onClose: () => void;
  onSubmit: (data: CreateItemRequest | UpdateItemRequest) => Promise<boolean>;
}

export const ItemFormModal: React.FC<Props> = ({
  isOpen,
  isSubmitting,
  apiError,
  categories,
  items,
  initialData,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    brand: '',
    sku: '',
    unitOfMeasure: 'PCS',
    mrp: '',
    countryOfOrigin: 'India',
    rawMaterialsUsed: '',
    warrantyMonths: '0',
    termsAndCondition: '',
    description: '',
  });

  const [attributes, setAttributes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        categoryId: String(initialData.categoryId),
        name: initialData.name,
        brand: initialData.brand || '',
        sku: initialData.sku,
        unitOfMeasure: initialData.unitOfMeasure,
        mrp: String(initialData.mrp),
        countryOfOrigin: initialData.countryOfOrigin || 'India',
        rawMaterialsUsed: initialData.rawMaterialsUsed || '',
        warrantyMonths: String(initialData.warrantyMonths ?? 0),
        termsAndCondition: initialData.termsAndCondition || '',
        description: initialData.description || '',
      });
      setAttributes(initialData.attributes || {});
    } else {
      setFormData({
        categoryId: categories[0]?.id ? String(categories[0].id) : '',
        name: '',
        brand: '',
        sku: '',
        unitOfMeasure: 'PCS',
        mrp: '',
        countryOfOrigin: 'India',
        rawMaterialsUsed: '',
        warrantyMonths: '0',
        termsAndCondition: '',
        description: '',
      });
      setAttributes({});
    }
  }, [initialData, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const basePayload = {
      categoryId: Number(formData.categoryId),
      name: formData.name.trim(),
      brand: formData.brand.trim() || undefined,
      unitOfMeasure: formData.unitOfMeasure.trim(),
      mrp: Number(formData.mrp),
      countryOfOrigin: formData.countryOfOrigin.trim(),
      rawMaterialsUsed: formData.rawMaterialsUsed.trim() || undefined,
      warrantyMonths: Number(formData.warrantyMonths),
      termsAndCondition: formData.termsAndCondition.trim() || undefined,
      description: formData.description.trim() || undefined,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    };

    const payload = initialData
      ? { ...basePayload, isActive: initialData.isActive }
      : { ...basePayload, sku: formData.sku.trim() };

    const success = await onSubmit(payload as any);
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
          {apiError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 font-medium">
              {apiError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                SKU *
              </label>
              <input
                type="text"
                required
                disabled={!!initialData}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. ESP32-WROOM-32"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-50"
              />
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

            {/* Unit of Measure */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                Unit of Measure *
              </label>
              <input
                type="text"
                required
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                placeholder="e.g. PCS, KG, METERS"
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

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

            {/* Warranty Months */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                Warranty (Months)
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={formData.warrantyMonths}
                onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

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
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
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