import { useCallback, useEffect, useState } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import type { ApiResponse } from '../../../types/common.types';
import { costingApi } from '../api/costingApi';
import type { OrderProfit, ProductProfit, ProfitSummary } from '../types/costing.types';

let cachedTaxRate: number | undefined;

/**
 * The income tax rate profit after tax is worked out with, once per session. Null until loaded, while `enabled` is
 * false (e.g. a closed form), and for anyone without PRODUCT_COST_VIEW: nothing is asked for then.
 */
export const useIncomeTaxRate = (enabled = true): number | null => {
  const { can } = useAccess();
  const allowed = can('PRODUCT_COST_VIEW');
  const [rate, setRate] = useState<number | null>(cachedTaxRate ?? null);
  useEffect(() => {
    if (!allowed || !enabled || cachedTaxRate !== undefined) return;
    let alive = true;
    costingApi
      .getSettings()
      .then((res) => {
        if (!res.success || !res.data) return;
        cachedTaxRate = Number(res.data.incomeTaxRate);
        if (alive) setRate(cachedTaxRate);
      })
      .catch(() => {
        // The preview then stops at profit before tax
      });
    return () => {
      alive = false;
    };
  }, [allowed, enabled]);
  return allowed ? (rate ?? cachedTaxRate ?? null) : null;
};

/** Test hook: forget the session's tax rate. */
export const resetCostingCache = () => {
  cachedTaxRate = undefined;
};

interface Loaded<T> {
  /** What was loaded (the view's key) and which load it was (key + revision + retry). */
  key: string;
  load: string;
  data: T | null;
  failed: boolean;
}

/**
 * Loads one costing view when `key` is set and the user holds PRODUCT_COST_VIEW; errors go to the global alert. A new
 * `revision` reloads it, keeping the figures on screen until the new ones arrive.
 */
const useCostingView = <T,>(key: string | null, revision: string, load: () => Promise<ApiResponse<T>>, failure: string) => {
  const { can } = useAccess();
  const notify = useNotify();
  const allowed = can('PRODUCT_COST_VIEW');
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [retries, setRetries] = useState(0);
  const loadId = `${key}#${revision}#${retries}`;

  useEffect(() => {
    if (!allowed || key === null) return;
    let alive = true;
    load()
      .then((res) => {
        if (!res.success) throw res;
        if (alive) setLoaded({ key, load: loadId, data: res.data, failed: false });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setLoaded({ key, load: loadId, data: null, failed: true });
        notify.error(err, failure);
      });
    return () => {
      alive = false;
    };
    // `load` is rebuilt every render; `loadId` identifies what it loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, loadId]);

  const reload = useCallback(() => setRetries((n) => n + 1), []);
  const active = allowed && key !== null;
  const current = active && loaded?.key === key ? loaded : null;
  return {
    allowed,
    data: current?.data ?? null,
    isLoading: active && loaded?.load !== loadId,
    loadFailed: !!current?.failed && current.load === loadId,
    reload,
  };
};

export const useProductProfit = (productId: number | null) =>
  useCostingView<ProductProfit>(
    productId === null ? null : `product-${productId}`,
    '',
    () => costingApi.getProductProfit(productId as number),
    'Could not load the product’s costs and profit.'
  );

/** `revision` changes whenever the order does (status, refunds), so the profit is reloaded with it. */
export const useOrderProfit = (orderNumber: string | null, revision = '') =>
  useCostingView<OrderProfit>(
    orderNumber ? `order-${orderNumber}` : null,
    revision,
    () => costingApi.getOrderProfit(orderNumber as string),
    'Could not load the order’s profit.'
  );

export const useProfitSummary = (from: string, to: string) =>
  useCostingView<ProfitSummary>(`${from}..${to}`, '', () => costingApi.getProfitSummary(from, to), 'Could not load product profit.');
