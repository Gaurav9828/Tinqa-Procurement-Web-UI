import { useCallback, useState } from 'react';
import { financeApi } from '../api/financeApi';
import type { VoucherDocument } from '../types/finance.types';
import { useNotify } from '../../../hooks/useNotify';

/** Downloads a voucher document through the authenticated client, under the name the server stored it as. */
export const useDocumentDownload = () => {
  const notify = useNotify();
  const [busyId, setBusyId] = useState<number | null>(null);

  const download = useCallback(
    async (voucherId: number, document: VoucherDocument) => {
      setBusyId(document.id);
      try {
        const blob = await financeApi.downloadDocument(voucherId, document);
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.fileName;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } catch (err: unknown) {
        notify.error(err, 'The file could not be downloaded.');
      } finally {
        setBusyId(null);
      }
    },
    [notify]
  );

  return { download, busyId };
};
