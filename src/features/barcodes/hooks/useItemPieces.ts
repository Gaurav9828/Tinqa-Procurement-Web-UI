import { useEffect, useMemo, useRef, useState } from 'react';
import { barcodeApi } from '../api/barcodeApi';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify, type Notify } from '../../../hooks/useNotify';

type Pieces = Record<number, string[]>;

// One item's pieces in stock, added to `pieces` once loaded
const loadPieces = async (itemId: number, setPieces: (update: (prev: Pieces) => Pieces) => void, notify: Notify): Promise<boolean> => {
  try {
    const res = await barcodeApi.forItem(itemId);
    if (!res.success) return false;
    const codes = (res.data ?? []).map((unit) => unit.code);
    setPieces((prev) => ({ ...prev, [itemId]: codes }));
    return true;
  } catch (err: unknown) {
    notify.error(err, 'The pieces in stock could not be loaded; scan their barcodes instead.');
    return false;
  }
};

/**
 * The barcodes of the pieces in stock of each item (oldest first), so a product unit's parts can be picked instead of
 * scanned one by one. Loaded once per item while `enabled`, for holders of BARCODE_VIEW only. Scanning still works
 * without it.
 */
export const useItemPieces = (itemIds: number[], enabled: boolean) => {
  const { can } = useAccess();
  const allowed = enabled && can('BARCODE_VIEW');
  const notify = useNotify();
  const [pieces, setPieces] = useState<Pieces>({});
  // Items already asked for, so each is loaded once
  const requested = useRef(new Set<number>());
  // A stable key, so a new array with the same items doesn't reload them
  const key = useMemo(() => [...new Set(itemIds)].sort((a, b) => a - b).join(','), [itemIds]);

  useEffect(() => {
    if (!allowed || !key) return;
    const missing = key.split(',').map(Number).filter((itemId) => !requested.current.has(itemId));
    for (const itemId of missing) {
      requested.current.add(itemId);
      void loadPieces(itemId, setPieces, notify).then((ok) => ok || requested.current.delete(itemId));
    }
  }, [allowed, key, notify]);

  return pieces;
};
