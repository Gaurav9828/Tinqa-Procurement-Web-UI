import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import type { CreateProductRequest, ProductCategory, ProductResponse, SpecificationDTO } from '../types/product.types';
import { ProductCategoryField } from './ProductCategoryField';
import { findCategory, resolveCategoryName, validateCategoryName } from '../utils/productCategory';
import { ProductWarrantiesEditor } from './ProductWarrantiesEditor';
import { ProductFormLayout, ProductSpecsEditor } from './ProductFormLayout';
import { tabPanelProps } from '../utils/productFormLayout';
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
import { ModelLinePreview, NewVersionNote, ProductModelField, ProductVersionBadge } from './ProductVersionBadge';
import { ProductSoftwareField } from './ProductSoftwareField';
import { dropSoftwareErrors, softwareLine, toSoftwareFields, toSoftwareForm, validateSoftware, type SoftwareForm } from '../utils/productSoftware';
import { ProductTitleField } from './ProductTitleField';
import { ProductDescriptionEditor } from './ProductDescriptionEditor';
import { ProductDescriptionView } from './ProductDescriptionView';
import { dropModelNameError, modelLine, modelNameError, versionHintFor, versionLabel, versionNumberFor } from '../utils/productVersion';
import { CREATE_PRODUCT_TABS, firstTabWithError, tabStatus, tabsWithErrors, type CreateProductTab } from '../utils/createProductTabs';
import { ProductImageSlots } from './ProductImageSlots';
import { useFoundImages } from '../hooks/useFoundImages';
import {
    dropImageErrors,
    imageBaseOf,
    imagesComplete,
    rememberImageBase,
    resolveImages,
    toImageEntries,
    toImageFields,
    validateImages,
    type ImageEntry,
} from '../utils/productImages';

/** A new product always starts with exactly one unit: its components describe what one unit uses. */
const NEW_PRODUCT_STOCK = 1;
const NO_SAVED_COMPONENTS = new Map<number, number>();

/**
 * The form's starting values: empty, a saved draft's (a draft saved without a price comes back as 0), or those of the
 * version adapted from, except its model name (each version has its own).
 */
