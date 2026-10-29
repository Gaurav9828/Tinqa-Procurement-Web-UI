import type { NewProductUnit } from '../types/barcode.types';
import type { UnitComponent } from './productUnits';

/**
 * The unit barcodes last sent for a product that isn't approved yet, kept in this browser. A rejection voids the units
 * and gives their pieces back (the backend no longer lists them), but the same codes may be sent again, so a
 * resubmission starts from them instead of asking for every code to be scanned again.
 */
const key = (productId: number) => `tinqa.productUnits.${productId}`;

export const rememberedUnits = (productId: number): NewProductUnit[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(productId)) ?? '[]');
    return Array.isArray(parsed) ? (parsed as NewProductUnit[]) : [];
  } catch {
    return [];
  }
};

/** Replaces what is kept for the product (no units: forgets it). */
export const rememberUnits = (productId: number, units: NewProductUnit[]) => {
  try {
    if (units.length === 0) localStorage.removeItem(key(productId));
    else localStorage.setItem(key(productId), JSON.stringify(units));
  } catch {
    // Storage full or blocked: the codes are then scanned again on resubmission
  }
};

/** A stock change: units built are added, units taken out (by code) dropped. */
export const updateRememberedUnits = (productId: number, added: NewProductUnit[] = [], removedCodes: string[] = []) => {
  const removed = new Set(removedCodes);
  rememberUnits(productId, [...rememberedUnits(productId).filter((unit) => !removed.has(unit.barcode)), ...added]);
};

/**
 * Kept units fitted to the product's components now: parts of components no longer in it are dropped, and a
 * component's pieces are cut to its quantity (the components may have changed after the rejection).
 */
export const fitToComponents = (units: NewProductUnit[], components: UnitComponent[]): NewProductUnit[] =>
  units.map((unit) => ({
    barcode: unit.barcode,
    parts: components.map((component) => ({
      itemId: component.itemId,
      barcodes: (unit.parts.find((part) => part.itemId === component.itemId)?.barcodes ?? []).slice(0, component.quantity),
    })),
  }));
