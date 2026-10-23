import { useCallback, useState } from 'react';
import { useNotify } from '../../../hooks/useNotify';

/**
 * Opens or saves a payslip PDF fetched through the authenticated client. `fetch(download)` asks the server for it
 * (it renders the payslip on every request); `name` is the file name when saving.
 */
export const usePayslipFile = () => {
  const notify = useNotify();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const open = useCallback(
    async (key: string, fetch: (download: boolean) => Promise<Blob>, name: string, download: boolean) => {
      setBusyKey(key);
      // Opened before the request, so the browser doesn't treat it as an unrequested pop-up
      const viewer = download ? null : window.open('', '_blank');
      try {
        const blob = await fetch(download);
        const url = window.URL.createObjectURL(blob);
        if (viewer) {
          viewer.location.href = url;
        } else {
          const link = window.document.createElement('a');
          link.href = url;
          link.download = name;
          window.document.body.appendChild(link);
          link.click();
          link.remove();
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      } catch (err: unknown) {
        viewer?.close();
        notify.error(err, 'The payslip could not be opened.');
      } finally {
        setBusyKey(null);
      }
    },
    [notify]
  );

  return { open, busyKey };
};
