import { useCallback, useEffect, useState } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { getApiErrorCode } from '../../../utils/apiError';
import { careersApi } from '../api/careersApi';

const PURGED = 'CAREER_RESUME_PURGED';

/**
 * The résumé PDF (GET /applications/{id}/resume, CAREER_APPLICATION_VIEW), fetched as a blob through the authenticated
 * client the way voucher documents are, only once `enabled` (the preview is opened). Once loaded it is kept while the
 * page is open, so closing and opening the preview again costs nothing. The object URL feeds the preview iframe and
 * the download, and is revoked when the application changes or the page closes.
 */
export const useResumeFile = (applicationId: number, enabled: boolean) => {
  const allowed = useAccess().can('CAREER_APPLICATION_VIEW');
  const notify = useNotify();
  const [state, setState] = useState<{ id: number; url: string | null; failed: boolean; purged: boolean } | null>(null);
  const current = state?.id === applicationId ? state : null;
  // Latched per application: opened once, loaded once
  const [wantedFor, setWantedFor] = useState<number | null>(null);
  if (enabled && wantedFor !== applicationId) setWantedFor(applicationId);
  const wanted = wantedFor === applicationId;

  useEffect(() => {
    if (!allowed || !wanted) return;
    let alive = true;
    let url: string | null = null;
    careersApi
      .resume(applicationId)
      .then((blob) => {
        if (!alive) return;
        url = window.URL.createObjectURL(blob);
        setState({ id: applicationId, url, failed: false, purged: false });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const purged = getApiErrorCode(err) === PURGED;
        if (!purged) notify.error(err, 'The résumé could not be loaded.');
        setState({ id: applicationId, url: null, failed: true, purged });
      });
    return () => {
      alive = false;
      if (url) window.URL.revokeObjectURL(url);
    };
  }, [allowed, wanted, applicationId, notify]);

  /** Saves the PDF under the applicant's file name, from the loaded copy. */
  const download = useCallback(
    (fileName: string) => {
      if (!current?.url) return;
      const link = window.document.createElement('a');
      link.href = current.url;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    },
    [current]
  );

  return {
    url: current?.url ?? null,
    isLoading: allowed && wanted && !current,
    failed: current?.failed ?? false,
    purged: current?.purged ?? false,
    download,
  };
};
