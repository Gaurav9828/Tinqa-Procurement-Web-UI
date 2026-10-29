import { useCallback, useEffect, useState } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import type { Permission } from '../../../config/access';
import {
  approvalSummaryApi,
  ECOMMERCE_QUEUES,
  PROCUREMENT_QUEUES,
  type ApprovalCounts,
  type ApprovalQueueName,
} from '../services/approvalSummaryApi';

const decidesAny = (queues: Record<string, readonly Permission[]>, canAll: (...p: Permission[]) => boolean) =>
  Object.values(queues).some((required) => canAll(...required));

/**
 * Every Approvals Hub badge in at most two calls (one per backend, each skipped when none of its queues is the
 * user's). Silent on failure: a badge just stays hidden, and the tab's own list reports errors. `refresh` after a
 * decision or when switching tabs.
 */
export const useApprovalSummary = () => {
  const { canAll } = useAccess();
  const withProcurement = decidesAny(PROCUREMENT_QUEUES, canAll);
  const withEcommerce = decidesAny(ECOMMERCE_QUEUES, canAll);
  const [counts, setCounts] = useState<ApprovalCounts>({});
  // `version` asks for a fresh load
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!withProcurement && !withEcommerce) return;
    let current = true;
    Promise.all([
      withProcurement ? approvalSummaryApi.procurement().catch(() => ({})) : {},
      withEcommerce ? approvalSummaryApi.ecommerce().catch(() => ({})) : {},
    ]).then(([procurement, ecommerce]) => {
      if (current) setCounts({ ...procurement, ...ecommerce });
    });
    return () => {
      current = false;
    };
  }, [withProcurement, withEcommerce, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  /** The waiting total of the given queues (0 for queues the user doesn't decide). */
  const count = useCallback(
    (...queues: ApprovalQueueName[]) => queues.reduce((total, queue) => total + (counts[queue] ?? 0), 0),
    [counts]
  );

  return { counts, count, refresh };
};
