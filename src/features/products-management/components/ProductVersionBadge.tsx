import React from 'react';
import type { ProductResponse } from '../types/product.types';
import { versionLabel } from '../utils/productVersion';

/** "v2" next to a form title; nothing for a first version. */
export const ProductVersionBadge: React.FC<{ product: Pick<ProductResponse, 'versionNumber'> | null }> = ({ product }) =>
  product && product.versionNumber > 1 ? (
    <span className="ml-2 px-1.5 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] text-[10px] font-semibold">{versionLabel(product)}</span>
  ) : null;

/** At the top of a new version's draft form: what was copied and when the previous version stops selling. */
export const NewVersionNote: React.FC<{ product: Pick<ProductResponse, 'versionNumber'> | null }> = ({ product }) =>
  product && product.versionNumber > 1 ? (
    <p role="note" data-testid="new-version-note" className="p-3 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] dark:text-blue-400">
      Version {product.versionNumber}, copied from the previous version with its components, warranties and costs. Change what you
      need here. The previous version keeps selling until this one is approved and turned on; then the previous version is turned
      off automatically.
    </p>
  ) : null;
