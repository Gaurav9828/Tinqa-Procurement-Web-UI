import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, CheckCircle2, HelpCircle, ArrowLeft } from 'lucide-react';
import { CommonInput } from '../../../components/ui/FormInputs';
import { UnitOfMeasureInput } from './UnitOfMeasureInput';
import type {
  CategoryResponse,
  CreateItemRequest,
  ItemResponse,
  UpdateItemRequest,
} from '../types/item.types';

interface Props {
  isOpen: boolean;
  isSubmitting: boolean;
  apiError?: string | null;
  categories: CategoryResponse[];
  items?: ItemResponse[];
  initialData?: ItemResponse | null;
  onClose: () => void;
  onSubmit: (data: CreateItemRequest | UpdateItemRequest) => Promise<boolean>;
}

export const ItemFormModal: React.FC<Props> = ({
  isOpen,
  isSubmitting,
  apiError,
  categories,
  items = [],
  initialData,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('PCS');
  const [mrp, setMrp] = useState<string>('');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [isCustomBrand, setIsCustomBrand] = useState(false);

  // State to handle confirmation step before executing API call
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setBrand(initialData.brand || '');
      setSku(initialData.sku || '');
      setDescription(initialData.description || '');
      setCategoryId(initialData.categoryId || '');
      setUnitOfMeasure(initialData.unitOfMeasure || 'PCS');
      setMrp(
        initialData.mrp !== undefined && initialData.mrp !== null
          ? String(initialData.mrp)
          : ''
      );
      setActive(initialData.isActive ?? true);
      setIsCustomBrand(false);
    } else {
      setName('');
      setBrand('');
      setSku('');
      setDescription('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setUnitOfMeasure('PCS');
      setMrp('');
      setActive(true);
      setIsCustomBrand(false);
    }
    setErrors([]);
    setIsConfirming(false);
  }, [initialData, isOpen, categories]);

  const matchingBrands = useMemo(() => {
    if (!name.trim()) return [];
    const normalizedName = name.trim().toLowerCase();

    const brandSet = new Set<string>();
    items.forEach((item) => {
      if (item.name.trim().toLowerCase() === normalizedName && item.brand) {
        brandSet.add(item.brand.trim());
      }
    });

    return Array.from(brandSet);
  }, [name, items]);

  const selectedCategoryName = useMemo(() => {
    const cat = categories.find((c) => c.id === Number(categoryId));
    return cat ? cat.name : `Category #${categoryId}`;
  }, [categories, categoryId]);

  const isValid = useMemo(() => {
    const hasName = name.trim().length > 0;
    const hasCategory = categoryId !== '';
    const hasSku = initialData ? true : sku.trim().length > 0;
    const hasUom = unitOfMeasure.trim().length > 0;
    const numericMrp = Number(mrp);
    const hasValidMrp =
      mrp.trim().length > 0 && !isNaN(numericMrp) && numericMrp > 0;

    return hasName && hasCategory && hasSku && hasUom && hasValidMrp;
  }, [name, categoryId, sku, unitOfMeasure, mrp, initialData]);

  const isDirty = useMemo(() => {
    if (!initialData) return true;

    const initialMrp =
      initialData.mrp !== undefined && initialData.mrp !== null
        ? String(initialData.mrp)
        : '';

    return (
      name.trim() !== (initialData.name || '') ||
      brand.trim() !== (initialData.brand || '') ||
      sku.trim() !== (initialData.sku || '') ||
      description.trim() !== (initialData.description || '') ||
      Number(categoryId) !== initialData.categoryId ||
      unitOfMeasure.trim() !== (initialData.unitOfMeasure || 'PCS') ||
      mrp !== initialMrp ||
      active !== (initialData.isActive ?? true)
    );
  }, [
    initialData,
    name,
    brand,
    sku,
    description,
    categoryId,
    unitOfMeasure,
    mrp,
    active,
  ]);

  if (!isOpen) return null;

  // Form submission triggers confirmation step first
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    if (!isValid || !isDirty) return;
    setIsConfirming(true);
  };

  // Confirmed submission executes the actual API call
  const handleFinalSubmit = async () => {
    const payload: CreateItemRequest | UpdateItemRequest = initialData
      ? {
          name: name.trim(),
          brand: brand.trim() || undefined,
          categoryId: Number(categoryId),
          unitOfMeasure: unitOfMeasure.trim().toUpperCase(),
          mrp: Number(mrp),
          description: description.trim() || undefined,
          isActive: active,
        }
      : {
          name: name.trim(),
          brand: brand.trim() || undefined,
          sku: sku.trim(),
          categoryId: Number(categoryId),
          unitOfMeasure: unitOfMeasure.trim().toUpperCase(),
          mrp: Number(mrp),
          description: description.trim() || undefined,
        };

    const ok = await onSubmit(payload);
    if (ok) {
      onClose(); // Auto close modal after successful API call
    } else {
      setIsConfirming(false); // Return to editing form if API call fails
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
          <h3 className="font-bold text-base text-black dark:text-white flex items-center gap-2">
            {isConfirming ? (
              <>
                <HelpCircle className="w-5 h-5 text-[#0071e3]" /> Confirm Item Details
              </>
            ) : initialData ? (
              'Edit Item'
            ) : (
              'Create New Item'
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Error display */}
        {apiError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Validation Errors display */}
        {errors.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Validation Errors:</span>
            </div>
            <ul className="list-disc list-inside pl-1 space-y-0.5">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* STEP 2: Confirmation View */}
        {isConfirming ? (
          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-600 dark:text-neutral-400">
              Please review the details below before submitting to the catalog:
            </p>

            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span className="text-gray-500">Item Name:</span>
                <span className="font-semibold text-black dark:text-white">{name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span className="text-gray-500">Brand:</span>
                <span className="font-semibold text-black dark:text-white">{brand || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span className="text-gray-500">SKU:</span>
                <span className="font-mono font-semibold text-[#0071e3]">{sku}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span className="text-gray-500">Category:</span>
                <span className="font-semibold text-black dark:text-white">{selectedCategoryName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/5 dark:border-white/5">
                <span className="text-gray-500">MRP:</span>
                <span className="font-semibold text-black dark:text-white">
                  ₹{Number(mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Unit of Measure:</span>
                <span className="font-semibold text-black dark:text-white">{unitOfMeasure.toUpperCase()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-opacity"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {initialData ? 'Confirm & Update' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1: Form View */
          <form onSubmit={handlePreSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CommonInput
                label="Item Name"
                name="name"
                required
                placeholder="e.g. ESP32 Board"
                value={name}
                onChange={(e) => {
                  setErrors([]);
                  setName(e.target.value);
                }}
              />

              <CommonInput
                label="SKU"
                name="sku"
                required={!initialData}
                disabled={!!initialData}
                placeholder="e.g. 1165429"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300">
                  Brand Name
                </label>
                {matchingBrands.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomBrand(!isCustomBrand);
                      setBrand('');
                    }}
                    className="text-[11px] text-[#0071e3] hover:underline font-medium cursor-pointer"
                  >
                    {isCustomBrand ? 'Select Existing Brand' : '+ Add New Brand'}
                  </button>
                )}
              </div>

              {matchingBrands.length > 0 && !isCustomBrand ? (
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:border-[#0071e3] transition-colors appearance-none cursor-pointer text-black dark:text-white"
                >
                  <option value="">-- Select Existing Brand --</option>
                  {matchingBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : (
                <CommonInput
                  label=""
                  name="brand"
                  placeholder="e.g. Nvidia, Espressif..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:border-[#0071e3] transition-colors appearance-none cursor-pointer text-black dark:text-white"
                >
                  <option value="" disabled>
                    Select Category
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <CommonInput
                label="MRP (₹)"
                name="mrp"
                type="number"
                required
                placeholder="0.00"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
              />
            </div>

            <UnitOfMeasureInput
              value={unitOfMeasure}
              onChange={(selectedUnit) => setUnitOfMeasure(selectedUnit)}
            />

            {initialData && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activeStatus"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0071e3] focus:ring-[#0071e3]"
                />
                <label
                  htmlFor="activeStatus"
                  className="text-xs font-semibold text-gray-700 dark:text-neutral-300 cursor-pointer"
                >
                  Active Status
                </label>
              </div>
            )}

            <CommonInput
              label="Description"
              name="description"
              placeholder="Item specification details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isValid || !isDirty}
                className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {initialData ? 'Proceed to Update' : 'Proceed to Create'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};