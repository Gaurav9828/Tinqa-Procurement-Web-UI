import { useCallback, useEffect, useState } from 'react';
import type { ApiResponse } from '../../../types/common.types';
import { useNotify } from '../../../hooks/useNotify';

/**
 * One Approvals Hub queue's list, loaded only while `enabled` (its tab is open and the user may call its endpoint).
 * `reload` reads it again after a decision; nothing else is reloaded with it.
 */
export const useQueueList = <T,>(enabled: boolean, load: () => Promise<ApiResponse<T[]>>, failure: string) => {
  const notify = useNotify();
  const [items, setItems] = useState<T[] | null>(null);
  const [round, setRound] = useState(0);
  const reload = useCallback(() => setRound((n) => n + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    load()
      .then((res) => {
        if (current) setItems(res.success ? res.data ?? [] : []);
      })
      .catch((err: unknown) => {
        if (!current) return;
        setItems([]);
        notify.error(err, failure);
      });
    return () => {
      current = false;
    };
    // load and failure are fixed per caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, round, notify]);
  return { items: enabled ? items : null, reload };
};
