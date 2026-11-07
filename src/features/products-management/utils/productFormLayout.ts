import { modalTabPanelProps } from '../../../components/ui/TabbedModal';
import type { CreateProductTab } from './createProductTabs';

/** The props of one part's panel: only the active one is shown, the others stay mounted so nothing typed is lost. */
export const tabPanelProps = (id: CreateProductTab, activeTab: CreateProductTab) => modalTabPanelProps('create-product', id, activeTab);

export const inputClassName =
  'w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white';
export const labelClassName = 'block font-medium text-gray-700 dark:text-gray-300 mb-1';
