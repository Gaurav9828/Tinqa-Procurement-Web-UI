import { useCallback, useState } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import { useNotify } from '../../../hooks/useNotify';
import { careersApi } from '../api/careersApi';
import type { CareersSettings } from '../types/careers.types';
import { useRecord } from './useCareerLoaders';

/**
 * Whether the website shows the Careers tab. Everyone who sees openings sees the switch's state; only a Super Admin
 * (STOREFRONT_FEATURE_TOGGLE, Level 2) flips it, both ways.
 */
export const useCareersSettings = () => {
  const { can } = useAccess();
  const notify = useNotify();
  const settings = useRecord(careersApi.settings, can('CAREER_OPENING_VIEW'), 'The Careers tab setting could not be loaded.');
  const [isSaving, setIsSaving] = useState(false);
  const { replace } = settings;

  const setEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      setIsSaving(true);
      try {
        const res = await careersApi.updateSettings(enabled);
        if (!res.success || !res.data) {
          notify.error(res, 'The Careers tab could not be changed.');
          return false;
        }
        notify.success(res.message || (enabled ? 'The Careers tab is back on the website.' : 'The Careers tab is hidden.'));
        replace(res.data as CareersSettings);
        return true;
      } catch (err: unknown) {
        notify.error(err, 'The Careers tab could not be changed.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [notify, replace]
  );

  return { settings: settings.data, isLoading: settings.isLoading, canToggle: can('STOREFRONT_FEATURE_TOGGLE'), isSaving, setEnabled };
};
