import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { ProductResponse, UpdateProductRequest, SpecificationDTO } from '../types/product.types';
import { WarrantiesSection, type WarrantiesChange } from './WarrantiesSection';
import { FormFieldErrors } from './FormFieldErrors';
import {
  describeWarrantyChanges,
  dropWarrantyErrors,
  summarizeWarranties,
  toWarrantyFormItems,
  toWarrantyRequests,
  validateWarranties,
  warrantiesChanged,
  type WarrantyFormItem,
} from '../utils/warrantyForm';

interface EditProductModalProps {
  product: ProductResponse | null;
  onClose: () => void;
  onSubmit: (id: number, payload: UpdateProductRequest) => Promise<boolean>;
  isSubmitting: boolean;
  /** Backend 400 field errors from the last save (e.g. `warranties[0].title`). */
  serverFieldErrors?: Record<string, string>;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  onSubmit,
  isSubmitting,
  serverFieldErrors,
}) => {
  const [formData, setFormData] = useState<UpdateProductRequest>({
    title: '',
    tagline: '',
    description: '',
    price: 0,
    discountPercentage: 0,
    image1Url: '',
    image2Url: '',
    image3Url: '',
    image4Url: '',
    image5Url: '',
    enabled: true,
    stockQuantity: 0,
    lastUpdateDescription: '',
    specifications: [],
  });

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<UpdateProductRequest | null>(null);

  // Warranties come from the admin list (GET /products, inactive included). Saved ones keep their id.
  const [warranties, setWarranties] = useState<WarrantyFormItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Show backend field errors from the latest save inline (state adjusted during render, not in an effect).
  const [shownServerErrors, setShownServerErrors] = useState(serverFieldErrors);
  if (serverFieldErrors !== shownServerErrors) {
    setShownServerErrors(serverFieldErrors);
    setFieldErrors(serverFieldErrors ?? {});
  }

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        tagline: product.tagline || '',
        description: product.description || '',
        price: product.price || 0,
        discountPercentage: product.discountPercentage || 0,
        image1Url: product.image1Url || '',
        image2Url: product.image2Url || '',
        image3Url: product.image3Url || '',
        image4Url: product.image4Url || '',
        image5Url: product.image5Url || '',
        enabled: product.enabled ?? true,
        stockQuantity: product.stockQuantity || 0,
        lastUpdateDescription: '',
        specifications: product.specifications ? product.specifications.map(s => ({ specKey: s.specKey, specValue: s.specValue })) : [],
      });
      setWarranties(toWarrantyFormItems(product.warranties));
      setFieldErrors({});
    }
  }, [product]);

  if (!product) return null;

  // Helper to compute diffs between original product and formData
  const getChangedFields = () => {
    if (!product) return [];
    const changes: { label: string; oldVal: any; newVal: any }[] = [];

    if (formData.title !== product.title) {
      changes.push({ label: 'Title', oldVal: product.title, newVal: formData.title });
    }
    if ((formData.tagline || '') !== (product.tagline || '')) {
      changes.push({ label: 'Tagline', oldVal: product.tagline || 'None', newVal: formData.tagline || 'None' });
    }
    if (Number(formData.price) !== Number(product.price)) {
      changes.push({ label: 'Price', oldVal: `₹${product.price}`, newVal: `₹${formData.price}` });
    }
    if (Number(formData.stockQuantity) !== Number(product.stockQuantity)) {
      changes.push({ label: 'Stock Quantity', oldVal: product.stockQuantity, newVal: formData.stockQuantity });
    }
    if (Number(formData.discountPercentage || 0) !== Number(product.discountPercentage || 0)) {
      changes.push({ label: 'Discount Percentage', oldVal: `${product.discountPercentage || 0}%`, newVal: `${formData.discountPercentage || 0}%` });
    }
    if ((formData.description || '') !== (product.description || '')) {
      changes.push({ label: 'Description', oldVal: product.description || 'None', newVal: formData.description || 'None' });
    }
    if (Boolean(formData.enabled) !== Boolean(product.enabled)) {
      changes.push({ label: 'Status (Enabled)', oldVal: product.enabled ? 'Active' : 'Disabled', newVal: formData.enabled ? 'Active' : 'Disabled' });
    }

    // Check images
    for (let i = 1; i <= 5; i++) {
      const key = `image${i}Url` as keyof ProductResponse;
      const payloadKey = `image${i}Url` as keyof UpdateProductRequest;
      if ((formData[payloadKey] || '') !== (product[key] || '')) {
        changes.push({ label: `Image ${i} URL`, oldVal: product[key] || 'None', newVal: formData[payloadKey] || 'None' });
      }
    }

    // Check specifications
    const oldSpecsFormatted = product.specifications ? product.specifications.map(s => `${s.specKey}:${s.specValue}`).sort().join('|') : '';
    const newSpecsFormatted = formData.specifications ? formData.specifications.map(s => `${s.specKey}:${s.specValue}`).sort().join('|') : '';
    if (oldSpecsFormatted !== newSpecsFormatted) {
      changes.push({ 
        label: 'Specifications', 
        oldVal: product.specifications?.length ? product.specifications.map(s => `${s.specKey}: ${s.specValue}`).join(', ') : 'None', 
        newVal: formData.specifications?.length ? formData.specifications.map(s => `${s.specKey}: ${s.specValue}`).join(', ') : 'None' 
      });
    }

    // Check warranties
    const originalWarranties = product.warranties ?? [];
    if (warrantiesChanged(originalWarranties, warranties)) {
      changes.push({
        label: 'Warranties',
        oldVal: summarizeWarranties(originalWarranties),
        newVal: describeWarrantyChanges(originalWarranties, warranties).join('\n') || summarizeWarranties(warranties),
      });
    }

    return changes;
  };

  const changedFields = getChangedFields();

  // Button is only enabled if fields are valid AND at least one modification is caught
  const isFormValid =
    formData.title?.trim() !== '' &&
    Number(formData.price) >= 0 &&
    Number(formData.stockQuantity) >= 0 &&
    changedFields.length > 0;

  const handleAddSpec = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...(prev.specifications || []), { specKey: '', specValue: '' }],
    }));
  };

  const handleRemoveSpec = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications?.filter((_, i) => i !== index),
    }));
  };

  const handleSpecChange = (index: number, field: keyof SpecificationDTO, value: string) => {
    const updated = [...(formData.specifications || [])];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, specifications: updated }));
  };

  const handleWarrantiesChange: WarrantiesChange = (items, edited) => {
    setWarranties(items);
    setFieldErrors((prev) => dropWarrantyErrors(prev, edited));
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const warrantyErrors = validateWarranties(warranties);
    setFieldErrors(warrantyErrors);
    if (Object.keys(warrantyErrors).length > 0) return;

    // Always send the full list (saved ones with id, new ones without) so removals are applied.
    setPendingPayload({ ...formData, warranties: toWarrantyRequests(warranties, true) });
    setShowPreviewModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingPayload) return;

    const success = await onSubmit(product.id, pendingPayload);
    
    if (success) {
      setShowPreviewModal(false);
      setPendingPayload(null);
      onClose();
    } else {
      setShowPreviewModal(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
            <h2 className="text-sm font-bold text-black dark:text-white">Edit Product #{product.id}</h2>
            <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleInitialSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Price (₹) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Stock Qty *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData({ ...formData, discountPercentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-gray-700 dark:text-gray-300">Product Image Paths/URLs (Up to 5)</label>
              {['image1Url', 'image2Url', 'image3Url', 'image4Url', 'image5Url'].map((field, idx) => (
                <input
                  key={field}
                  type="text"
                  placeholder={`Image ${idx + 1} Path`}
                  value={(formData as any)[field]}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="w-full px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white"
                />
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Specifications</label>
                <button
                  type="button"
                  onClick={handleAddSpec}
                  className="flex items-center gap-1 text-[#0071e3] hover:underline font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Spec
                </button>
              </div>
              <div className="space-y-2">
                {formData.specifications?.map((spec, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Spec Key"
                      value={spec.specKey}
                      onChange={(e) => handleSpecChange(index, 'specKey', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Spec Value"
                      value={spec.specValue}
                      onChange={(e) => handleSpecChange(index, 'specValue', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(index)}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <WarrantiesSection items={warranties} onChange={handleWarrantiesChange} errors={fieldErrors} disabled={isSubmitting} />

            <FormFieldErrors errors={fieldErrors} />

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editIsEnabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded border-black/10 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer"
              />
              <label htmlFor="editIsEnabled" className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                Product is Enabled (Active in store)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 text-black dark:text-white rounded-xl font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium disabled:opacity-50 cursor-pointer"
              >
                Review & Update
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation & Changed Fields Preview Modal */}
      {showPreviewModal && pendingPayload && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-xs">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 bg-black/[0.01]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0071e3]" />
                <h3 className="text-sm font-bold text-black dark:text-white">Review Modified Changes</h3>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {changedFields.length === 0 ? (
                <p className="text-center text-gray-500 py-4 font-medium">No changes detected in your product details.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500 font-medium">Only the following modified fields will be updated:</p>
                  {changedFields.map((field, idx) => (
                    <div key={idx} className="border border-black/10 dark:border-white/10 rounded-xl p-3 space-y-1">
                      <span className="font-bold text-black dark:text-white block">{field.label}</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-rose-500/10 p-2 rounded text-rose-600 dark:text-rose-400 break-all">
                          <span className="block font-semibold text-[10px] opacity-75">Previous:</span> 
                          {String(field.oldVal)}
                        </div>
                        <div className="bg-emerald-500/10 p-2 rounded text-emerald-600 dark:text-emerald-400 break-all whitespace-pre-line">
                          <span className="block font-semibold text-[10px] opacity-75">New:</span> 
                          {String(field.newVal)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-black/10 dark:border-white/10 bg-black/[0.01]">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-black/5 dark:bg-white/15 hover:bg-black/10 text-black dark:text-white rounded-xl font-medium cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting || changedFields.length === 0}
                onClick={handleConfirmSubmit}
                className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Confirm & Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};