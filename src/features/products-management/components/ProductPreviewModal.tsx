import React, { useState } from 'react';
import { ComponentsPreview } from './ComponentsPreview';
import { ProductUnitsPanel } from '../../barcodes/components/ProductUnitsPanel';
import { ProductRatingSummary } from '../../reviews/components/ProductRatingSummary';
import type { ProductResponse } from '../types/product.types';
import { describeGst } from '../utils/productTax';
import { ProductTaxBreakdown } from './ProductTaxBreakdown';
import { describeAccessory } from '../utils/accessoryForm';
import { ProductProfitPanel } from './ProductProfitPanel';
import { ProductVersionBadge } from './ProductVersionBadge';
import { ProductDescriptionView } from './ProductDescriptionView';
import { formatVersion, modelLine } from '../utils/productVersion';
import { softwareLine } from '../utils/productSoftware';
import { IMAGE_SLOTS } from '../utils/productImages';
import { ProductFormLayout } from './ProductFormLayout';
import { inputClassName, labelClassName, tabPanelProps } from '../utils/productFormLayout';
import { CREATE_PRODUCT_TABS, type CreateProductTab } from '../utils/createProductTabs';
import { formatWarrantyDuration, formatWarrantyType } from '../../item-management/utils/itemWarranty';
import { useAccess } from '../../../hooks/useAccess';

interface ProductPreviewModalProps {
  product: ProductResponse | null;
  onClose: () => void;
}

const NO_ERRORS: Record<string, string> = {};
const readOnlyBox = `${inputClassName} bg-black/[0.04] dark:bg-white/[0.04] min-h-[34px] break-words`;

