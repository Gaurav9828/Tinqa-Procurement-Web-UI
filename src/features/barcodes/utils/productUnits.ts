import type { NewProductUnit } from '../types/barcode.types';
import { barcodeListError, isValidBarcode, repeatedAcrossUnits } from './barcode';

/** A component of the product's bill of materials: pieces of one item in each unit. */
export interface UnitComponent {
  itemId: number;
  itemName: string;
  quantity: number;
}

/** The bill of materials of chosen components (rows still being filled in are left out). */
export const toUnitComponents = (
  rows: { itemId: number | null; itemName: string; quantity: string | number }[]
): UnitComponent[] =>
  rows
    .filter((row) => row.itemId !== null && Number.isInteger(Number(row.quantity)) && Number(row.quantity) > 0)
    .map((row) => ({ itemId: row.itemId as number, itemName: row.itemName, quantity: Number(row.quantity) }));

/** `count` units, keeping what was already entered for the first ones and one parts list per component. */
export const resizeUnits = (units: NewProductUnit[], count: number, components: UnitComponent[]): NewProductUnit[] =>
  Array.from({ length: Math.max(0, count) }, (_, i) => {
    const unit = units[i];
    return {
      barcode: unit?.barcode ?? '',
      parts: components.map((component) => ({
        itemId: component.itemId,
        barcodes: unit?.parts.find((part) => part.itemId === component.itemId)?.barcodes ?? [],
      })),
    };
  });

/** The first thing missing or wrong in the units (null when they can be sent), as the backends check them. */
// What one unit still lacks: its own barcode, or the right pieces of each component
const unitProblem = (unit: NewProductUnit, label: string, components: UnitComponent[]): string | null => {
  if (!unit.barcode) return `${label} needs its own barcode.`;
  if (!isValidBarcode(unit.barcode)) return `${label}'s barcode ${unit.barcode} is not valid.`;
  for (const component of components) {
    const codes = unit.parts.find((part) => part.itemId === component.itemId)?.barcodes ?? [];
    const problem = barcodeListError(codes, component.quantity, `${component.itemName} piece`);
    if (problem) return `${label}: ${problem}`;
  }
  return null;
};

export const unitsProblem = (units: NewProductUnit[], count: number, components: UnitComponent[]): string | null => {
  if (units.length !== count) return `Enter the barcodes of ${count} unit${count === 1 ? '' : 's'}.`;
  for (let i = 0; i < units.length; i++) {
    const problem = unitProblem(units[i], count === 1 ? 'The unit' : `Unit ${i + 1}`, components);
    if (problem) return problem;
  }
  const repeated = repeatedAcrossUnits(units);
  return repeated ? `${repeated} is used more than once: every unit and piece has its own barcode.` : null;
};

/** Every code entered in the units, for refusing the same code twice. */
export const codesIn = (units: NewProductUnit[]): string[] =>
  units.flatMap((unit) => [unit.barcode, ...unit.parts.flatMap((part) => part.barcodes)]).filter(Boolean);
