import { useCallback, useState } from 'react';
import { useNotify } from '../../../hooks/useNotify';
import { ROLE_GUIDES, type GuideRoleId } from '../content/guideContent';

/** Downloads one role's guide (or the whole guide) as a PDF and reports the outcome through the global alert. */
export const useGuideDownload = () => {
  const notify = useNotify();
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(
    async (role: GuideRoleId | null) => {
      setIsDownloading(true);
      try {
        const { downloadGuidePdf } = await import('../pdf/exportGuidePdf');
        await downloadGuidePdf(role);
        notify.success(role ? `${ROLE_GUIDES[role].name} guide downloaded.` : 'Full user guide downloaded.');
      } catch (err: unknown) {
        notify.error(err, 'The guide could not be created.');
      } finally {
        setIsDownloading(false);
      }
    },
    [notify]
  );

  return { download, isDownloading };
};
