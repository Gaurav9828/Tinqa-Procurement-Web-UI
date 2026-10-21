import {
  ACCESSORY_BENEFIT_MAX,
  ACCESSORY_BENEFITS_MAX,
  ACCESSORY_PURPOSE_MAX,
  BUNDLE_DISCOUNT_MAX,
  type AccessoryFields,
  type ProductResponse,
} from '../types/product.types';

/** One parent product in the form; `discount` is the raw input. */
export interface AccessoryParentRow {
  productId: number;
  title: string;
  discount: string;
}

/** Accessory part of the create / edit product form. */
export interface AccessoryForm {
  isAccessory: boolean;
  purpose: string;
  /** Benefit inputs, blanks allowed while editing (dropped on save). */
  benefits: string[];
  parents: AccessoryParentRow[];
}

export const emptyAccessoryForm = (): AccessoryForm => ({ isAccessory: false, purpose: '', benefits: [''], parents: [] });

export const toAccessoryForm = (product: Pick<ProductResponse, 'accessory' | 'accessoryPurpose' | 'accessoryBenefits' | 'accessoryFor'>): AccessoryForm => ({
  isAccessory: product.accessory,
  purpose: product.accessoryPurpose ?? '',
  benefits: product.accessoryBenefits.length > 0 ? [...product.accessoryBenefits] : [''],
  parents: product.accessoryFor.map((link) => ({
    productId: link.productId,
    title: link.title,
    discount: String(link.bundleDiscountPercentage),
  })),
});

/**
 * Products an accessory can be offered with: not the product itself and not accessories (links are one level deep).
 * Sorted by title.
 */
export const parentCandidates = (products: ProductResponse[], selfId?: number): ProductResponse[] =>
  products
    .filter((product) => product.id !== selfId && !product.accessory)
    .sort((a, b) => a.title.localeCompare(b.title));

const DISCOUNT_PATTERN = /^\d{1,2}(\.\d{1,2})?$/;

const keptBenefits = (form: AccessoryForm) => form.benefits.map((benefit) => benefit.trim()).filter(Boolean);

/** Field errors keyed like the backend's (`accessoryParents[0].bundleDiscountPercentage`, …). */
export const validateAccessoryForm = (form: AccessoryForm): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!form.isAccessory) return errors;
  if (form.parents.length === 0) errors.accessoryParents = 'Choose at least one product this accessory is offered with.';
  form.parents.forEach((row, index) => {
    const value = row.discount.trim();
    if (!DISCOUNT_PATTERN.test(value) || Number(value) > BUNDLE_DISCOUNT_MAX) {
      errors[`accessoryParents[${index}].bundleDiscountPercentage`] =
        `Extra discount with ${row.title} must be 0–${BUNDLE_DISCOUNT_MAX}% (up to 2 decimals).`;
    }
  });
  if (form.purpose.trim().length > ACCESSORY_PURPOSE_MAX) {
    errors.accessoryPurpose = `"Why it's needed" can be at most ${ACCESSORY_PURPOSE_MAX} characters.`;
  }
  const benefits = keptBenefits(form);
  if (benefits.length > ACCESSORY_BENEFITS_MAX) errors.accessoryBenefits = `List at most ${ACCESSORY_BENEFITS_MAX} benefits.`;
  else if (benefits.some((benefit) => benefit.length > ACCESSORY_BENEFIT_MAX)) {
    errors.accessoryBenefits = `Each benefit can be at most ${ACCESSORY_BENEFIT_MAX} characters.`;
  }
  return errors;
};

/** The request fields. Always sent, so the saved settings match the form exactly. */
export const toAccessoryFields = (form: AccessoryForm): AccessoryFields =>
  form.isAccessory
    ? {
        accessory: true,
        accessoryPurpose: form.purpose.trim() || undefined,
        accessoryBenefits: keptBenefits(form),
        accessoryParents: form.parents.map((row) => ({
          parentProductId: row.productId,
          bundleDiscountPercentage: Number(row.discount.trim()),
        })),
      }
    : { accessory: false };

/** "Offered with Lamp (+5% off), Frame (no extra discount)" or "Not an accessory". */
export const describeAccessory = (parents: { title?: string | null; productId: number; bundleDiscountPercentage: number }[], isAccessory: boolean): string => {
  if (!isAccessory) return 'Not an accessory';
  const list = parents
    .map((parent) => {
      const name = parent.title || `Product #${parent.productId}`;
      return parent.bundleDiscountPercentage > 0 ? `${name} (+${parent.bundleDiscountPercentage}% off)` : `${name} (no extra discount)`;
    })
    .join(', ');
  return `Offered with ${list || 'no products'}`;
};

const describeForm = (form: AccessoryForm): string => {
  const parents = form.parents.map((row) => ({ productId: row.productId, title: row.title, bundleDiscountPercentage: Number(row.discount) || 0 }));
  const lines = [describeAccessory(parents, form.isAccessory)];
  if (form.isAccessory && form.purpose.trim()) lines.push(`Why: ${form.purpose.trim()}`);
  if (form.isAccessory && keptBenefits(form).length > 0) lines.push(`Benefits: ${keptBenefits(form).join('; ')}`);
  return lines.join('\n');
};

/** Change-summary entry for the edit review / Admin L2, or null when nothing changed. */
export const accessoryChange = (product: ProductResponse, form: AccessoryForm): { label: string; oldVal: string; newVal: string } | null => {
  const before = describeForm(toAccessoryForm(product));
  const after = describeForm(form);
  return before === after ? null : { label: 'Accessory', oldVal: before, newVal: after };
};

/** Drops accessory errors (after the admin edits that part of the form). */
export const dropAccessoryErrors = (errors: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => !key.startsWith('accessory')));
