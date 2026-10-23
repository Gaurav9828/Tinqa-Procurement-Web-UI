import React, { useMemo, useState } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import type { ProductResponse } from '../types/product.types';
import type { CostSheet } from '../types/costing.types';
import type { ComponentFormRow, SavedUnitCosts } from '../utils/componentForm';
import { toCostEntryRows, type CostEntryRow } from '../utils/productCosting';
import { useIncomeTaxRate, useProductProfit } from './useCosting';

/**
 * The costs of a product being edited: its saved cost sheet is loaded (PRODUCT_COST_VIEW) and, once it arrives, its
 * unit costs are filled into the component rows still without one and its extra costs into the cost rows.
 */
export const useEditCosts = (
  product: ProductResponse | null,
  setComponents: React.Dispatch<React.SetStateAction<ComponentFormRow[]>>
) => {
  const { can } = useAccess();
  const canSeeCosts = can('PRODUCT_COST_VIEW');
  const canEditCosts = canSeeCosts && can('PRODUCT_COST_EDIT');
  const incomeTaxRate = useIncomeTaxRate(product !== null);
  const { data } = useProductProfit(product?.id ?? null);
  const savedSheet: CostSheet | null = data?.productId === product?.id ? (data?.costSheet ?? null) : null;
  const savedCosts: SavedUnitCosts | undefined = useMemo(
    () => (savedSheet ? new Map(savedSheet.components.map((c) => [c.itemId, c.unitCost])) : undefined),
    [savedSheet]
  );
  const [costRows, setCostRows] = useState<CostEntryRow[]>([]);
  const [filledFrom, setFilledFrom] = useState<CostSheet | null>(null);
  if (savedSheet && savedCosts && filledFrom !== savedSheet) {
    // Adjusted during render (not in an effect) once the sheet arrives; costs already typed are kept
    setFilledFrom(savedSheet);
    setCostRows(toCostEntryRows(savedSheet.costEntries));
    setComponents((rows) => rows.map((row) => withSavedCost(row, savedCosts)));
  }
  return { canSeeCosts, canEditCosts, incomeTaxRate, savedSheet, savedCosts, costRows, setCostRows };
};

const withSavedCost = (row: ComponentFormRow, costs: SavedUnitCosts): ComponentFormRow => {
  const saved = row.itemId === null ? null : costs.get(row.itemId);
  return row.unitCost === '' && saved != null ? { ...row, unitCost: Number(saved).toFixed(2) } : row;
};
