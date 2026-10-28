import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { ProductCategory, ProductResponse, UpdateProductRequest, SpecificationDTO } from '../types/product.types';
import { ProductCategoryField } from './ProductCategoryField';
import { categorySlug, resolveCategoryName, validateCategoryName } from '../utils/productCategory';
import { ProductWarrantiesEditor } from './ProductWarrantiesEditor';
import type { ProductApprovalInfo } from './ProductTable';
import type { ProductChangeSummary, ProductCostSummary } from '../types/productApproval.types';
import { getApprovalPermissions } from '../utils/productApproval';
import { useProductWarranties } from '../hooks/useProductWarranties';
import { warrantiesComplete } from '../../item-management/utils/itemWarranty';
import { FormFieldErrors } from './FormFieldErrors';
import {
  describeWarrantyChanges,
  summarizeWarranties,
  toProductWarrantyForms,
  toProductWarrantyRequests,
  validateProductWarranties,
  warrantiesChanged,
} from '../utils/warrantyForm';
import { ProductComponentsSection } from './ProductComponentsSection';
import {
  billOfMaterialsChanged,
  componentsChanged,
  describeComponentChanges,
  dropComponentErrors,
  summarizeComponents,
  toComponentRequests,
  toComponentRows,
  validateComponentRows,
  type ComponentFormRow,
} from '../utils/componentForm';
import { componentMaxFor } from '../utils/componentStock';
import { describeGst, emptyTaxForm, gstChanged, toGstFields, toTaxForm, validateTaxForm, type ProductTaxForm } from '../utils/productTax';
import { ProductTaxSection } from './ProductTaxSection';
import { ProductTaxBreakdown } from './ProductTaxBreakdown';
import { ProductAccessorySection } from './ProductAccessorySection';
import {
  accessoryChange,
  dropAccessoryErrors,
  emptyAccessoryForm,
  toAccessoryFields,
  toAccessoryForm,
  validateAccessoryForm,
  type AccessoryForm,
} from '../utils/accessoryForm';
import { useEditCosts } from '../hooks/useEditCosts';
import { ProductCostingSection } from './ProductCostingSection';
import { ProfitBreakdown } from './ProfitBreakdown';
import { rupees } from '../../finance/utils/money';
import {
  componentChange,
  componentChangeBlocked,
  newVersionBlockedReason,
  nextVersionNumber,
  soldComponentsLockedMessage,
  type ComponentChange,
} from '../utils/productVersion';
import type { NewProductUnit } from '../../barcodes/types/barcode.types';
import { ProductUnitsInput } from '../../barcodes/components/ProductUnitsInput';
import { resizeUnits, toUnitComponents, unitsProblem } from '../../barcodes/utils/productUnits';
import { ProductVersionBadge } from './ProductVersionBadge';
import {
  costEntriesChanged,
  costPreviewRows,
  costPreviewWarnings,
  dropCostEntryErrors,
  previewCosts,
  summarizeCostEntries,
  toCostEntryRequests,
  toCostEntryRows,
  toCostSummary,
  validateCostEntries,
} from '../utils/productCosting';

interface EditProductModalProps {
  product: ProductResponse | null;
  onClose: () => void;
  /** `changes` is what was edited (sent to Admin L2 when the product is approved). */
  /** `costSummary`: one unit's cost and profit after the changes (only for those who can see costs). */
  onSubmit: (id: number, payload: UpdateProductRequest, changes: ProductChangeSummary[], costSummary?: ProductCostSummary) => Promise<boolean>;
  isSubmitting: boolean;
  /** Backend 400 field errors from the last save (e.g. `warranties[0].title`). */
  serverFieldErrors?: Record<string, string>;
  /** Admin L2 approval state: an unapproved product can't be switched on here. */
  approval?: ProductApprovalInfo;
  /** Every product, to pick the parents of an accessory from. */
  products?: ProductResponse[];
  /** Existing categories to pick from; a new name creates one. */
  categories?: readonly ProductCategory[];
  /** Copies the (sold) product into a new draft version. No button when absent (no PRODUCT_CREATE). */
  onCreateVersion?: (product: ProductResponse) => void;
}

// Stock always changes through Add/Reduce stock, where each unit's barcode is scanned
const stockHint = (usesItemStock: boolean) =>
  `${usesItemStock ? 'Uses item stock — change it' : 'Change it'} with Add/Reduce stock, where each unit's barcode is scanned.`;

