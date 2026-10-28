import { useCallback, useState } from 'react';
import { clientDemoApi } from '../api/clientDemoApi';
import type { DemoMode } from '../types/clientDemo.types';
import { useNotify } from '../../../hooks/useNotify';

/** Saves a bill's invoice or ticket, fetched through the authenticated client. */
export const useInvoiceFile = (mode: DemoMode) => {
  const notify = useNotify();
  const [busyId, setBusyId] = useState<number | null>(null);

  const download = useCallback(
    async (demoId: number, expenseId: number, name: string) => {
      setBusyId(expenseId);
      try {
        const blob = await clientDemoApi.invoice(mode, demoId, expenseId);
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = name;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      } catch (err: unknown) {
        notify.error(err, 'The invoice could not be downloaded.');
      } finally {
        setBusyId(null);
      }
    },
    [mode, notify]
  );

  return { download, busyId };
};
