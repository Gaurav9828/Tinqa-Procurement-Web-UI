import { useCallback, useEffect, useRef, useState } from 'react';
import { storeSaleApi } from '../api/storeSaleApi';
import type { StoreUnit } from '../types/storeSale.types';
import { isValidBarcode, normalizeBarcode } from '../../barcodes/utils/barcode';
import { useAccess } from '../../../hooks/useAccess';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { useSearchTerm } from '../../../hooks/useSearchTerm';

/**
 * The product search box also takes a unit's barcode (scanned or typed). Only text shaped like a barcode that matches
 * no product name is looked up: once typing pauses, or at once on Enter (scanners send Enter). Codes already looked up
 * are answered from memory, so scanning the same unit again calls nothing.
 */
export const useUnitLookup = (raw: string, enabled: boolean) => {
  const allowed = useAccess().can('STORE_ORDER_CREATE');
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const { term, flush } = useSearchTerm(raw);
  const found = useRef(new Map<string, StoreUnit>());
  const [unit, setUnit] = useState<StoreUnit | null>(null);
  const [lookingUp, setLookingUp] = useState('');

  const typed = normalizeBarcode(raw);
  const wanted = allowed && enabled && isValidBarcode(term) ? normalizeBarcode(term) : '';

  const lookup = useCallback(async (code: string) => {
    const known = found.current.get(code);
    if (known) {
      setUnit(known);
      return;
    }
    const isCurrent = beginRequest();
    setLookingUp(code);
    try {
      const res = await storeSaleApi.lookupUnit(code);
      if (!isCurrent()) return;
      if (res.success && res.data) {
        found.current.set(code, res.data);
        setUnit(res.data);
      } else notify.error(res, `Barcode ${code} could not be looked up.`);
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, `Barcode ${code} could not be looked up.`);
    } finally {
      if (isCurrent()) setLookingUp('');
    }
  }, [beginRequest, notify]);

  useEffect(() => {
    if (wanted) lookup(wanted);
  }, [wanted, lookup]);

  return {
    /** The unit on the barcode in the box now (null while it is typed, looked up or unknown). */
    unit: unit && wanted && unit.barcode === typed ? unit : null,
    isLookingUp: !!lookingUp && lookingUp === typed,
    /** Enter in the box: look the barcode up now. */
    flush,
  };
};
