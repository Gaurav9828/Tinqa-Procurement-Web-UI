import React from 'react';
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SpecificationDTO } from '../types/product.types';
import { CreateProductTabList } from './CreateProductTabList';
import { FormFieldErrors } from './FormFieldErrors';
import { tabOfField, type CREATE_PRODUCT_TABS, type CreateProductTab, type TabStatus } from '../utils/createProductTabs';
import { inputClassName } from '../utils/productFormLayout';

const navButtonClassName =
  'flex items-center gap-1 px-3 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

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

/**
 * The frame of the create and the edit product form, so both look and work the same: the parts in a numbered list
 * (a column on wide screens), the open part beside it, and Back / Next with the save buttons below.
 */
export const ProductFormLayout: React.FC<ProductFormLayoutProps> = ({
  heading,
  onClose,
  onSubmit,
  tabs,
  activeTab,
  onSelectTab,
  statusOf,
  notes,
  fieldErrors,
  status,
  actions,
  children,
}) => {
  const tabIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-xl text-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-sm font-bold text-black dark:text-white">{heading}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The browser's own checks (e.g. a discount over 100) stop on a hidden field: show its tab first */}
        <form onSubmit={onSubmit} onInvalidCapture={(e) => onSelectTab(tabOfField(e.target) ?? activeTab)} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            <CreateProductTabList tabs={tabs} activeTab={activeTab} statusOf={statusOf} onSelect={onSelectTab} />

            <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-4">
              {notes}
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white">{tabs[tabIndex].label}</h3>
                <p className="text-gray-400">{tabs[tabIndex].hint}</p>
              </div>
              {children}
            </div>
          </div>

          {/* Footer: the same on every tab */}
          <div className="px-6 py-4 space-y-3 border-t border-black/10 dark:border-white/10">
            <FormFieldErrors errors={fieldErrors} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onSelectTab(tabs[tabIndex - 1].id)} disabled={tabIndex === 0} className={navButtonClassName}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab(tabs[tabIndex + 1].id)}
                  disabled={tabIndex === tabs.length - 1}
                  className={navButtonClassName}
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-gray-400">
                  Step {tabIndex + 1} of {tabs.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {status}
                {actions}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

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
