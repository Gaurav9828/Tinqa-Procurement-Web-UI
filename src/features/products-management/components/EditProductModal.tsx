import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { ProductResponse, UpdateProductRequest, SpecificationDTO } from '../types/product.types';

interface EditProductModalProps {
  product: ProductResponse | null;
  onClose: () => void;
  onSubmit: (id: number, payload: UpdateProductRequest) => Promise<boolean>;
  isSubmitting: boolean;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  onSubmit,
  isSubmitting,
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
        lastUpdateDescription: product.lastUpdateDescription || '',
        specifications: product.specifications ? [...product.specifications] : [],
      });
    }
  }, [product]);

  if (!product) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(product.id, formData);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-sm font-bold text-black dark:text-white">Edit Product #{product.id}</h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
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

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Last Update Description</label>
            <input
              type="text"
              value={formData.lastUpdateDescription}
              onChange={(e) => setFormData({ ...formData, lastUpdateDescription: e.target.value })}
              className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
            />
          </div>

          {/* 5 Image Path/URL Inputs (Using type="text") */}
          <div className="space-y-2">
            <label className="block font-semibold text-gray-700 dark:text-gray-300">Product Image Paths/URLs (Up to 5)</label>
            <input
              type="text"
              placeholder="Image 1 Path"
              value={formData.image1Url}
              onChange={(e) => setFormData({ ...formData, image1Url: e.target.value })}
              className="w-full px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white"
            />
            <input
              type="text"
              placeholder="Image 2 Path"
              value={formData.image2Url}
              onChange={(e) => setFormData({ ...formData, image2Url: e.target.value })}
              className="w-full px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white"
            />
            <input
              type="text"
              placeholder="Image 3 Path"
              value={formData.image3Url}
              onChange={(e) => setFormData({ ...formData, image3Url: e.target.value })}
              className="w-full px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white"
            />
            <input
              type="text"
              placeholder="Image 4 Path"
              value={formData.image4Url}
              onChange={(e) => setFormData({ ...formData, image4Url: e.target.value })}
              className="w-full px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white"
            />
            <input
              type="text"
              placeholder="Image 5 Path"
              value={formData.image5Url}
              onChange={(e) => setFormData({ ...formData, image5Url: e.target.value })}
              className="w-full px-3 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white"
            />
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

          {/* Enable Status Checkbox */}
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};