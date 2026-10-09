import { useCallback, useState } from 'react';
import { dropWarrantyErrors } from '../../item-management/utils/itemWarranty';
import type { WarrantyEditorChange } from '../../item-management/components/ItemWarrantiesEditor';
import { syncItemWarranties, type ProductWarrantyFormItem } from '../utils/warrantyForm';
import type { ComponentFormRow } from '../utils/componentForm';

type SetErrors = React.Dispatch<React.SetStateAction<Record<string, string>>>;

/**
 * Product warranty cards for the create/edit forms, kept in step with the selected components:
 * when a component's item (and its warranties) loads, its warranties are copied in as product
 * warranties; changing or removing that item takes its copies away again. Copies the admin
 * removed by hand stay removed.
 */
export const useProductWarranties = (components: ComponentFormRow[], setFieldErrors: SetErrors) => {
  const [warranties, setWarranties] = useState<ProductWarrantyFormItem[]>([]);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

  // Re-sync whenever the component rows change (state adjusted during render, not in an effect).
  const [syncedRows, setSyncedRows] = useState(components);
  if (components !== syncedRows) {
    setSyncedRows(components);
    const next = syncItemWarranties(warranties, components, dismissed);
    if (next !== warranties) {
      setWarranties(next);
      // Cards were added/removed, so indexes in `warranties[i]` errors no longer line up.
      setFieldErrors((prev) => dropWarrantyErrors(prev, 'all'));
    }
  }

  const onChange: WarrantyEditorChange<ProductWarrantyFormItem> = (items, edited) => {
    const remaining = new Set(items.flatMap((w) => (w.source ? [w.source.key] : [])));
    const removed = warranties.flatMap((w) => (w.source && !remaining.has(w.source.key) ? [w.source.key] : []));
    if (removed.length) setDismissed((prev) => new Set([...prev, ...removed]));
    setWarranties(items);
    setFieldErrors((prev) => dropWarrantyErrors(prev, edited));
  };

  const reset = useCallback((items: ProductWarrantyFormItem[]) => {
    setWarranties(items);
    setDismissed(new Set());
  }, []);

  return { warranties, onChange, reset };
};