const initialValues = (draft: ProductResponse | null, isDraft: boolean) => ({
    title: draft?.title ?? '',
    modelName: isDraft ? (draft?.modelName ?? '') : '',
    category: draft?.category?.name ?? '',
    tagline: draft?.tagline ?? '',
    software: toSoftwareForm(draft),
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

/**
 * The model name (left out while empty: a draft may wait for it, and a saved draft keeps the one it has) and the
 * version adapted from.
 */
const modelFields = (modelName: string, template: ProductResponse | null): Pick<CreateProductRequest, 'modelName' | 'parentProductId'> => ({
    ...(modelName.trim() ? { modelName: modelName.trim() } : {}),
    ...(template ? { parentProductId: template.id } : {}),
});

/** Main button and its confirmation: a draft is submitted, a new product created. */
const submitLabels = (isDraft: boolean, isSubmitting: boolean) => {
    if (isSubmitting) return { submit: 'Saving...', confirm: 'Saving...' };
    return isDraft ? { submit: 'Submit for Approval', confirm: 'Confirm & Submit' } : { submit: 'Create Product', confirm: 'Confirm & Create' };
};

/** A draft keeps only what was filled in, so only those GST fields are checked; the rest is asked for on submit. */
const draftTaxErrors = (tax: ProductTaxForm, errors: Record<string, string>): Record<string, string> =>
    Object.fromEntries(Object.entries(errors).filter(([field]) => (field === 'hsnSac' ? tax.hsnSac.trim() : tax.gstRate) !== ''));

/**
 * Whether each tab holding required fields has them all, before the product can be created or submitted (tabs with
 * nothing required are absent).
 */
const completeTabs = (form: {
    title: string;
    modelError: string | null;
    categoryError: string | null;
    softwareErrors: Record<string, string>;
    price: number | '';
    taxErrors: Record<string, string>;
    components: ComponentFormRow[];
    unitsError: string | null;
    warranties: Parameters<typeof warrantiesComplete>[0];
    images: readonly ImageEntry[];
}): Partial<Record<CreateProductTab, boolean>> => ({
    basics: form.title.trim() !== '' && form.modelError === null && form.categoryError === null && Object.keys(form.softwareErrors).length === 0,
    pricing: form.price !== '' && Number(form.price) >= 0 && Object.keys(form.taxErrors).length === 0,
    media: imagesComplete(form.images),
    components: form.components.every((row) => row.itemId !== null && !!row.quantity.trim()) && form.unitsError === null,
    warranties: warrantiesComplete(form.warranties),
});

interface CreateProductFormProps extends CreateProductModalProps {
    /** The version adapted from: every value is copied in, and it is sent as the new product's parent. */
    template: ProductResponse | null;
    /** Starts the form again from a version picked in the title (new products only), or empty with null. */
    onAdapt: (product: ProductResponse | null) => void;
}

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

/**
 * The create form (or a draft's). Adapting from a version picked in the title starts the form again, filled with that
 * version's values (taken from the product list the page already has, so it costs no request).
 */
export const CreateProductModal: React.FC<CreateProductModalProps> = (props) => {
    const [template, setTemplate] = useState<ProductResponse | null>(null);
    if (!props.isOpen) return null;
    const close = () => {
        setTemplate(null);
        props.onClose();
    };
    return <CreateProductForm key={template?.id ?? 'blank'} {...props} onClose={close} template={props.draft ? null : template} onAdapt={setTemplate} />;
};

const CreateProductForm: React.FC<CreateProductFormProps> = ({
    isOpen,
    isSubmitting,
    onClose,
    onSubmit,
    serverFieldErrors,
    products = [],
    categories = [],
    onSaveDraft,
    draft = null,
    template,
    onAdapt,
}) => {
    // What fills the form: a saved draft, or the version adapted from. Read once, when it mounts (the page mounts one
    // form per draft; adapting from another version mounts a new one)
    const source = draft ?? template;
    const [initial] = useState(() => initialValues(source, !!draft));
    const [title, setTitle] = useState(initial.title);
    // Each version has its own; required to create or submit, a draft may wait for it
    const [modelName, setModelName] = useState(initial.modelName);
    const [category, setCategory] = useState(initial.category);
    // Shown once the field was left or a save was tried, not while the user is still on their way to it
    const [categoryTouched, setCategoryTouched] = useState(false);
    const [tagline, setTagline] = useState(initial.tagline);
    // Optional software and its version (both or neither), shown to customers with the specifications
    const [software, setSoftware] = useState<SoftwareForm>(initial.software);
    const [description, setDescription] = useState(initial.description);
    const [price, setPrice] = useState<number | ''>(initial.price);
    const [discountPercentage, setDiscountPercentage] = useState<number | ''>(initial.discountPercentage);
    // GST included in the price: which taxes apply and their rates
    const [tax, setTax] = useState<ProductTaxForm>(initial.tax);
    const [accessory, setAccessory] = useState<AccessoryForm>(initial.accessory);

    // The five standard views (front, side, back, close-up, in use), each with what it shows
    const [images, setImages] = useState<ImageEntry[]>(() => toImageEntries(source));
    // The folder the images are in; their names come from the product name and version
    const [imageBase, setImageBase] = useState(() => imageBaseOf(source));

    // Dynamic Specifications
    const [specifications, setSpecifications] = useState<SpecificationDTO[]>(initial.specifications);

    // Components (items) with their auto-added item warranties. Zero is allowed.
    const [components, setComponents] = useState<ComponentFormRow[]>(() => toComponentRows(source?.components));
    // The first unit's barcode and its pieces' barcodes, one per piece of each component
    const [units, setUnits] = useState<NewProductUnit[]>([]);

    // Extra costs of one unit (manpower, software...): seen with PRODUCT_COST_VIEW, entered with PRODUCT_COST_EDIT.
    // A draft's (or the adapted version's) saved cost sheet is loaded and filled in when it arrives.
    const { canSeeCosts, canEditCosts, savedSheet, costRows, setCostRows } = useEditCosts(source, setComponents);
    const incomeTaxRate = useIncomeTaxRate(isOpen);
    // A new form has nothing saved; a draft's costs are sent once its saved ones are known (so they're never wiped)
    const costsKnown = !draft || !!savedSheet;

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    // The part of the form shown; the others stay mounted (hidden), so nothing typed in them is lost
    const [activeTab, setActiveTab] = useState<CreateProductTab>('basics');
    // Warranties (product-level), including copies of the selected items' warranties. Zero is allowed.
    const { warranties, onChange: handleWarrantiesChange, reset: resetWarranties } = useProductWarranties(components, setFieldErrors);
    // A draft's (or the adapted version's) saved warranties (state adjusted during render, not in an effect). A new
    // product sends them without ids, so they are copies
    const [warrantiesLoaded, setWarrantiesLoaded] = useState(!source);
    if (!warrantiesLoaded && source) {
        setWarrantiesLoaded(true);
        resetWarranties(toProductWarrantyForms(source.warranties));
    }
    // Show backend field errors from the latest save inline (state adjusted during render, not in an effect).
    const [shownServerErrors, setShownServerErrors] = useState(serverFieldErrors);
    if (serverFieldErrors !== shownServerErrors) {
        setShownServerErrors(serverFieldErrors);
        setFieldErrors(serverFieldErrors ?? {});
        setActiveTab((tab) => firstTabWithError(serverFieldErrors ?? {}) ?? tab);
    }

    // Confirmation Preview State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<CreateProductRequest | null>(null);
    const [pendingCosts, setPendingCosts] = useState<CostPreview | null>(null);

    // A draft already has its version, unless it is renamed
    const versionNumber = versionNumberFor(title, products, draft);
    // Each image is looked for in the folder under the name made from the product name and this version
    const imageNaming = { base: imageBase, title, versionNumber };
    const imageLookups = useFoundImages(imageNaming, toImageEntries(source), isOpen);

    if (!isOpen) return null;
    const modelError = modelNameError(modelName, products, true, draft?.id);
    const namedImages = resolveImages(images, imageLookups);
    // "Required" waits for a save attempt; a taken name shows at once
    const shownModelError = fieldErrors.modelName ?? (modelName.trim() ? modelError : null);
    const taxErrors = validateTaxForm(tax);
    const labels = submitLabels(!!draft, isSubmitting);
    const categoryError = validateCategoryName(category);
    const softwareErrors = validateSoftware(software);
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

    // Stock is fixed at 1 on creation
    const tabComplete = completeTabs({ title, modelError, categoryError, softwareErrors, price, taxErrors, components, unitsError, warranties, images: namedImages });
    const isFormValid = Object.values(tabComplete).every(Boolean);
    const errorTabs = tabsWithErrors(fieldErrors, !!shownModelError || (categoryTouched && !!categoryError));
    const tabs = CREATE_PRODUCT_TABS.filter((tab) => tab.id !== 'costing' || canSeeCosts);
    const missingTabs = tabs.filter((tab) => tabComplete[tab.id] === false).map((tab) => tab.label);
    /** After a failed check, shows the first part with an error. */
    const showErrors = (errors: Record<string, string>) => {
        setFieldErrors(errors);
        setActiveTab((tab) => firstTabWithError(errors) ?? tab);
    };

    const handleImagesChange = (next: ImageEntry[]) => {
        setImages(next);
        setFieldErrors(dropImageErrors);
    };

    const handleImageBaseChange = (base: string) => {
        setImageBase(base);
        rememberImageBase(base);
        setFieldErrors(dropImageErrors);
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
    const canSaveDraft =
        !!onSaveDraft &&
        title.trim() !== '' &&
        categoryError === null &&
        modelNameError(modelName, products, false, draft?.id) === null &&
        Object.keys(softwareErrors).length === 0 &&
        Object.keys(draftTaxProblems).length === 0;

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
            ...modelFields(modelName, template),
            categoryName: resolveCategoryName(categories, category),
            tagline: tagline || undefined,
            // A saved draft is replaced as a whole, so emptied software is cleared
            ...toSoftwareFields(software, replaceAll),
            description: description || undefined,
            ...(asDraft && price === '' ? {} : { price: Number(price) || 0 }),
            discountPercentage: discountPercentage !== '' ? Number(discountPercentage) : undefined,
            ...toGstFields(tax),
            stockQuantity: asDraft ? 0 : NEW_PRODUCT_STOCK,
            // Always inactive: activation happens when Admin L2 approves the product.
            enabled: false,
            lastUpdateDescription: undefined,
            ...toImageFields(namedImages),
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
            ...softwareErrors,
            ...validateImages(namedImages, { draft: true }),
            ...validateComponentRows(components),
            ...validateProductWarranties(warranties),
            ...validateAccessoryForm(accessory),
            ...(canEditCosts ? validateCostEntries(costRows) : {}),
        };
        showErrors(clientErrors);
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
            ...softwareErrors,
            ...validateImages(namedImages),
            ...validateComponentRows(components, componentMaxFor(NEW_PRODUCT_STOCK, NO_SAVED_COMPONENTS)),
            ...validateProductWarranties(warranties),
            ...validateAccessoryForm(accessory),
            ...(canEditCosts ? validateCostEntries(costRows) : {}),
        };
        showErrors(clientErrors);
        if (Object.keys(clientErrors).length > 0) return;

        setPendingPayload(buildPayload(false));
        setPendingCosts(canSeeCosts ? costPreview : null);
        setShowPreviewModal(true);
    };

    const resetForm = () => {
        setTitle('');
        setModelName('');
        setCategory('');
        setCategoryTouched(false);
        setTagline('');
        setSoftware(toSoftwareForm(null));
        setDescription('');
        setPrice('');
        setDiscountPercentage('');
        setTax(emptyTaxForm());
        setAccessory(emptyAccessoryForm());
        setImages(toImageEntries(null));
        setSpecifications([{ specKey: '', specValue: '' }]);
        resetWarranties([]);
        setComponents([]);
        setUnits([]);
        setCostRows([]);
        setPendingCosts(null);
        setFieldErrors({});
        setShowPreviewModal(false);
        setPendingPayload(null);
        setActiveTab('basics');
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
            <ProductFormLayout
                heading={
                    <>
                        {draft ? `Finish Draft #${draft.id}` : 'Create New Product'}
                        <ProductVersionBadge product={draft} />
                    </>
                }
                onClose={onClose}
                onSubmit={handleInitialSubmit}
                tabs={tabs}
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                statusOf={(id) => tabStatus(id, errorTabs, tabComplete)}
                notes={
                    <>
                        <NewVersionNote product={draft} />
                        {template && (
                            <div role="note" data-testid="adapted-from-note" className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] dark:text-blue-400">
                                <p>
                                    Adapted from <strong>{template.title} {versionLabel(template)}</strong>
                                    {template.modelName ? ` (model ${template.modelName})` : ''}: every value was copied in. Change what is
                                    different, give this version its own model name and scan its unit. When this version is turned on,{' '}
                                    {versionLabel(template)} is turned off.
                                </p>
                                <button type="button" onClick={() => onAdapt(null)} className="shrink-0 font-medium hover:underline cursor-pointer">
                                    Start blank
                                </button>
                            </div>
                        )}
                    </>
                }
                fieldErrors={fieldErrors}
                status={
                    missingTabs.length > 0 && (
                        <span data-testid="create-product-missing" className="text-amber-600 dark:text-amber-400">
                            Still needed: {missingTabs.join(', ')}
                        </span>
                    )
                }
                actions={
                    <>
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
                    </>
                }
            >
                <section {...tabPanelProps('basics', activeTab)}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {draft ? (
                            <div>
                                <label htmlFor="draft-title" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                                <input
                                    id="draft-title"
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Product Title"
                                    className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white"
                                />
                            </div>
                        ) : (
                            <ProductTitleField value={title} onChange={setTitle} products={products} onAdapt={onAdapt} disabled={isSubmitting} />
                        )}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ProductModelField
                            value={modelName}
                            onChange={(value) => {
                                setModelName(value);
                                setFieldErrors(dropModelNameError);
                            }}
                            versionNumber={versionNumber}
                            versionHint={versionHintFor(title, versionNumber, draft)}
                            error={shownModelError}
                            disabled={isSubmitting}
                        />

                        <div onBlur={() => setCategoryTouched(true)}>
                            <ProductCategoryField
                                value={category}
                                onChange={setCategory}
                                categories={categories}
                                error={categoryTouched || fieldErrors.categoryName ? (fieldErrors.categoryName ?? categoryError) : null}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <ProductSoftwareField
                        value={software}
                        onChange={(next) => {
                            setSoftware(next);
                            setFieldErrors(dropSoftwareErrors);
                        }}
                        errors={fieldErrors}
                        disabled={isSubmitting}
                    />

                    <div>
                        <ProductDescriptionEditor
                            value={description}
                            onChange={setDescription}
                            context={{ title, tagline, categoryName: category, specifications }}
                            disabled={isSubmitting}
                        />
                        <ModelLinePreview modelName={modelName} versionNumber={versionNumber} />
                    </div>

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
                </section>

                <section {...tabPanelProps('pricing', activeTab)}>
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
                </section>

                <section {...tabPanelProps('media', activeTab)}>
                    <ProductImageSlots
                        entries={namedImages}
                        lookups={imageLookups}
                        onChange={handleImagesChange}
                        naming={imageNaming}
                        onBaseChange={handleImageBaseChange}
                        errors={fieldErrors}
                        disabled={isSubmitting}
                    />

                    <ProductSpecsEditor
                        specifications={specifications}
                        onAdd={handleAddSpec}
                        onChange={handleSpecChange}
                        onRemove={handleRemoveSpec}
                    />
                </section>

                <section {...tabPanelProps('components', activeTab)}>
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
                </section>

                {canSeeCosts && (
                    <section {...tabPanelProps('costing', activeTab)}>
                        <ProductCostingSection
                            rows={costRows}
                            setRows={setCostRows}
                            errors={fieldErrors}
                            onClearErrors={() => setFieldErrors((prev) => dropCostEntryErrors(prev))}
                            preview={costPreview}
                            incomeTaxRate={incomeTaxRate}
                            disabled={isSubmitting}
                        />
                    </section>
                )}

                <section {...tabPanelProps('warranties', activeTab)}>
                    <ProductWarrantiesEditor items={warranties} onChange={handleWarrantiesChange} errors={fieldErrors} disabled={isSubmitting} />
                </section>

                <section {...tabPanelProps('accessory', activeTab)}>
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
                </section>
            </ProductFormLayout>

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

                            <div data-testid="preview-model">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Model & version:</span>
                                <p className="text-black dark:text-white">
                                    {pendingPayload.modelName ?? '—'} · {versionLabel({ versionNumber })}
                                    {template && <span className="text-gray-500"> (adapted from {template.title} {versionLabel(template)})</span>}
                                </p>
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

                            {softwareLine(pendingPayload.softwareName, pendingPayload.softwareVersion) && (
                                <div data-testid="preview-software">
                                    <span className="font-semibold text-gray-500 dark:text-gray-400">Software:</span>
                                    <p className="text-black dark:text-white">{softwareLine(pendingPayload.softwareName, pendingPayload.softwareVersion)}</p>
                                </div>
                            )}

                            {(pendingPayload.description || pendingPayload.modelName) && (
                                <div>
                                    <span className="font-semibold text-gray-500 dark:text-gray-400">Description:</span>
                                    <ProductDescriptionView description={pendingPayload.description} />
                                    <p className="text-gray-500">{modelLine(pendingPayload.modelName, versionNumber)}</p>
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