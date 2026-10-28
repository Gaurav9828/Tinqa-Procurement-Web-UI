import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { CreateProductRequest, ProductCategory, ProductResponse, SpecificationDTO } from '../types/product.types';
import { ProductCategoryField } from './ProductCategoryField';
import { findCategory, resolveCategoryName, validateCategoryName } from '../utils/productCategory';
import { ProductWarrantiesEditor } from './ProductWarrantiesEditor';
import { FormFieldErrors } from './FormFieldErrors';
import { toProductWarrantyForms, toProductWarrantyRequests, validateProductWarranties } from '../utils/warrantyForm';
import { useProductWarranties } from '../hooks/useProductWarranties';
import { formatWarrantyDuration, formatWarrantyType, warrantiesComplete } from '../../item-management/utils/itemWarranty';
import { ProductComponentsSection } from './ProductComponentsSection';
import { ComponentsPreview } from './ComponentsPreview';
import { dropComponentErrors, toComponentRequests, toComponentRows, validateComponentRows, type ComponentFormRow } from '../utils/componentForm';
import { componentMaxFor } from '../utils/componentStock';
import { describeGst, emptyTaxForm, toGstFields, toTaxForm, validateTaxForm, type ProductTaxForm } from '../utils/productTax';
import { ProductTaxSection } from './ProductTaxSection';
import { ProductTaxBreakdown } from './ProductTaxBreakdown';
import { ProductAccessorySection } from './ProductAccessorySection';
import {
    describeAccessory,
    dropAccessoryErrors,
    emptyAccessoryForm,
    toAccessoryFields,
    toAccessoryForm,
    validateAccessoryForm,
    type AccessoryForm,
} from '../utils/accessoryForm';
import { useIncomeTaxRate } from '../hooks/useCosting';
import { useEditCosts } from '../hooks/useEditCosts';
import { ProductCostingSection } from './ProductCostingSection';
import { ProfitBreakdown } from './ProfitBreakdown';
import type { ProductCostSummary } from '../types/productApproval.types';
import type { NewProductUnit } from '../../barcodes/types/barcode.types';
import { ProductUnitsInput } from '../../barcodes/components/ProductUnitsInput';
import { resizeUnits, toUnitComponents, unitsProblem } from '../../barcodes/utils/productUnits';
import {
    costPreviewRows,
    costPreviewWarnings,
    dropCostEntryErrors,
    previewCosts,
    toCostEntryRequests,
    toCostSummary,
    validateCostEntries,
    type CostPreview,
} from '../utils/productCosting';
import { NewVersionNote, ProductVersionBadge } from './ProductVersionBadge';

/** A new product always starts with exactly one unit: its components describe what one unit uses. */
const NEW_PRODUCT_STOCK = 1;
const NO_SAVED_COMPONENTS = new Map<number, number>();
const IMAGE_FIELDS = ['image1Url', 'image2Url', 'image3Url', 'image4Url', 'image5Url'] as const;

/** The saved images of a draft, one input each (at least one). */
const draftImages = (draft: ProductResponse | null): string[] => {
    const saved = draft ? IMAGE_FIELDS.map((field) => draft[field] ?? '').filter(Boolean) : [];
    return saved.length > 0 ? saved : [''];
};

/** The form's starting values: empty, or a saved draft's (a draft saved without a price comes back as 0). */
const initialValues = (draft: ProductResponse | null) => ({
    title: draft?.title ?? '',
    category: draft?.category?.name ?? '',
    tagline: draft?.tagline ?? '',
    description: draft?.description ?? '',
    price: draft && draft.price > 0 ? draft.price : ('' as const),
    discountPercentage: draft?.discountPercentage ?? ('' as const),
    tax: draft ? toTaxForm(draft) : emptyTaxForm(),
    accessory: draft ? toAccessoryForm(draft) : emptyAccessoryForm(),
    specifications:
        draft && draft.specifications.length > 0
            ? draft.specifications.map((spec) => ({ specKey: spec.specKey, specValue: spec.specValue }))
            : [{ specKey: '', specValue: '' }],
});

/** Main button and its confirmation: a draft is submitted, a new product created. */
const submitLabels = (isDraft: boolean, isSubmitting: boolean) => {
    if (isSubmitting) return { submit: 'Saving...', confirm: 'Saving...' };
    return isDraft ? { submit: 'Submit for Approval', confirm: 'Confirm & Submit' } : { submit: 'Create Product', confirm: 'Confirm & Create' };
};

