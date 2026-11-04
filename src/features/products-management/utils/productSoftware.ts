import type { ProductResponse } from '../types/product.types';

/**
 * The optional software a product runs (firmware, an app or an operating system) and its version, e.g. "TinQa OS" and
 * "2.1.0" (Ecommerce BE ProductSoftware). Customers see both with the specifications, so they come as a pair: both or
 * neither.
 */

/** Ecommerce BE limits (ProductRequestDTO, V36). */
export const SOFTWARE_NAME_MAX = 100;
export const SOFTWARE_VERSION_MAX = 50;

export interface SoftwareForm {
  name: string;
  version: string;
}

export const emptySoftwareForm = (): SoftwareForm => ({ name: '', version: '' });

export const toSoftwareForm = (product: Pick<ProductResponse, 'softwareName' | 'softwareVersion'> | null | undefined): SoftwareForm => ({
  name: product?.softwareName ?? '',
  version: product?.softwareVersion ?? '',
});

/** Field errors keyed like the server's (`softwareName`, `softwareVersion`); empty when the pair is fine. */
export const validateSoftware = ({ name, version }: SoftwareForm): Record<string, string> => {
  const errors: Record<string, string> = {};
  const n = name.trim();
  const v = version.trim();
  if (/[\r\n]/.test(name)) errors.softwareName = 'Software name must be a single line.';
  else if (n.length > SOFTWARE_NAME_MAX) errors.softwareName = `Software name can be at most ${SOFTWARE_NAME_MAX} characters.`;
  else if (!n && v) errors.softwareName = `Enter the name of the software at version ${v}, or clear the version.`;
  if (/[\r\n]/.test(version)) errors.softwareVersion = 'Software version must be a single line.';
  else if (v.length > SOFTWARE_VERSION_MAX) errors.softwareVersion = `Software version can be at most ${SOFTWARE_VERSION_MAX} characters.`;
  else if (n && !v) errors.softwareVersion = `Enter the version of ${n}, or clear the software name.`;
  return errors;
};

/**
 * The request fields. A new product leaves them out while empty; an edit always sends them, so clearing both ('')
 * removes the saved software (left out, the server keeps it).
 */
export const toSoftwareFields = (form: SoftwareForm, replace: boolean): { softwareName?: string; softwareVersion?: string } => {
  const name = form.name.trim();
  const version = form.version.trim();
  if (!replace && !name && !version) return {};
  return { softwareName: name, softwareVersion: version };
};

/** "TinQa OS 2.1.0", as customers read it; null without software. */
export const softwareLine = (name: string | null | undefined, version: string | null | undefined): string | null => {
  const n = name?.trim();
  const v = version?.trim();
  if (!n) return null;
  return v ? `${n} ${v}` : n;
};

/** Whether the form differs from the saved product's software (trimmed). */
export const softwareChanged = (product: Pick<ProductResponse, 'softwareName' | 'softwareVersion'>, form: SoftwareForm): boolean =>
  (product.softwareName ?? '').trim() !== form.name.trim() || (product.softwareVersion ?? '').trim() !== form.version.trim();

/** The approver's change line for the software (none when it is unchanged), as in the edit form's change list. */
export const softwareChanges = (
  product: Pick<ProductResponse, 'softwareName' | 'softwareVersion'>,
  form: SoftwareForm
): { label: string; oldVal: string; newVal: string }[] =>
  softwareChanged(product, form)
    ? [{ label: 'Software', oldVal: softwareLine(product.softwareName, product.softwareVersion) ?? 'None', newVal: softwareLine(form.name, form.version) ?? 'None' }]
    : [];

export const dropSoftwareErrors = (errors: Record<string, string>): Record<string, string> => {
  if (!('softwareName' in errors) && !('softwareVersion' in errors)) return errors;
  const rest = { ...errors };
  delete rest.softwareName;
  delete rest.softwareVersion;
  return rest;
};
