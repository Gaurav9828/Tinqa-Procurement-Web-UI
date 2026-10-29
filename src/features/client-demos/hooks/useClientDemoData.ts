import { useCallback, useEffect, useState } from 'react';
import { clientDemoApi } from '../api/clientDemoApi';
import type { ApiResponse } from '../../../types/common.types';
import type { DemoDetail, DemoMode, DemoStatus, DemoSummary, DemoUnitOption, StaffMember } from '../types/clientDemo.types';
import { useNotify } from '../../../hooks/useNotify';
import { useAccess } from '../../../hooks/useAccess';

/**
 * Loads one resource whenever its inputs (or `refresh`) change; an older answer never overwrites a newer one. Nothing is
 * asked for without its permission (`enabled`).
 */
const useLoad = <T,>(load: () => Promise<ApiResponse<T>>, enabled: boolean, failure: string, quiet = false) => {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ data: T | null; failed: boolean; load: unknown; version: number }>({
    data: null,
    failed: false,
    load: null,
    version: -1,
  });
  const notify = useNotify();

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    const settle = (data: T | null, failed: boolean) => setResult((prev) => ({ data: failed ? prev.data : data, failed, load, version }));
    load()
      .then((res) => {
        if (!current) return;
        if (!res.success && !quiet) notify.error(res, failure);
        settle(res.data, !res.success);
      })
      .catch((err: unknown) => {
        if (!current) return;
        if (!quiet) notify.error(err, failure);
        settle(null, true);
      });
    return () => {
      current = false;
    };
  }, [enabled, load, version, notify, failure, quiet]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const isLoading = enabled && (result.load !== load || result.version !== version);
  // A fresh answer replaces the shown data at once, so a mutation's response can be shown without a reload
  const replace = useCallback((data: T) => setResult((prev) => ({ ...prev, data })), []);
  return { data: result.data, isLoading, loadFailed: result.failed, refresh, replace };
};

/** GET /v1/admin/client-demos (DEMO_VIEW): visits starting in [from, to], in one status or all. */
export const useDemoList = (from: string, to: string, status: DemoStatus | null) => {
  const { can } = useAccess();
  const load = useCallback(() => clientDemoApi.list({ from, to, status: status ? [status] : undefined }), [from, to, status]);
  return useLoad<DemoSummary[]>(load, can('DEMO_VIEW'), 'The client demos could not be loaded.');
};

/** GET /v1/client-demos/mine (DEMO_VIEW_OWN). */
export const useMyDemos = () => {
  const { can } = useAccess();
  return useLoad<DemoSummary[]>(clientDemoApi.mine, can('DEMO_VIEW_OWN'), 'Your client demos could not be loaded.');
};

/**
 * GET …/waiting (DEMO_APPROVE): the Approvals Hub queue, loaded while its tab is open (`enabled`). Quiet: the hub shows
 * its own empty state.
 */
export const useWaitingDemos = (enabled = true) => {
  const { can } = useAccess();
  return useLoad<DemoSummary[]>(clientDemoApi.waiting, can('DEMO_APPROVE') && enabled, 'Client demos awaiting approval could not be loaded.', true);
};

/** One demo, as a manager (DEMO_VIEW) or as attending staff (DEMO_VIEW_OWN); nothing while there is no id. */
export const useDemo = (mode: DemoMode, id: number | null) => {
  const { can } = useAccess();
  const load = useCallback(() => clientDemoApi.get(mode, id ?? 0), [mode, id]);
  const allowed = mode === 'manager' ? can('DEMO_VIEW') : can('DEMO_VIEW_OWN');
  return useLoad<DemoDetail>(load, allowed && id !== null, 'The client demo could not be loaded.');
};

/** GET …/staff (DEMO_MANAGE): employees who can be tagged as attending staff. */
export const useDemoStaffOptions = () => {
  const { can } = useAccess();
  return useLoad<StaffMember[]>(clientDemoApi.staff, can('DEMO_MANAGE'), 'The staff list could not be loaded.');
};

/**
 * GET …/units (DEMO_MANAGE): a product's units in stock and whether each can be picked for the demo's days, loaded only
 * while its unit list is open (`enabled`).
 */
export const useDemoUnitOptions = (productId: number, startDate: string, days: number, demoId: number | null, enabled: boolean) => {
  const { can } = useAccess();
  const load = useCallback(() => clientDemoApi.unitOptions(productId, startDate, days, demoId), [productId, startDate, days, demoId]);
  return useLoad<DemoUnitOption[]>(load, can('DEMO_MANAGE') && enabled && startDate !== '', 'The product’s units could not be loaded.');
};
