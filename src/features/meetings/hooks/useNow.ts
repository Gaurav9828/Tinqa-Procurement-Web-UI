import { useEffect, useState } from 'react';

/** The current time, ticking every `everyMs` (a countdown on screen; no request is made). */
export const useNow = (everyMs = 30_000): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
};
