import { useEffect, useState } from 'react';

/** Returns `value` once it has stopped changing for `delayMs` (e.g. search-as-you-type). */
export const useDebouncedValue = <T,>(value: T, delayMs = 350): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