/** What a component change does to the units in stock (see componentChange); nothing when it changes nothing. */
const ComponentChangeNote: React.FC<{ product: ProductResponse; change: ComponentChange }> = ({ product, change }) => {
  const units = product.stockQuantity;
  if (change === 'onSale') {
    return (
      <p role="alert" className="text-[11px] text-rose-500" data-testid="components-locked">
        Components can't change while the product is on sale with {units} unit{units === 1 ? '' : 's'} in stock. Turn it off first, then
        change the components. Unit costs can still be edited.
      </p>
    );
  }
  if (change === 'tooMany') {
    return (
      <p role="alert" className="text-[11px] text-rose-500" data-testid="components-locked">
        Components can't change while {units} units are in stock: each unit's pieces are recorded by barcode. Reduce the stock to 1 (or 0)
        first; the unit left is rebuilt with the new components. Unit costs can still be edited.
      </p>
    );
  }
  if (change === 'free' && units > 0) {
    return (
      <p role="note" className="text-[11px] text-gray-500" data-testid="components-released">
        The rejection already returned this product's pieces to item stock, so its components can change. When you resubmit it, you scan
        its unit again with the new components.
      </p>
    );
  }
  return null;
};

/**
 * A sold product's components are locked for good: past orders, warranties and costs depend on them (the backend
 * refuses a change with PRODUCT_SOLD_COMPONENTS_LOCKED). Changing them means a new version. Nothing for an unsold one.
 */
