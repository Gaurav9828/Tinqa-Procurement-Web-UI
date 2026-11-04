import React from 'react';
import type { ProductResponse } from '../types/product.types';
import { formatVersion, MODEL_NAME_MAX, modelLine, versionLabel } from '../utils/productVersion';

/** "v0.2" next to a form title. */
export const ProductVersionBadge: React.FC<{ product: Pick<ProductResponse, 'versionNumber'> | null }> = ({ product }) =>
  product ? (
    <span className="ml-2 px-1.5 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] text-[10px] font-semibold">{versionLabel(product)}</span>
  ) : null;

/** At the top of a new version's draft form: what was copied and when the version it came from stops selling. */
export const NewVersionNote: React.FC<{ product: Pick<ProductResponse, 'versionNumber' | 'previousVersionId' | 'modelName'> | null }> = ({ product }) =>
  product && product.previousVersionId !== null ? (
    <p role="note" data-testid="new-version-note" className="p-3 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] dark:text-blue-400">
      {versionLabel(product)}, copied from #{product.previousVersionId} with its components, warranties and costs.
      {!product.modelName && ' Give it its own model name.'} Change what you need here. The version it came from keeps selling until this
      one is approved and turned on; then that version is turned off automatically.
    </p>
  ) : null;

interface ProductModelFieldProps {
  value: string;
  onChange: (modelName: string) => void;
  /** The version the product has or will get when saved. */
  versionNumber: number;
  /** Explains the version, e.g. "given when saved". */
  versionHint: string;
  error?: string | null;
  disabled?: boolean;
}

/** Model name (each version has its own) and the version it goes with, which the server numbers. */
export const ProductModelField: React.FC<ProductModelFieldProps> = ({ value, onChange, versionNumber, versionHint, error, disabled }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label htmlFor="product-model-name" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
        Model name *
      </label>
      <input
        id="product-model-name"
        type="text"
        value={value}
        maxLength={MODEL_NAME_MAX}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby="product-model-name-hint"
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. RX-200"
        className={`w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white ${
          error ? 'border-rose-500/60' : 'border-black/10 dark:border-white/10'
        }`}
      />
      {error ? (
        <p id="product-model-name-hint" role="alert" className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : (
        <p id="product-model-name-hint" className="mt-1 text-[10px] text-gray-400">
          Each version has its own model name; no two products can share one.
        </p>
      )}
    </div>
    <div>
      <span className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Version</span>
      <p
        data-testid="product-version"
        className="w-full px-3 py-2 bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-xl font-semibold text-[#0071e3] dark:text-blue-400"
      >
        {formatVersion(versionNumber)}
      </p>
      <p className="mt-1 text-[10px] text-gray-400">{versionHint}</p>
    </div>
  </div>
);

/** Under the description: the line written at the bottom of it on the storefront. Nothing until a model name is typed. */
export const ModelLinePreview: React.FC<{ modelName: string; versionNumber: number }> = ({ modelName, versionNumber }) => {
  const line = modelLine(modelName, versionNumber);
  return line ? (
    <p data-testid="description-model-line" className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
      {line}
      <span className="text-gray-400"> — added at the bottom of the description on the storefront</span>
    </p>
  ) : null;
};
