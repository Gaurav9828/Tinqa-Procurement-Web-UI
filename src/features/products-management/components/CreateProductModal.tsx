import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { CreateProductRequest, SpecificationDTO } from '../types/product.types';
import { WarrantiesSection, type WarrantiesChange } from './WarrantiesSection';
import { FormFieldErrors } from './FormFieldErrors';
import { dropWarrantyErrors, toWarrantyRequests, validateWarranties, type WarrantyFormItem } from '../utils/warrantyForm';

interface CreateProductModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateProductRequest) => Promise<boolean>;
    /** Backend 400 field errors from the last save (e.g. `warranties[0].title`). */
    serverFieldErrors?: Record<string, string>;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
    isOpen,
    isSubmitting,
    onClose,
    onSubmit,
    serverFieldErrors,
}) => {
    const [title, setTitle] = useState('');
    const [tagline, setTagline] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState<number | ''>('');
    const [discountPercentage, setDiscountPercentage] = useState<number | ''>('');
    const [stockQuantity, setStockQuantity] = useState<number | ''>('');
    const [enabled, setIsEnabled] = useState(true);

    // Dynamic Image URLs (up to 5, starting with 1)
    const [imageUrls, setImageUrls] = useState<string[]>(['']);

    // Dynamic Specifications
    const [specifications, setSpecifications] = useState<SpecificationDTO[]>([
        { specKey: '', specValue: '' },
    ]);

    // Warranties (product-level). Zero is allowed.
    const [warranties, setWarranties] = useState<WarrantyFormItem[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    // Show backend field errors from the latest save inline (state adjusted during render, not in an effect).
    const [shownServerErrors, setShownServerErrors] = useState(serverFieldErrors);
    if (serverFieldErrors !== shownServerErrors) {
        setShownServerErrors(serverFieldErrors);
        setFieldErrors(serverFieldErrors ?? {});
    }

    // Confirmation Preview State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<CreateProductRequest | null>(null);

    if (!isOpen) return null;

    // Required fields check: Title, Price, and Stock Quantity must be provided and valid
    const isFormValid =
        title.trim() !== '' &&
        price !== '' &&
        Number(price) >= 0 &&
        stockQuantity !== '' &&
        Number(stockQuantity) >= 0;

    const handleAddImageUrl = () => {
        if (imageUrls.length < 5) {
            setImageUrls([...imageUrls, '']);
        }
    };

    const handleImageChange = (index: number, value: string) => {
        const updated = [...imageUrls];
        updated[index] = value;
        setImageUrls(updated);
    };

    const handleRemoveImage = (index: number) => {
        const updated = imageUrls.filter((_, i) => i !== index);
        setImageUrls(updated.length > 0 ? updated : ['']);
    };

    const handleAddSpec = () => {
        setSpecifications([...specifications, { specKey: '', specValue: '' }]);
    };

    const handleSpecChange = (index: number, field: 'specKey' | 'specValue', value: string) => {
        const updated = [...specifications];
        updated[index][field] = value;
        setSpecifications(updated);
    };

    const handleRemoveSpec = (index: number) => {
        const updated = specifications.filter((_, i) => i !== index);
        setSpecifications(updated.length > 0 ? updated : [{ specKey: '', specValue: '' }]);
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

        // Filter out empty specifications if any
        const filteredSpecs = specifications.filter(
            (spec) => spec.specKey.trim() !== '' || spec.specValue.trim() !== ''
        );

        const payload: CreateProductRequest = {
            title,
            tagline: tagline || undefined,
            description: description || undefined,
            price: Number(price) || 0,
            discountPercentage: discountPercentage !== '' ? Number(discountPercentage) : undefined,
            stockQuantity: Number(stockQuantity) || 0,
            enabled,
            lastUpdateDescription: undefined,
            image1Url: imageUrls[0] || undefined,
            image2Url: imageUrls[1] || undefined,
            image3Url: imageUrls[2] || undefined,
            image4Url: imageUrls[3] || undefined,
            image5Url: imageUrls[4] || undefined,
            specifications: filteredSpecs.length > 0 ? filteredSpecs : undefined,
            // New product: never send ids.
            warranties: warranties.length > 0 ? toWarrantyRequests(warranties, false) : undefined,
        };

        setPendingPayload(payload);
        setShowPreviewModal(true);
    };

    const handleConfirmSubmit = async () => {
        if (!pendingPayload) return;

        const success = await onSubmit(pendingPayload);
        if (success) {
            // Reset form fields and close modals
            setTitle('');
            setTagline('');
            setDescription('');
            setPrice('');
            setDiscountPercentage('');
            setStockQuantity('');
            setImageUrls(['']);
            setSpecifications([{ specKey: '', specValue: '' }]);
            setWarranties([]);
            setFieldErrors({});
            setShowPreviewModal(false);
            setPendingPayload(null);
            onClose();
        } else {
            // Back to the form so any inline (field) errors are visible.
            setShowPreviewModal(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl text-xs">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
                        <h2 className="text-sm font-bold text-black dark:text-white">Create New Product</h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Modal Form */}
                    <form onSubmit={handleInitialSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Product Title"
                                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Tagline</label>
                                <input
                                    type="text"
                                    value={tagline}
                                    onChange={(e) => setTagline(e.target.value)}
                                    placeholder="Short tagline"
                                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detailed description..."
                                className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Price (₹) *</label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Discount (%)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={discountPercentage}
                                    onChange={(e) => setDiscountPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Qty *</label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Dynamic Image URL Section (Up to 5) */}
                        <div className="space-y-2">
                            <label className="block font-medium text-gray-700 dark:text-gray-300">
                                Product Images (Up to 5)
                            </label>
                            {imageUrls.map((url, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => handleImageChange(index, e.target.value)}
                                        placeholder={`Image Address`}
                                        className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                                    />
                                    {imageUrls.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            className="p-2 text-gray-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                                            title="Remove image"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {imageUrls.length < 5 && (
                                <button
                                    type="button"
                                    onClick={handleAddImageUrl}
                                    className="flex items-center gap-1.5 text-[#0071e3] hover:underline font-medium pt-1 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add more image ({imageUrls.length}/5)
                                </button>
                            )}
                        </div>

                        {/* Dynamic Specifications Section */}
                        <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
                            <label className="block font-medium text-gray-700 dark:text-gray-300">
                                Specifications
                            </label>
                            {specifications.map((spec, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={spec.specKey}
                                        onChange={(e) => handleSpecChange(index, 'specKey', e.target.value)}
                                        placeholder="Spec Key (e.g. Color)"
                                        className="w-1/2 px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={spec.specValue}
                                        onChange={(e) => handleSpecChange(index, 'specValue', e.target.value)}
                                        placeholder="Spec Value (e.g. Midnight Black)"
                                        className="w-1/2 px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSpec(index)}
                                        className="p-2 text-gray-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                                        title="Remove spec"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={handleAddSpec}
                                className="flex items-center gap-1.5 text-[#0071e3] hover:underline font-medium pt-1 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Spec
                            </button>
                        </div>

                        <WarrantiesSection items={warranties} onChange={handleWarrantiesChange} errors={fieldErrors} disabled={isSubmitting} />

                        <FormFieldErrors errors={fieldErrors} />

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isEnabled"
                                checked={enabled}
                                onChange={(e) => setIsEnabled(e.target.checked)}
                                className="rounded border-black/10 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer"
                            />
                            <label htmlFor="isEnabled" className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                Enable product immediately
                            </label>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/10 dark:border-white/10">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl font-medium transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!isFormValid || isSubmitting}
                                className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Product'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Confirmation Preview Modal */}
            {showPreviewModal && pendingPayload && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-xs">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#0071e3]" />
                                <h3 className="text-sm font-bold text-black dark:text-white">Review Product Preview</h3>
                            </div>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-gray-700 dark:text-gray-300">
                            <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Title:</span>
                                <p className="text-black dark:text-white font-medium text-sm">{pendingPayload.title}</p>
                            </div>

                            {pendingPayload.tagline && (
                                <div>
                                    <span className="font-semibold text-gray-500 dark:text-gray-400">Tagline:</span>
                                    <p>{pendingPayload.tagline}</p>
                                </div>
                            )}

                            {pendingPayload.description && (
                                <div>
                                    <span className="font-semibold text-gray-500 dark:text-gray-400">Description:</span>
                                    <p className="whitespace-pre-wrap">{pendingPayload.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl border border-black/5 dark:border-white/5">
                                <div>
                                    <span className="text-gray-400 block">Price</span>
                                    <span className="font-bold text-black dark:text-white text-sm">₹{pendingPayload.price}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">Discount</span>
                                    <span className="font-bold text-black dark:text-white text-sm">{pendingPayload.discountPercentage ?? 0}%</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">Stock Qty</span>
                                    <span className="font-bold text-black dark:text-white text-sm">{pendingPayload.stockQuantity}</span>
                                </div>
                            </div>

                            {/* Image Previews */}
                            <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">Images Provided:</span>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        pendingPayload.image1Url,
                                        pendingPayload.image2Url,
                                        pendingPayload.image3Url,
                                        pendingPayload.image4Url,
                                        pendingPayload.image5Url,
                                    ]
                                        .filter(Boolean)
                                        .map((imgUrl, idx) => (
                                            <div key={idx} className="w-16 h-16 bg-gray-100 dark:bg-neutral-800 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 flex items-center justify-center">
                                                <img src={imgUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
                                            </div>
                                        ))}
                                    {!pendingPayload.image1Url && <span className="text-gray-400 italic">No images added</span>}
                                </div>
                            </div>

                            {/* Specifications Preview */}
                            {pendingPayload.specifications && pendingPayload.specifications.length > 0 && (
                                <div>
                                    <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">Specifications:</span>
                                    <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                                        {pendingPayload.specifications.map((spec, i) => (
                                            <div key={i} className="flex justify-between px-3 py-1.5 border-b last:border-b-0 border-black/5 dark:border-white/5">
                                                <span className="font-medium text-black dark:text-white">{spec.specKey}</span>
                                                <span className="text-gray-500">{spec.specValue}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Warranties Preview */}
                            {pendingPayload.warranties && pendingPayload.warranties.length > 0 && (
                                <div>
                                    <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">Warranties:</span>
                                    <ul className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden" aria-label="Warranties preview">
                                        {pendingPayload.warranties.map((warranty, i) => (
                                            <li key={i} className="flex justify-between gap-2 px-3 py-1.5 border-b last:border-b-0 border-black/5 dark:border-white/5">
                                                <span className="font-medium text-black dark:text-white">{warranty.title}</span>
                                                <span className="text-gray-500 shrink-0">{warranty.isActive ? 'Active' : 'Inactive'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
                            <button
                                type="button"
                                onClick={() => setShowPreviewModal(false)}
                                className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl font-medium transition-colors cursor-pointer"
                            >
                                Back to Edit
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleConfirmSubmit}
                                className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Confirm & Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};