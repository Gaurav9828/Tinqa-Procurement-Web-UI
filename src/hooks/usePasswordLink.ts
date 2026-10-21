import { useCallback, useEffect, useState } from 'react';
import { authService } from '../api/services/authService';
import { useApiAction } from './useApiAction';
import type { PasswordLinkInfo } from '../types/auth';
import { getApiErrorCode, getApiErrorMessages } from '../utils/apiError';

export type PasswordLinkStatus = 'checking' | 'valid' | 'invalid';

/**
 * The emailed password link a page was opened with: checks it once, then sets the chosen password through it.
 * A link that no longer works is reported on the page itself (with the reason), not as an alert.
 */
export const usePasswordLink = (token: string) => {
  const action = useApiAction();
  const [status, setStatus] = useState<PasswordLinkStatus>(token ? 'checking' : 'invalid');
  const [link, setLink] = useState<PasswordLinkInfo | null>(null);
  const [problem, setProblem] = useState<string>(token ? '' : 'This link is incomplete. Open it again from your email.');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    authService
      .checkPasswordLink(token)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setLink(res.data);
          setStatus('valid');
        } else {
          setProblem(res.message || 'This link is not valid.');
          setStatus('invalid');
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setExpired(getApiErrorCode(err) === 'PASSWORD_LINK_EXPIRED');
        setProblem(getApiErrorMessages(err, 'This link is not valid.')[0]);
        setStatus('invalid');
      });
    return () => {
      active = false;
    };
  }, [token]);

  const setPassword = useCallback(
    (newPassword: string, confirmNewPassword: string) =>
      action.run(() => authService.setPasswordFromLink({ token, newPassword, confirmNewPassword }), {
        success: 'Your password is saved. Sign in with your new password.',
        failure: 'Your password could not be saved.',
      }),
    [action, token]
  );

  return { status, link, problem, expired, isSaving: action.isSubmitting, setPassword };
};
