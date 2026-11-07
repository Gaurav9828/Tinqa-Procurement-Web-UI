import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TabbedModal } from '../../../components/ui/TabbedModal';
import type { SpecificationDTO } from '../types/product.types';
import { FormFieldErrors } from './FormFieldErrors';
import { type CREATE_PRODUCT_TABS, type CreateProductTab, type TabStatus } from '../utils/createProductTabs';
import { inputClassName } from '../utils/productFormLayout';

interface ProductFormLayoutProps {
  heading: React.ReactNode;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  tabs: typeof CREATE_PRODUCT_TABS;
  activeTab: CreateProductTab;
  onSelectTab: (id: CreateProductTab) => void;
  statusOf: (id: CreateProductTab) => TabStatus;
  /** Shown above every part (e.g. a rejection or "adapted from" note). */
  notes?: React.ReactNode;
  fieldErrors: Record<string, string>;
  /** Next to the actions: what still stops the save. */
  status?: React.ReactNode;
  /** Cancel, save and submit buttons. */
  actions: React.ReactNode;
  /** One `<section {...tabPanelProps(id, activeTab)}>` per tab. */
  children: React.ReactNode;
}

/** The frame of the create, edit and preview product form: the shared tabbed modal under the product form's ids. */
export const ProductFormLayout: React.FC<ProductFormLayoutProps> = ({ fieldErrors, heading, ...props }) => (
  <TabbedModal
    idPrefix="create-product"
    tabsLabel="Product form sections"
    heading={heading}
    ariaLabel={typeof heading === 'string' ? heading : 'Product'}
    footer={<FormFieldErrors errors={fieldErrors} />}
    {...props}
  />
);

interface ProductSpecsEditorProps {
  specifications: readonly SpecificationDTO[];
  onAdd: () => void;
  onChange: (index: number, field: keyof SpecificationDTO, value: string) => void;
  onRemove: (index: number) => void;
}

/** The specification rows (key and value) of the create and the edit form. */
export const ProductSpecsEditor: React.FC<ProductSpecsEditorProps> = ({ specifications, onAdd, onChange, onRemove }) => (
  <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
    <label className="block font-medium text-gray-700 dark:text-gray-300">Specifications</label>
    {specifications.map((spec, index) => (
      <div key={index} className="flex items-center gap-2">
        <input
          type="text"
          value={spec.specKey}
          onChange={(e) => onChange(index, 'specKey', e.target.value)}
          placeholder="Spec Key (e.g. Color)"
          className={inputClassName.replace('w-full', 'w-1/2')}
        />
        <input
          type="text"
          value={spec.specValue}
          onChange={(e) => onChange(index, 'specValue', e.target.value)}
          placeholder="Spec Value (e.g. Midnight Black)"
          className={inputClassName.replace('w-full', 'w-1/2')}
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 rounded-xl transition-colors cursor-pointer"
          title="Remove spec"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ))}
    <button type="button" onClick={onAdd} className="flex items-center gap-1.5 text-[#0071e3] hover:underline font-medium pt-1 cursor-pointer">
      <Plus className="w-3.5 h-3.5" /> Add Spec
    </button>
  </div>
);
