import { useCallback, useEffect, useMemo, useState } from 'react';
import { barcodeApi } from '../../barcodes/api/barcodeApi';
import { fetchItemAvailableUnits } from '../utils/componentStock';
import { useAccess } from '../../../hooks/useAccess';
import type { StockDraftComponent } from '../types/stockDraft.types';
import { unitLimit } from '../utils/stockEntryGrid';
import { getApiErrorMessage } from '../../../utils/apiError';

interface Loaded {
  key: string;
  available: Record<number, number>;
  pieces: Record<number, string[]>;
}

const loadItem = async (itemId: number) => {
  const [available, res] = await Promise.all([fetchItemAvailableUnits(itemId), barcodeApi.forItem(itemId)]);
  if (!res.success) throw res;
  return { itemId, available, codes: (res.data ?? []).map((unit) => unit.code) };
};

/**
 * What the components in stock allow a stock entry to build, and the barcodes of each component's pieces in stock
 * (offered in its cells). Two calls per component, once per opening: its item stock (STOCK_VIEW) and its pieces in
 * stock (BARCODE_VIEW). Without either permission nothing is loaded and the limit is unknown.
 */
export const useComponentLimit = (components: StockDraftComponent[], enabled: boolean) => {
  const { can } = useAccess();
  const permitted = can('STOCK_VIEW') && can('BARCODE_VIEW');
  const allowed = enabled && permitted && components.length > 0;
  const key = useMemo(() => components.map((c) => c.itemId).sort((a, b) => a - b).join(','), [components]);
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    Promise.all(key.split(',').map(Number).map(loadItem))
      .then((items) => {
        if (!active) return;
        setLoaded({
          key,
          available: Object.fromEntries(items.map((item) => [item.itemId, item.available])),
          pieces: Object.fromEntries(items.map((item) => [item.itemId, item.codes])),
        });
        setFailed(null);
      })
      .catch((err: unknown) => {
        if (active) setFailed({ key, message: getApiErrorMessage(err, "Couldn't check the components in stock.") });
      });
    return () => {
      active = false;
    };
  }, [allowed, key, version]);

  const retry = useCallback(() => {
    setFailed(null);
    setVersion((v) => v + 1);
  }, []);

  const current = loaded?.key === key ? loaded : null;
  const limit = useMemo(() => (current ? unitLimit(components, current.available, current.pieces) : null), [current, components]);
  const error = failed?.key === key ? failed.message : null;

  // Units are built from components: a product without any can't be stocked
  const noComponents = components.length === 0;
  return {
    noComponents,
    /** The most units the entry may hold: 0 when none can be built, null while not known. */
    maxUnits: noComponents ? 0 : limit?.max ?? null,
    permitted,
    limit,
    pieces: current?.pieces ?? {},
    isLoading: allowed && !current && !error,
    error,
    retry,
  };
};