/** One field as the create/edit form lays it out (label above, value in the field's box), but not editable. */
const ReadOnlyField: React.FC<{ label: string; value: React.ReactNode; testId?: string }> = ({ label, value, testId }) => (
  <div>
    <span className={labelClassName}>{label}</span>
    <div className={readOnlyBox} data-testid={testId} aria-readonly="true" role="textbox" aria-label={label}>
      {value === null || value === undefined || value === '' ? <span className="text-gray-400">—</span> : value}
    </div>
  </div>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-gray-400 italic">{children}</p>;

/**
 * A product shown in the same frame and parts (tabs) as the create and edit form, every field read-only. Panels that
 * load data (unit barcodes, costs) are rendered only while their tab is open, so a closed tab fetches nothing.
 */
export const ProductPreviewModal: React.FC<ProductPreviewModalProps> = ({ product, onClose }) => {
  const { can } = useAccess();
  const [activeTab, setActiveTab] = useState<CreateProductTab>('basics');
  const [shownId, setShownId] = useState<number | null>(null);
  // Each newly opened product starts on Basics (state adjusted during render, not in an effect)
  if ((product?.id ?? null) !== shownId) {
    setShownId(product?.id ?? null);
    setActiveTab('basics');
  }
  if (!product) return null;

  const tabs = CREATE_PRODUCT_TABS.filter((tab) => tab.id !== 'costing' || can('PRODUCT_COST_VIEW'));
  const version = formatVersion(product.versionNumber);
  const software = softwareLine(product.softwareName, product.softwareVersion);
  const line = modelLine(product.modelName, product.versionNumber);

  return (
    <ProductFormLayout
      heading={
        <span className="flex items-center gap-2">
          {product.title}
          <ProductVersionBadge product={product} />
          <span
            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${product.enabled ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 border-rose-500/30'}`}
          >
            {product.enabled ? 'ENABLED' : 'DISABLED'}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-black/5 dark:bg-white/10 text-gray-500">View only</span>
        </span>
      }
      onClose={onClose}
      onSubmit={(e) => e.preventDefault()}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      statusOf={() => 'optional'}
      fieldErrors={NO_ERRORS}
      actions={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl font-medium transition-colors cursor-pointer"
        >
          Close
        </button>
      }
    >
      <section {...tabPanelProps('basics', activeTab)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Title" value={product.title} />
          <ReadOnlyField label="Tagline" value={product.tagline} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Model name" value={product.modelName ? `${product.modelName} · ${version}` : version} />
          <ReadOnlyField label="Category" value={product.category?.name} />
        </div>
        <ReadOnlyField label="Software" value={software} testId="preview-software" />
        <div>
          <span className={labelClassName}>Description</span>
          <div className={readOnlyBox}>
            {product.description ? <ProductDescriptionView description={product.description} /> : <span className="text-gray-400">—</span>}
          </div>
          {line && (
            // Written at the bottom of the description on the storefront
            <p data-testid="preview-model-line" className="mt-1 text-gray-500">
              {line}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Status" value={product.enabled ? 'Enabled (active in store)' : 'Disabled'} />
          <div>
            <span className={labelClassName}>Customer rating</span>
            <div className={readOnlyBox}>
              <ProductRatingSummary productId={product.id} averageRating={product.averageRating} reviewCount={product.reviewCount} />
            </div>
          </div>
        </div>
      </section>

      <section {...tabPanelProps('pricing', activeTab)}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ReadOnlyField label="Price incl. GST (₹)" value={`₹${(product.price ?? 0).toLocaleString('en-IN')}`} />
          <ReadOnlyField label="Discount (%)" value={`${product.discountPercentage ?? 0}%`} />
          <ReadOnlyField label="Stock Qty" value={product.stockQuantity} />
        </div>
        <ReadOnlyField label="GST" value={describeGst(product)} testId="preview-gst" />
        <ProductTaxBreakdown price={product.price} discountPercentage={product.discountPercentage} gst={product} />
      </section>

      <section {...tabPanelProps('media', activeTab)}>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Product images">
          {IMAGE_SLOTS.map((slot, index) => {
            const url = product[slot.urlField];
            const description = product[slot.descriptionField];
            return (
              <li key={slot.urlField} className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex gap-3">
                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/[0.03] flex items-center justify-center">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={slot.view} className="w-16 h-16 object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-400">No image</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-black dark:text-white">
                    {index + 1} · {slot.view}
                  </p>
                  <p className={description ? 'text-gray-600 dark:text-gray-300' : 'italic text-gray-400'}>{description ?? 'No description yet'}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
          <span className="block font-medium text-gray-700 dark:text-gray-300">Specifications</span>
          {product.specifications.length === 0 ? (
            <Empty>No specifications</Empty>
          ) : (
            product.specifications.map((spec, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={readOnlyBox.replace('w-full', 'w-1/2')}>{spec.specKey}</div>
                <div className={readOnlyBox.replace('w-full', 'w-1/2')}>{spec.specValue}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section {...tabPanelProps('components', activeTab)}>
        {product.components.length > 0 ? <ComponentsPreview components={product.components} /> : <Empty>Not built from components</Empty>}
        {activeTab === 'components' && <ProductUnitsPanel productId={product.id} />}
      </section>

      {tabs.some((tab) => tab.id === 'costing') && (
        <section {...tabPanelProps('costing', activeTab)}>{activeTab === 'costing' && <ProductProfitPanel productId={product.id} />}</section>
      )}

      <section {...tabPanelProps('warranties', activeTab)}>
        {product.warranties.length === 0 ? (
          <Empty>No warranties</Empty>
        ) : (
          <ul className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden" aria-label="Warranties">
            {product.warranties.map((warranty) => (
              <li key={warranty.id} className="px-3 py-2 border-b last:border-b-0 border-black/5 dark:border-white/5 space-y-0.5">
                <span className="flex justify-between gap-2">
                  <span className="font-medium text-black dark:text-white">{warranty.title}</span>
                  <span className="text-gray-500 shrink-0">
                    {formatWarrantyType(warranty.warrantyType)} · {formatWarrantyDuration(warranty.durationValue, warranty.durationUnit)} ·{' '}
                    {warranty.isActive ? 'Active' : 'Inactive'}
                  </span>
                </span>
                {warranty.coverage && <span className="block text-gray-500">{warranty.coverage}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section {...tabPanelProps('accessory', activeTab)}>
        {product.accessory ? (
          <div data-testid="preview-accessory" className="space-y-3">
            <ReadOnlyField label="Sold as an accessory of" value={describeAccessory(product.accessoryFor, true)} />
            <ReadOnlyField label="Purpose" value={product.accessoryPurpose} />
            {product.accessoryBenefits.length > 0 && (
              <div>
                <span className={labelClassName}>Benefits</span>
                <ul className={`${readOnlyBox} list-disc pl-6`}>
                  {product.accessoryBenefits.map((benefit, i) => (
                    <li key={i}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <Empty>Not sold as an accessory</Empty>
        )}
        {product.accessories.length > 0 && (
          <ReadOnlyField
            label="Accessories offered with it"
            value={product.accessories
              .map((link) => (link.bundleDiscountPercentage > 0 ? `${link.title} (+${link.bundleDiscountPercentage}% off together)` : link.title))
              .join(', ')}
          />
        )}
      </section>
    </ProductFormLayout>
  );
};
