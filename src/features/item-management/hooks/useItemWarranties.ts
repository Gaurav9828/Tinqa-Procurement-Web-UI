import { useCallback, useEffect, useState } from 'react';
import { itemApi } from '../api/itemApi';
import type { ItemWarrantyResponse } from '../types/item.types';
import { getApiErrorMessage } from '../../../utils/apiError';

interface Loaded {
  itemId: number | null;
  version: number;
  warranties: ItemWarrantyResponse[];
  error: string | null;
}

/**
 * Warranties of one item via GET /v1/admin/items/{id}/warranties (inactive included).
 * For flows that pick an item and need to show what comes with it (e.g. product creation).
 * Pass null to clear. Errors are returned (not toasted) so the caller can show them inline.
 */
export const useItemWarranties = (itemId: number | null) => {
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded>({ itemId: null, version: 0, warranties: [], error: null });

  useEffect(() => {
    if (itemId === null) return;
    let active = true;
    itemApi
      .getItemWarranties(itemId)
      .then((res) => {
        if (!active) return;
        setLoaded({
          itemId,
          version,
          warranties: res.success && Array.isArray(res.data) ? res.data : [],
          error: res.success ? null : res.message || 'Failed to load item warranties.',
        });
      })
      .catch((err: unknown) => {
        if (active) setLoaded({ itemId, version, warranties: [], error: getApiErrorMessage(err, 'Failed to load item warranties.') });
      });
    return () => {
      active = false;
    };
  }, [itemId, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const isCurrent = itemId !== null && loaded.itemId === itemId && loaded.version === version;

  return {
    warranties: isCurrent ? loaded.warranties : [],
    isLoading: itemId !== null && !isCurrent,
    error: isCurrent ? loaded.error : null,
    reload,
  };
};