/** A draft keeps only what was filled in, so only those GST fields are checked; the rest is asked for on submit. */
const draftTaxErrors = (tax: ProductTaxForm, errors: Record<string, string>): Record<string, string> =>
    Object.fromEntries(Object.entries(errors).filter(([field]) => (field === 'hsnSac' ? tax.hsnSac.trim() : tax.gstRate) !== ''));

interface CreateProductModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    /** `costSummary`: one unit's cost and profit, shown to the approver (only for those who can see costs). */
    onSubmit: (payload: CreateProductRequest, costSummary?: ProductCostSummary) => Promise<boolean>;
    /** Saves the form as a draft (only title and category needed). No "Save as draft" button when absent. */
    onSaveDraft?: (payload: CreateProductRequest) => Promise<boolean>;
    /** A saved draft to finish: the form opens filled with it, and submitting it builds its first unit. */
    draft?: ProductResponse | null;
    /** Backend 400 field errors from the last save (e.g. `warranties[0].title`). */
    serverFieldErrors?: Record<string, string>;
    /** Every product, to pick the parents of an accessory from. */
    products?: ProductResponse[];
    /** Existing categories to pick from; a new name creates one. */
    categories?: readonly ProductCategory[];
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
    isOpen,
    isSubmitting,
    onClose,
    onSubmit,
    serverFieldErrors,
    products = [],
    categories = [],
    onSaveDraft,
    draft = null,
}) => {
    // A draft fills the form once, when it opens (the page mounts one form per draft)
    const [initial] = useState(() => initialValues(draft));
    const [title, setTitle] = useState(initial.title);
    const [category, setCategory] = useState(initial.category);
    // Shown once the field was left or a save was tried, not while the user is still on their way to it
    const [categoryTouched, setCategoryTouched] = useState(false);
    const [tagline, setTagline] = useState(initial.tagline);
    const [description, setDescription] = useState(initial.description);
    const [price, setPrice] = useState<number | ''>(initial.price);
    const [discountPercentage, setDiscountPercentage] = useState<number | ''>(initial.discountPercentage);
    // GST included in the price: which taxes apply and their rates
    const [tax, setTax] = useState<ProductTaxForm>(initial.tax);
    const [accessory, setAccessory] = useState<AccessoryForm>(initial.accessory);

    // Dynamic Image URLs (up to 5, starting with 1)
    const [imageUrls, setImageUrls] = useState<string[]>(() => draftImages(draft));

    // Dynamic Specifications
    const [specifications, setSpecifications] = useState<SpecificationDTO[]>(initial.specifications);

    // Components (items) with their auto-added item warranties. Zero is allowed.
    const [components, setComponents] = useState<ComponentFormRow[]>(() => toComponentRows(draft?.components));
    // The first unit's barcode and its pieces' barcodes, one per piece of each component
    const [units, setUnits] = useState<NewProductUnit[]>([]);

    // Extra costs of one unit (manpower, software...): seen with PRODUCT_COST_VIEW, entered with PRODUCT_COST_EDIT.
    // A draft's saved cost sheet is loaded and filled in when it arrives.
    const { canSeeCosts, canEditCosts, savedSheet, costRows, setCostRows } = useEditCosts(draft, setComponents);
    const incomeTaxRate = useIncomeTaxRate(isOpen);
    // A new form has nothing saved; a draft's costs are sent once its saved ones are known (so they're never wiped)
    const costsKnown = !draft || !!savedSheet;

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    // Warranties (product-level), including copies of the selected items' warranties. Zero is allowed.
    const { warranties, onChange: handleWarrantiesChange, reset: resetWarranties } = useProductWarranties(components, setFieldErrors);
    // A draft's saved warranties (state adjusted during render, not in an effect)
    const [warrantiesLoaded, setWarrantiesLoaded] = useState(!draft);
    if (!warrantiesLoaded && draft) {
        setWarrantiesLoaded(true);
        resetWarranties(toProductWarrantyForms(draft.warranties));
    }
    // Show backend field errors from the latest save inline (state adjusted during render, not in an effect).
    const [shownServerErrors, setShownServerErrors] = useState(serverFieldErrors);
    if (serverFieldErrors !== shownServerErrors) {
        setShownServerErrors(serverFieldErrors);
        setFieldErrors(serverFieldErrors ?? {});
    }

    // Confirmation Preview State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<CreateProductRequest | null>(null);
    const [pendingCosts, setPendingCosts] = useState<CostPreview | null>(null);

    if (!isOpen) return null;

    const taxErrors = validateTaxForm(tax);
    const labels = submitLabels(!!draft, isSubmitting);
    const categoryError = validateCategoryName(category);
    const unitComponents = toUnitComponents(components);
    const shownUnits = resizeUnits(units, NEW_PRODUCT_STOCK, unitComponents);
    const unitsError = unitsProblem(shownUnits, NEW_PRODUCT_STOCK, unitComponents);
    const costPreview = previewCosts({
        price,
        discountPercentage,
        gstRate: tax.gstRate,
        components: components.map((row) => ({ quantity: row.quantity, unitCost: row.unitCost })),
        extraCosts: costRows.map((row) => row.amount),
        incomeTaxRate: incomeTaxRate ?? 0,
    });

    // Required fields check: Title and Price must be provided and valid (stock is fixed at 1 on creation)
    const isFormValid =
        title.trim() !== '' &&
        categoryError === null &&
        price !== '' &&
        Number(price) >= 0 &&
        components.every((row) => row.itemId !== null && !!row.quantity.trim()) &&
        warrantiesComplete(warranties) &&
        unitsError === null &&
        Object.keys(taxErrors).length === 0;

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

    // A draft needs only a title and a category; whatever else is filled in must be valid
    const draftTaxProblems = draftTaxErrors(tax, taxErrors);
    const canSaveDraft = !!onSaveDraft && title.trim() !== '' && categoryError === null && Object.keys(draftTaxProblems).length === 0;

    /** The form as a request. A draft leaves out what isn't filled in yet and sends no unit barcodes. */
    const buildPayload = (asDraft: boolean): CreateProductRequest => {
        // Filter out empty specifications if any
        const filteredSpecs = specifications.filter(
            (spec) => spec.specKey.trim() !== '' || spec.specValue.trim() !== ''
        );
        // An existing draft is replaced as a whole (empty lists clear what was saved); a new product sends only what it has
        const replaceAll = !!draft;
        return {
            title,
            categoryName: resolveCategoryName(categories, category),
            tagline: tagline || undefined,
            description: description || undefined,
            ...(asDraft && price === '' ? {} : { price: Number(price) || 0 }),
            discountPercentage: discountPercentage !== '' ? Number(discountPercentage) : undefined,
            ...toGstFields(tax),
            stockQuantity: asDraft ? 0 : NEW_PRODUCT_STOCK,
            // Always inactive: activation happens when Admin L2 approves the product.
            enabled: false,
            lastUpdateDescription: undefined,
            image1Url: imageUrls[0] || undefined,
            image2Url: imageUrls[1] || undefined,
            image3Url: imageUrls[2] || undefined,
            image4Url: imageUrls[3] || undefined,
            image5Url: imageUrls[4] || undefined,
            specifications: filteredSpecs.length > 0 || replaceAll ? filteredSpecs : undefined,
            // Includes the warranties copied from the selected items. A new product never sends ids; a draft keeps its saved ones.
            warranties: warranties.length > 0 || replaceAll ? toProductWarrantyRequests(warranties, replaceAll) : undefined,
            components: components.length > 0 || replaceAll ? toComponentRequests(components, canEditCosts) : undefined,
            ...(canEditCosts && costsKnown && (costRows.length > 0 || replaceAll) ? { costEntries: toCostEntryRequests(costRows) } : {}),
            ...toAccessoryFields(accessory),
            ...(asDraft ? {} : { newUnits: shownUnits }),
        };
    };

    const handleSaveDraft = async () => {
        setCategoryTouched(true);
        if (!onSaveDraft || !canSaveDraft || isSubmitting) return;
        // Item stock is checked when the draft is submitted, not now: nothing is taken from it yet
        const clientErrors = {
            ...validateComponentRows(components),
            ...validateProductWarranties(warranties),
            ...validateAccessoryForm(accessory),
            ...(canEditCosts ? validateCostEntries(costRows) : {}),
        };
        setFieldErrors(clientErrors);
        if (Object.keys(clientErrors).length > 0) return;
        if (await onSaveDraft(buildPayload(true))) {
            resetForm();
            onClose();
        }
    };

    const handleInitialSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        const clientErrors = {
            ...validateComponentRows(components, componentMaxFor(NEW_PRODUCT_STOCK, NO_SAVED_COMPONENTS)),
            ...validateProductWarranties(warranties),
            ...validateAccessoryForm(accessory),
            ...(canEditCosts ? validateCostEntries(costRows) : {}),
        };
        setFieldErrors(clientErrors);
        if (Object.keys(clientErrors).length > 0) return;

        setPendingPayload(buildPayload(false));
        setPendingCosts(canSeeCosts ? costPreview : null);
        setShowPreviewModal(true);
    };

    const resetForm = () => {
        setTitle('');
        setCategory('');
        setCategoryTouched(false);
        setTagline('');
        setDescription('');
        setPrice('');
        setDiscountPercentage('');
        setTax(emptyTaxForm());
        setAccessory(emptyAccessoryForm());
        setImageUrls(['']);
        setSpecifications([{ specKey: '', specValue: '' }]);
        resetWarranties([]);
        setComponents([]);
        setUnits([]);
        setCostRows([]);
        setPendingCosts(null);
        setFieldErrors({});
        setShowPreviewModal(false);
        setPendingPayload(null);
    };

    const handleConfirmSubmit = async () => {
        if (!pendingPayload) return;

        // The approver sees one unit's cost and profit once any cost has been entered
        const costSummary = pendingCosts ? toCostSummary(pendingCosts) : undefined;
        const success = await (costSummary ? onSubmit(pendingPayload, costSummary) : onSubmit(pendingPayload));
        if (success) {
            resetForm();
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
                        <h2 className="text-sm font-bold text-black dark:text-white">
                            {draft ? `Finish Draft #${draft.id}` : 'Create New Product'}
                            <ProductVersionBadge product={draft} />
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Modal Form */}
                    <form onSubmit={handleInitialSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <NewVersionNote product={draft} />
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

                        <div onBlur={() => setCategoryTouched(true)}>
                            <ProductCategoryField
                                value={category}
                                onChange={setCategory}
                                categories={categories}
                                error={categoryTouched || fieldErrors.categoryName ? (fieldErrors.categoryName ?? categoryError) : null}
                                disabled={isSubmitting}
                            />
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
                                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Price incl. GST (₹) *</label>
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
                                <span className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Qty</span>
                                <p
                                    data-testid="new-product-stock"
                                    className="w-full px-3 py-2 bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300"
                                >
                                    1
                                </p>
                                <p className="mt-1 text-[10px] text-gray-400">
                                    New products start with 1 unit, built when you submit (a draft holds none). Use Add stock later.
                                </p>
                            </div>
                        </div>

                        <ProductTaxSection
                            value={tax}
                            onChange={setTax}
                            price={price}
                            discountPercentage={discountPercentage}
                            errors={taxErrors}
                            disabled={isSubmitting}
                        />

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
                                            className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 rounded-xl transition-colors cursor-pointer"
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
                                        className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 rounded-xl transition-colors cursor-pointer"
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

                        <ProductComponentsSection
                            productStock={NEW_PRODUCT_STOCK}
                            rows={components}
                            setRows={setComponents}
                            errors={fieldErrors}
                            onClearErrors={(keys) => setFieldErrors((prev) => dropComponentErrors(prev, keys))}
                            disabled={isSubmitting}
                        />

                        <section aria-label="Unit barcodes" className="space-y-2">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Barcodes</h3>
                            <ProductUnitsInput
                                id="new-product"
                                units={shownUnits}
                                onChange={setUnits}
                                components={unitComponents}
                                disabled={isSubmitting}
                            />
                        </section>

                        {canSeeCosts && (
                            <ProductCostingSection
                                rows={costRows}
                                setRows={setCostRows}
                                errors={fieldErrors}
                                onClearErrors={() => setFieldErrors((prev) => dropCostEntryErrors(prev))}
                                preview={costPreview}
                                incomeTaxRate={incomeTaxRate}
                                disabled={isSubmitting}
                            />
                        )}

                        <ProductWarrantiesEditor items={warranties} onChange={handleWarrantiesChange} errors={fieldErrors} disabled={isSubmitting} />

                        <ProductAccessorySection
                            value={accessory}
                            onChange={setAccessory}
                            products={products}
                            price={price}
                            discountPercentage={discountPercentage}
                            errors={fieldErrors}
                            onClearErrors={() => setFieldErrors((prev) => dropAccessoryErrors(prev))}
                            disabled={isSubmitting}
                        />

                        <FormFieldErrors errors={fieldErrors} />

                        <p role="note" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                            New products are created <strong>inactive</strong> and sent for approval. The product
                            goes live once a catalog approver approves it.
                            {onSaveDraft && (
                                <>
                                    {' '}Not finished yet? <strong>Save as draft</strong> needs only the title and category: nothing is
                                    taken from item stock and nothing is sent for approval until you submit it.
                                </>
                            )}
                        </p>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/10 dark:border-white/10">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl font-medium transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            {onSaveDraft && (
                                <button
                                    type="button"
                                    onClick={() => void handleSaveDraft()}
                                    disabled={!canSaveDraft || isSubmitting}
                                    title={canSaveDraft ? 'Save what you have and finish it later' : 'Enter a title and a category to save a draft'}
                                    className="px-4 py-2 border border-[#0071e3]/40 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {draft ? 'Save Draft' : 'Save as Draft'}
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={!isFormValid || isSubmitting}
                                className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {labels.submit}
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

                            <div data-testid="preview-category">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Category:</span>
                                <p className="text-black dark:text-white">
                                    {pendingPayload.categoryName}
                                    {pendingPayload.categoryName && !findCategory(categories, pendingPayload.categoryName) && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] text-[10px] font-medium">New category</span>
                                    )}
                                </p>
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
                                    <span className="text-gray-400 block">Price (incl. GST)</span>
                                    <span className="font-bold text-black dark:text-white text-sm">₹{pendingPayload.price ?? 0}</span>
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

                            <div className="space-y-1">
                                <span className="font-semibold text-gray-500 dark:text-gray-400 block">GST:</span>
                                <p className="text-black dark:text-white font-medium" data-testid="preview-gst">{describeGst(pendingPayload)}</p>
                                <ProductTaxBreakdown
                                    price={pendingPayload.price}
                                    discountPercentage={pendingPayload.discountPercentage}
                                    gst={pendingPayload}
                                    title="What the invoice will show per unit"
                                />
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

                            {pendingCosts && (
                                <div data-testid="preview-costing" className="space-y-1">
                                    {(pendingPayload.costEntries ?? []).length > 0 && (
                                        <ul className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden" aria-label="Extra costs preview">
                                            {(pendingPayload.costEntries ?? []).map((entry, i) => (
                                                <li key={i} className="px-3 py-1.5 border-b last:border-b-0 border-black/5 dark:border-white/5">
                                                    <span className="flex justify-between gap-2">
                                                        <span className="font-medium text-black dark:text-white">{entry.label}</span>
                                                        <span className="tabular-nums">₹{entry.amount.toFixed(2)}</span>
                                                    </span>
                                                    {entry.description && <span className="block text-gray-500 whitespace-pre-wrap">{entry.description}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <ProfitBreakdown
                                        title="What one unit earns"
                                        rows={costPreviewRows(pendingCosts)}
                                        profit={pendingCosts.profit}
                                        incomeTaxRate={incomeTaxRate}
                                        warnings={costPreviewWarnings(pendingCosts)}
                                    />
                                </div>
                            )}

                            {/* Components + their item warranties */}
                            {pendingPayload.components && pendingPayload.components.length > 0 && (
                                <ComponentsPreview components={pendingPayload.components} />
                            )}

                            {pendingPayload.newUnits?.map((unit) => (
                                <div key={unit.barcode} data-testid="preview-unit-barcodes">
                                    <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">Unit barcode:</span>
                                    <p className="font-mono text-black dark:text-white">{unit.barcode}</p>
                                    {unit.parts.length > 0 && (
                                        <p className="text-gray-500 font-mono break-all">
                                            {unit.parts.flatMap((part) => part.barcodes).join(', ')}
                                        </p>
                                    )}
                                </div>
                            ))}

                            {pendingPayload.accessory && (
                                <div data-testid="preview-accessory">
                                    <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">Accessory:</span>
                                    <p className="text-black dark:text-white">
                                        {describeAccessory(
                                            accessory.parents.map((row) => ({ productId: row.productId, title: row.title, bundleDiscountPercentage: Number(row.discount) || 0 })),
                                            true
                                        )}
                                    </p>
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
                                                <span className="text-gray-500 shrink-0">
                                                    {formatWarrantyType(warranty.warrantyType)} · {formatWarrantyDuration(warranty.durationValue, warranty.durationUnit)} ·{' '}
                                                    {warranty.isActive ? 'Active' : 'Inactive'}
                                                </span>
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
                                {labels.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};