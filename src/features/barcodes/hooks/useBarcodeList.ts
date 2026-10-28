import { useCallback, useEffect, useState } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import type { ApiResponse } from '../../../types/common.types';

/**
 * Loads a barcode list once `key` is set (null = nothing to load), for holders of BARCODE_VIEW only: others never
 * send the request. `refresh` loads it again (after a change); the list shown meanwhile stays.
 */
export const useBarcodeList = <T,>(key: number | null, load: (key: number) => Promise<ApiResponse<T[]>>, what: string) => {
  const { can } = useAccess();
  const allowed = can('BARCODE_VIEW');
  const notify = useNotify();
  // What was loaded, for which key and load: loading is "the answer shown isn't for what was asked"
  const [loaded, setLoaded] = useState<{ key: number; version: number; data: T[] } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!allowed || key === null) return;
    let current = true;
    const done = (data: T[]) => current && setLoaded({ key, version, data });
    load(key).then(
      (res) => {
        if (!res.success && current) notify.error(res, `The ${what} could not be loaded.`);
        done(res.success && Array.isArray(res.data) ? res.data : []);
      },
      (err: unknown) => {
        if (current) notify.error(err, `The ${what} could not be loaded.`);
        done([]);
      }
    );
    return () => {
      current = false;
    };
  }, [allowed, key, version, load, notify, what]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const isCurrent = loaded !== null && loaded.key === key;
  return {
    allowed,
    data: isCurrent ? loaded.data : [],
    isLoading: allowed && key !== null && (!isCurrent || loaded.version !== version),
    refresh,
  };
};
