/** The parts of the create (or draft) product form, one tab each, in the order a product is usually filled in. */
export type CreateProductTab = 'basics' | 'pricing' | 'media' | 'components' | 'costing' | 'warranties' | 'accessory';

export const CREATE_PRODUCT_TABS: readonly { id: CreateProductTab; label: string; hint: string }[] = [
  { id: 'basics', label: 'Basics', hint: 'Title, model, category and description' },
  { id: 'pricing', label: 'Price & GST', hint: 'Price, discount and GST' },
  { id: 'media', label: 'Images & specs', hint: 'The 5 standard views, each described, and the specifications' },
  { id: 'components', label: 'Components & barcodes', hint: 'Items one unit uses and its barcodes' },
  { id: 'costing', label: 'Costs', hint: 'Extra costs of one unit and its profit' },
  { id: 'warranties', label: 'Warranties', hint: 'Warranties the customer gets' },
  { id: 'accessory', label: 'Accessory', hint: 'Sell it as an add-on to other products' },
];

/** The tab a field error belongs to. Keys are the backend's (`components[0].quantity`, `hsnSac`, …). */
export const tabForErrorKey = (key: string): CreateProductTab => {
  const field = key.split(/[.[]/)[0];
  if (['price', 'discountPercentage', 'hsnSac', 'gstRate', 'stockQuantity'].includes(field)) return 'pricing';
  if (field === 'specifications' || /^image\d(Url|Description)$/.test(field)) return 'media';
  if (field === 'components' || field === 'newUnits') return 'components';
  if (field === 'costEntries') return 'costing';
  if (field === 'warranties') return 'warranties';
  if (field.startsWith('accessory')) return 'accessory';
  return 'basics';
};

/** The tabs holding at least one of these field errors (`basicsInvalid`: an error Basics shows without a key, e.g. a taken model name). */
export const tabsWithErrors = (errors: Record<string, string>, basicsInvalid = false): Set<CreateProductTab> => {
  const tabs = new Set(Object.keys(errors).map(tabForErrorKey));
  if (basicsInvalid) tabs.add('basics');
  return tabs;
};

/** The first tab (in form order) holding one of these errors, or null without errors. */
export const firstTabWithError = (errors: Record<string, string>): CreateProductTab | null => {
  const tabs = tabsWithErrors(errors);
  return CREATE_PRODUCT_TABS.find((tab) => tabs.has(tab.id))?.id ?? null;
};

/** A tab's marker: an error to fix, something still needed to create or submit, all needed filled in, or nothing needed. */
export type TabStatus = 'error' | 'todo' | 'done' | 'optional';

/** `complete`: whether each tab with required fields has them all (tabs with none are absent). */
export const tabStatus = (
  id: CreateProductTab,
  errorTabs: ReadonlySet<CreateProductTab>,
  complete: Partial<Record<CreateProductTab, boolean>>
): TabStatus => {
  if (errorTabs.has(id)) return 'error';
  if (complete[id] === undefined) return 'optional';
  return complete[id] ? 'done' : 'todo';
};

/** The tab holding a form field (e.g. the one the browser's own check stopped on), or null outside every tab. */
export const tabOfField = (field: EventTarget | null): CreateProductTab | null => {
  const panel = field instanceof Element ? field.closest<HTMLElement>('[data-tab-panel]') : null;
  return (panel?.dataset.tabPanel as CreateProductTab | undefined) ?? null;
};
