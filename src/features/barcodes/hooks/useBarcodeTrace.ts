import { useCallback, useState } from 'react';
import axios from 'axios';
import { barcodeApi } from '../api/barcodeApi';
import type { BarcodeTrace } from '../types/barcode.types';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';
import { isValidBarcode, normalizeBarcode } from '../utils/barcode';

/**
 * Traces one barcode on demand (a scan or Enter, never while typing). Codes already traced are answered from memory
 * until `refresh` (after a change to a barcode).
 */
export const useBarcodeTrace = () => {
  const notify = useNotify();
  const begin = useLatestRequest();
  const [trace, setTrace] = useState<BarcodeTrace | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cache] = useState(() => new Map<string, BarcodeTrace>());

  const lookUp = useCallback(
    async (raw: string, fresh = false): Promise<void> => {
      const code = normalizeBarcode(raw);
      if (!isValidBarcode(code)) {
        notify.error(`${code || 'That'} is not a valid barcode.`);
        return;
      }
      const cached = fresh ? undefined : cache.get(code);
      if (cached) {
        setTrace(cached);
        setNotFound(null);
        return;
      }
      const isCurrent = begin();
      setIsLoading(true);
      try {
        const res = await barcodeApi.trace(code);
        if (!isCurrent()) return;
        if (res.success && res.data) {
          cache.set(code, res.data);
          setTrace(res.data);
          setNotFound(null);
        } else {
          notify.error(res, 'The barcode could not be traced.');
        }
      } catch (err: unknown) {
        if (!isCurrent()) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setTrace(null);
          setNotFound(code);
        } else {
          notify.error(err, 'The barcode could not be traced.');
        }
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
    },
    [begin, cache, notify]
  );

  /** Forgets every traced code and traces the shown one again (by its current code). */
  const refresh = useCallback(
    async (code?: string) => {
      cache.clear();
      const current = code ?? trace?.unit.code;
      if (current) await lookUp(current, true);
    },
    [cache, lookUp, trace]
  );

  return { trace, notFound, isLoading, lookUp, refresh };
};
