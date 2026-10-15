import { useCallback, useEffect, useRef, useState } from 'react';
import { isIndianPincode, lookupPincode, type PincodeLocation } from '../utils/pincode';

export type PincodeLookupStatus = 'idle' | 'loading' | 'found' | 'notFound' | 'error';

interface Options {
  /** False skips the lookup (e.g. a non-Indian address). */
  enabled?: boolean;
  /** Called once per successful lookup, with the PIN code it was for. */
  onFound?: (location: PincodeLocation, pincode: string) => void;
}

/**
 * Looks up a PIN code as soon as it is a valid 6-digit Indian PIN code. Stale answers (the PIN
 * changed meanwhile) are dropped. `locked` says whether city / district / state should be read-only:
 * everything except a service failure, when the user has to type them in.
 */
export const usePincodeLookup = (pincode: string, { enabled = true, onFound }: Options = {}) => {
  const pin = pincode.trim();
  const active = enabled && isIndianPincode(pin);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; status: PincodeLookupStatus; location?: PincodeLocation }>({ key: '', status: 'idle' });
  const key = `${pin}#${attempt}`;

  const onFoundRef = useRef(onFound);
  useEffect(() => {
    onFoundRef.current = onFound;
  });

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    lookupPincode(pin, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.status === 'found') {
          setResult({ key, status: 'found', location: res.location });
          onFoundRef.current?.(res.location, pin);
        } else {
          setResult({ key, status: 'notFound' });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, status: 'error' });
      });
    return () => controller.abort();
  }, [active, pin, key]);

  const status: PincodeLookupStatus = !enabled ? 'idle' : !active ? 'idle' : result.key === key ? result.status : 'loading';
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    status,
    location: status === 'found' ? result.location : undefined,
    locked: enabled && status !== 'error',
    retry,
  };
};
