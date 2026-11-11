import { useCallback, useEffect, useRef, useState } from 'react';
import { orderTrackingApi } from '../api/orderTrackingApi';
import { useNotify } from '../../../hooks/useNotify';

/**
 * Emails the customer a new delivery code when they ask the delivery partner for it (the old code stops working).
 * Riders use their own route (`riderRoute`). After a send, the button waits as long as the server asks (a minute)
 * before another code can be sent. Nothing is loaded until the button is pressed.
 */
export const useDeliveryCodeResend = (orderNumber: string, { riderRoute }: { riderRoute: boolean }) => {
  const [isSending, setIsSending] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const inFlight = useRef(false);
  const notify = useNotify();

  // Counts the wait down once a second; stops at zero
  useEffect(() => {
    if (waitSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setWaitSeconds((left) => Math.max(0, left - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [waitSeconds]);

  const resend = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setIsSending(true);
    try {
      const res = await orderTrackingApi.resendDeliveryCode(orderNumber, riderRoute);
      if (!res.success) {
        notify.error(res, 'The delivery code could not be sent.');
        return false;
      }
      notify.success(`A new delivery code was emailed to ${res.data.sentTo}. Ask the customer to use the newest email.`);
      setWaitSeconds(res.data.resendAfterSeconds);
      return true;
    } catch (err: unknown) {
      notify.error(err, 'The delivery code could not be sent.');
      return false;
    } finally {
      inFlight.current = false;
      setIsSending(false);
    }
  }, [orderNumber, riderRoute, notify]);

  return { resend, isSending, waitSeconds };
};
