import { useCallback, useEffect, useState } from 'react';
import { useNotify } from './useNotify';
import { EMAIL_CODE_LENGTH, type EmailVerificationApi } from '../types/emailVerification.types';

export type EmailVerificationStage = 'idle' | 'sent' | 'verified';

const normalize = (email: string) => email.trim().toLowerCase();

/**
 * Proves an email address before an account is created with it: send a 5-digit code there, then check the code the
 * person reads out. The token it returns belongs to that exact address, so editing the email starts over. Outcomes
 * go through the global alert.
 *
 * @param email the address currently typed in the form
 * @param name  how the email greets them (optional)
 */
export const useEmailVerification = (api: EmailVerificationApi, email: string, name?: string) => {
  const notify = useNotify();
  const [stage, setStage] = useState<EmailVerificationStage>('idle');
  const [sentTo, setSentTo] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const current = normalize(email);
  // A code or verification is only good for the address it was made for: another address shows as not started
  const stale = stage !== 'idle' && sentTo !== current;

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = useCallback(async () => {
    if (!current) return;
    setIsSending(true);
    try {
      const res = await api.sendCode(current, name?.trim() || undefined);
      if (!res.success) {
        notify.error(res, 'The code could not be sent.');
        return;
      }
      notify.success(res.message || `A ${EMAIL_CODE_LENGTH}-digit code was emailed to ${current}.`);
      setSentTo(current);
      setToken(null);
      setStage('sent');
      setResendIn(res.data?.resendAfterSeconds ?? 60);
    } catch (err: unknown) {
      notify.error(err, 'The code could not be sent.');
    } finally {
      setIsSending(false);
    }
  }, [api, current, name, notify]);

  const confirmCode = useCallback(
    async (code: string): Promise<boolean> => {
      const typed = code.trim();
      if (!new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`).test(typed)) {
        notify.error(`Enter the ${EMAIL_CODE_LENGTH}-digit code from the email.`);
        return false;
      }
      setIsConfirming(true);
      try {
        const res = await api.confirmCode(current, typed);
        if (!res.success || !res.data?.verificationToken) {
          notify.error(res, 'The code could not be checked.');
          return false;
        }
        notify.success(res.message || 'Email address verified.');
        setToken(res.data.verificationToken);
        setStage('verified');
        return true;
      } catch (err: unknown) {
        notify.error(err, 'The code could not be checked.');
        return false;
      } finally {
        setIsConfirming(false);
      }
    },
    [api, current, notify]
  );

  const reset = useCallback(() => {
    setStage('idle');
    setToken(null);
    setSentTo('');
    setResendIn(0);
  }, []);

  return {
    stage: stale ? 'idle' : stage,
    /** The verification to send with the registration; null until the code is confirmed for the current email. */
    token: stale ? null : token,
    resendIn,
    isSending,
    isConfirming,
    sendCode,
    confirmCode,
    reset,
  };
};

export type EmailVerificationState = ReturnType<typeof useEmailVerification>;
