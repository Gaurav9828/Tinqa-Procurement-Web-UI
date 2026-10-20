import { useCallback, useEffect, useState } from 'react';

/** How long typing must pause before a search goes to the server. App-wide, so every search box behaves alike. */
export const SEARCH_DEBOUNCE_MS = 2000;

/**
 * Settles what the user types into a search box before it reaches the API.
 *
 * - `term` is the trimmed text once typing has paused for `delayMs`; only it belongs in a request.
 * - `pending` is true while the box holds text that has not settled yet. List hooks skip fetching meanwhile, so a
 *   keystroke that also resets the page does not fire a request with the old term.
 * - `flush()` settles at once (Enter in the box). Clearing the box settles at once too.
 */
export const useSearchTerm = (raw: string, delayMs = SEARCH_DEBOUNCE_MS) => {
  const typed = raw.trim();
  const [settled, setSettled] = useState(typed);
  const term = typed ? settled : '';

  useEffect(() => {
    if (!typed || typed === settled) return;
    const timer = setTimeout(() => setSettled(typed), delayMs);
    return () => clearTimeout(timer);
  }, [typed, settled, delayMs]);

  const flush = useCallback(() => setSettled(typed), [typed]);

  return { term, pending: typed !== term, flush };
};