const SoldComponentsNote: React.FC<{
  product: ProductResponse;
  products: ProductResponse[];
  /** The form changes the components (refused). */
  changed: boolean;
  onCreateVersion?: (product: ProductResponse) => void;
}> = ({ product, products, changed, onCreateVersion }) => {
  if (!product.sold) return null;
  const versionNumber = nextVersionNumber(product, products);
  const blockedReason = newVersionBlockedReason(product, products);
  const tone = changed
    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
    : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400';
  const text = changed
    ? soldComponentsLockedMessage(product, products)
    : `This product has already been sold, so its components are locked (unit costs can still be edited). To change the components, create Version ${versionNumber}: a draft copy you can change and send for approval.`;
  return (
    <div role={changed ? 'alert' : 'note'} data-testid="components-sold-locked" className={`p-3 rounded-xl border space-y-2 text-[11px] ${tone}`}>
      <p>{text}</p>
      {blockedReason && <p className="font-medium">{blockedReason}</p>}
      {!blockedReason && onCreateVersion && (
        <button
          type="button"
          onClick={() => onCreateVersion(product)}
          className="px-3 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-lg font-medium cursor-pointer"
        >
          Create Version {versionNumber}
        </button>
      )}
    </div>
  );
};

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  onSubmit,
  isSubmitting,
  serverFieldErrors,
  approval,
  products = [],
  categories = [],
  onCreateVersion,
}) => {
  const [category, setCategory] = useState('');
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
  // GST included in the price: which taxes apply and their rates
  const [tax, setTax] = useState<ProductTaxForm>(emptyTaxForm);
  const [accessory, setAccessory] = useState<AccessoryForm>(emptyAccessoryForm);

  // Components keep the warranty snapshot stored with the product until an item is changed or refreshed.
  const [components, setComponents] = useState<ComponentFormRow[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Barcodes of the unit in stock when it is rebuilt with new components
  const [units, setUnits] = useState<NewProductUnit[]>([]);

  // Costs: the saved cost sheet, filled into the component rows and extra costs once loaded
  const { canSeeCosts, canEditCosts, incomeTaxRate, savedSheet, savedCosts, costRows, setCostRows } = useEditCosts(product, setComponents);

  // Saved warranties keep their id; warranties of newly selected items are copied in (see useProductWarranties).
  const { warranties, onChange: handleWarrantiesChange, reset: resetWarranties } = useProductWarranties(components, setFieldErrors);
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
      setCategory(product.category?.name ?? '');
      setTax(toTaxForm(product));
      setAccessory(toAccessoryForm(product));
      resetWarranties(toProductWarrantyForms(product.warranties));
      setComponents(toComponentRows(product.components, savedCosts));
      setCostRows(toCostEntryRows(savedSheet?.costEntries));
      setFieldErrors({});
      setUnits([]);
    }
    // The saved costs are filled in when they arrive (above); reopening the same product must not reset typed costs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, resetWarranties]);

  if (!product) return null;

  // Approved products aren't changed directly: saving sends the changes to Admin L2.
  const needsApproval = !!approval && getApprovalPermissions(approval.state).editNeedsApproval;

  // Each product unit uses its components' item stock and carries its own barcode, so stock changes always go through
  // Add/Reduce stock, where the units' barcodes are scanned
  const stockManagedByComponents = (product.components ?? []).length > 0;
  const savedPerUnit = new Map((product.components ?? []).map((c) => [c.itemId, Number(c.quantity)]));
  const componentLimit = componentMaxFor(product.stockQuantity, savedPerUnit);
  // Sold: the components never change again (a new version is made instead). Otherwise units in stock were built
  // from barcoded pieces: the pieces inside them can't change (the backend refuses both)
  // Sold: the components never change again (a new version is made instead). An unsold, switched-off product with 1
  // unit rebuilds it with the new components (its new barcodes scanned here); a rejected one already gave its pieces back
  const change = componentChange(
    product,
    billOfMaterialsChanged(product.components ?? [], components),
    approval?.state === 'REJECTED'
  );
  const rebuildComponents = toUnitComponents(components);
  const rebuiltUnits = change === 'rebuild' ? resizeUnits(units, 1, rebuildComponents) : [];
  const rebuildProblem = change === 'rebuild' ? unitsProblem(rebuiltUnits, 1, rebuildComponents) : null;

  // Helper to compute diffs between original product and formData
  const getChangedFields = () => {
    if (!product) return [];
    const changes: { label: string; oldVal: any; newVal: any }[] = [];

    if ((formData.title || '').trim() !== (product.title || '').trim()) {
      changes.push({ label: 'Title', oldVal: product.title, newVal: formData.title });
    }
    if (categorySlug(category) !== categorySlug(product.category?.name ?? '')) {
      changes.push({ label: 'Category', oldVal: product.category?.name || 'None', newVal: resolveCategoryName(categories, category) || 'None' });
    }
    if ((formData.tagline || '').trim() !== (product.tagline || '').trim()) {
      changes.push({ label: 'Tagline', oldVal: product.tagline || 'None', newVal: formData.tagline || 'None' });
    }
    if (Number(formData.price) !== Number(product.price)) {
      changes.push({ label: 'Price', oldVal: `₹${product.price}`, newVal: `₹${formData.price}` });
    }
    if (gstChanged(product, toGstFields(tax))) {
      changes.push({ label: 'GST', oldVal: describeGst(product), newVal: describeGst(toGstFields(tax)) });
    }
    if (Number(formData.stockQuantity) !== Number(product.stockQuantity)) {
      changes.push({ label: 'Stock Quantity', oldVal: product.stockQuantity, newVal: formData.stockQuantity });
    }
    if (Number(formData.discountPercentage || 0) !== Number(product.discountPercentage || 0)) {
      changes.push({ label: 'Discount Percentage', oldVal: `${product.discountPercentage || 0}%`, newVal: `${formData.discountPercentage || 0}%` });
    }
    if ((formData.description || '').trim() !== (product.description || '').trim()) {
      changes.push({ label: 'Description', oldVal: product.description || 'None', newVal: formData.description || 'None' });
    }
    if (Boolean(formData.enabled) !== Boolean(product.enabled)) {
      changes.push({ label: 'Status (Enabled)', oldVal: product.enabled ? 'Active' : 'Disabled', newVal: formData.enabled ? 'Active' : 'Disabled' });
    }

    // Check images
    for (let i = 1; i <= 5; i++) {
      const key = `image${i}Url` as keyof ProductResponse;
      const payloadKey = `image${i}Url` as keyof UpdateProductRequest;
      if (String(formData[payloadKey] || '').trim() !== String(product[key] || '').trim()) {
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

    // Check components (items + their warranty snapshots)
    const originalComponents = product.components ?? [];
    if (componentsChanged(originalComponents, components, savedCosts)) {
      changes.push({
        label: 'Components & item warranties',
        oldVal: summarizeComponents(originalComponents),
        newVal: describeComponentChanges(originalComponents, components, savedCosts).join('\n') || summarizeComponents(components),
      });
    }

    // Extra costs (compared only once the saved ones are known)
    if (savedSheet && costEntriesChanged(savedSheet.costEntries, costRows)) {
      changes.push({
        label: 'Extra costs',
        oldVal: summarizeCostEntries(savedSheet.costEntries, rupees),
        newVal: summarizeCostEntries(costRows.map((row) => ({ label: row.label, amount: row.amount || 0 })), rupees),
      });
    }

    const accessoryDiff = accessoryChange(product, accessory);
    if (accessoryDiff) changes.push(accessoryDiff);

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
  const taxErrors = validateTaxForm(tax);
  const categoryError = validateCategoryName(category);
  const costPreview = previewCosts({
    price: formData.price,
    discountPercentage: formData.discountPercentage,
    gstRate: tax.gstRate,
    components: components.map((row) => ({ quantity: row.quantity, unitCost: row.unitCost })),
    extraCosts: costRows.map((row) => row.amount),
    incomeTaxRate: incomeTaxRate ?? 0,
  });

  // Button is only enabled if fields are valid AND at least one modification is caught
  const isFormValid =
    formData.title?.trim() !== '' &&
    categoryError === null &&
    Number(formData.price) >= 0 &&
    Number(formData.stockQuantity) >= 0 &&
    components.every((row) => row.itemId !== null && !!row.quantity.trim()) &&
    warrantiesComplete(warranties) &&
    Object.keys(taxErrors).length === 0 &&
    !componentChangeBlocked(change) &&
    rebuildProblem === null &&
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

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const clientErrors = {
      ...validateComponentRows(components, componentLimit),
      ...validateProductWarranties(warranties),
      ...validateAccessoryForm(accessory),
      ...(canEditCosts ? validateCostEntries(costRows) : {}),
    };
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    // Warranties: always the full list (saved ones with id, new ones without) so removals are applied.
    // Components: sent only when changed (the list replaces them all); omitted otherwise so stored snapshots stay untouched.
    setPendingPayload({
      ...formData,
      categoryName: resolveCategoryName(categories, category),
      ...toGstFields(tax),
      warranties: toProductWarrantyRequests(warranties, true),
      ...(componentsChanged(product.components ?? [], components, savedCosts) ? { components: toComponentRequests(components, canEditCosts) } : {}),
      // Extra costs: sent only when changed (the list replaces them all); omitted otherwise
      ...(canEditCosts && savedSheet && costEntriesChanged(savedSheet.costEntries, costRows) ? { costEntries: toCostEntryRequests(costRows) } : {}),
      ...toAccessoryFields(accessory),
      // The unit in stock, rebuilt with the new components
      ...(change === 'rebuild' ? { newUnits: rebuiltUnits } : {}),
    });
    setShowPreviewModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingPayload) return;

    const changes = changedFields.map((f) => ({ label: f.label, oldValue: String(f.oldVal), newValue: String(f.newVal) }));
    // The approver sees one unit's cost and profit once any cost has been entered
    const costSummary = canSeeCosts ? toCostSummary(costPreview) : undefined;
    const success = await (costSummary ? onSubmit(product.id, pendingPayload, changes, costSummary) : onSubmit(product.id, pendingPayload, changes));
    
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
            <h2 className="text-sm font-bold text-black dark:text-white">
              Edit Product #{product.id}
              <ProductVersionBadge product={product} />
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleInitialSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {approval?.state === 'REJECTED' && (
              <div role="note" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 space-y-0.5">
                <p className="font-semibold">Rejected by an approver</p>
                {approval.latest?.decisionReason && <p>Reason: {approval.latest.decisionReason}</p>}
                <p>After saving your changes, use "Resubmit for approval" in the product list.</p>
              </div>
            )}
            {approval?.state === 'UPDATE_REJECTED' && (
              <div role="note" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 space-y-0.5">
                <p className="font-semibold">Your last changes were rejected by an approver</p>
                {approval.latest?.decisionReason && <p>Reason: {approval.latest.decisionReason}</p>}
              </div>
            )}
            {needsApproval && (
              <p role="note" data-testid="edit-needs-approval" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                Changes to this product need approval. The product stays as it is until they are approved.
              </p>
            )}

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

            <ProductCategoryField
              value={category}
              onChange={setCategory}
              categories={categories}
              error={fieldErrors.categoryName ?? categoryError}
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Price incl. GST (₹) *</label>
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
                  readOnly
                  aria-describedby="edit-stock-hint"
                  onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white read-only:bg-black/[0.05] read-only:text-gray-500"
                />
                <p id="edit-stock-hint" className="mt-1 text-[10px] text-gray-400">{stockHint(stockManagedByComponents)}</p>
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

            <ProductTaxSection
              value={tax}
              onChange={setTax}
              price={formData.price ?? ''}
              discountPercentage={formData.discountPercentage}
              errors={taxErrors}
              disabled={isSubmitting}
            />

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

            <ProductComponentsSection
              productStock={product.stockQuantity}
              savedPerUnit={savedPerUnit}
              rows={components}
              setRows={setComponents}
              errors={fieldErrors}
              onClearErrors={(keys) => setFieldErrors((prev) => dropComponentErrors(prev, keys))}
              disabled={isSubmitting}
            />
            <ComponentChangeNote product={product} change={change} />
            <SoldComponentsNote product={product} products={products} changed={change === 'sold'} onCreateVersion={onCreateVersion} />
            {change === 'rebuild' && (
              <section aria-label="Rebuilt unit barcodes" className="space-y-2" data-testid="components-rebuild">
                <p role="note" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                  The unit in stock is rebuilt with the new components: its current pieces go back to item stock. Scan the rebuilt
                  unit&apos;s barcode and the barcode of each piece fitted into it.
                </p>
                <ProductUnitsInput id="rebuild" units={rebuiltUnits} onChange={setUnits} components={rebuildComponents} disabled={isSubmitting} />
              </section>
            )}

            {canSeeCosts && (
              <ProductCostingSection
                rows={costRows}
                setRows={setCostRows}
                errors={fieldErrors}
                onClearErrors={() => setFieldErrors((prev) => dropCostEntryErrors(prev))}
                preview={costPreview}
                incomeTaxRate={incomeTaxRate}
                disabled={isSubmitting || !savedSheet}
              />
            )}

            <ProductWarrantiesEditor items={warranties} onChange={handleWarrantiesChange} errors={fieldErrors} disabled={isSubmitting} />

            <ProductAccessorySection
              value={accessory}
              onChange={setAccessory}
              products={products}
              selfId={product.id}
              ownAccessories={product.accessories}
              price={formData.price}
              discountPercentage={formData.discountPercentage}
              errors={fieldErrors}
              onClearErrors={() => setFieldErrors((prev) => dropAccessoryErrors(prev))}
              disabled={isSubmitting}
            />

            <FormFieldErrors errors={fieldErrors} />

            <div className="space-y-1 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsEnabled"
                  checked={formData.enabled}
                  // Switching on needs approval; switching off is always allowed.
                  disabled={!formData.enabled && !!approval && !getApprovalPermissions(approval.state).canActivate}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="rounded border-black/10 text-[#0071e3] focus:ring-[#0071e3] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <label htmlFor="editIsEnabled" className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Product is Enabled (Active in store)
                </label>
              </div>
              {!formData.enabled && approval && !getApprovalPermissions(approval.state).canActivate && (
                <p className="text-[11px] text-gray-500 pl-6" data-testid="activation-locked">
                  This product can be activated only after a catalog approver approves it.
                </p>
              )}
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
                {needsApproval ? 'Review & Request Approval' : 'Review & Update'}
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
                  <p className="text-gray-500 font-medium">
                    {needsApproval
                      ? 'These changes will be sent for approval and applied once approved:'
                      : 'Only the following modified fields will be updated:'}
                  </p>
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
              <ProductTaxBreakdown
                price={pendingPayload.price}
                discountPercentage={pendingPayload.discountPercentage}
                gst={pendingPayload}
                title={needsApproval ? 'What the invoice will show per unit once approved' : 'What the invoice will show per unit'}
              />
              {canSeeCosts && (
                <ProfitBreakdown
                  title={needsApproval ? 'What one unit will earn once approved' : 'What one unit will earn'}
                  rows={costPreviewRows(costPreview)}
                  profit={costPreview.profit}
                  incomeTaxRate={incomeTaxRate}
                  warnings={costPreviewWarnings(costPreview)}
                />
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
                {isSubmitting ? 'Saving...' : needsApproval ? 'Send for Approval' : 'Confirm & Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};