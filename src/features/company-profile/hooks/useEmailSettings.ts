import { useCallback, useEffect, useState } from 'react';
import { emailSettingsApi } from '../api/emailSettingsApi';
import type { EmailSettings, EmailSettingsRequest } from '../types/emailSettings.types';
import { useAccess } from '../../../hooks/useAccess';
import { useApiAction } from '../../../hooks/useApiAction';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useNotify } from '../../../hooks/useNotify';

/** The mail server and sender of customer emails; loads only for Level 2 Super Admins (SYSTEM_SETTINGS_MANAGE). */
export const useEmailSettings = () => {
  const allowed = useAccess().can('SYSTEM_SETTINGS_MANAGE');
  const notify = useNotify();
  const beginRequest = useLatestRequest();
  const save = useApiAction();
  const test = useApiAction();
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!allowed) return;
    const isCurrent = beginRequest();
    setIsLoading(true);
    try {
      const res = await emailSettingsApi.get();
      if (!isCurrent()) return;
      if (res.success && res.data) setSettings(res.data);
      else notify.error(res, 'Email settings could not be loaded.');
    } catch (err: unknown) {
      if (isCurrent()) notify.error(err, 'Email settings could not be loaded.');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [allowed, beginRequest, notify]);

  useEffect(() => {
    reload();
  }, [reload]);

  const update = useCallback(
    (payload: EmailSettingsRequest) =>
      save.run(
        async () => {
          const res = await emailSettingsApi.update(payload);
          if (res.success && res.data) setSettings(res.data);
          return res;
        },
        { success: 'Email settings saved.', failure: 'Email settings could not be saved.' }
      ),
    [save]
  );

  const sendTest = useCallback(
    (to: string) => test.run(() => emailSettingsApi.sendTest(to.trim()), { success: 'Test email sent.', failure: 'The test email could not be sent.' }),
    [test]
  );

  return { allowed, settings, isLoading, isSaving: save.isSubmitting, isTesting: test.isSubmitting, reload, update, sendTest };
};
