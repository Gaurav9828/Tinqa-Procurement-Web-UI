/**
 * Remembers the pages a searchable list has loaded, so the same or a narrower search is answered without a request.
 *
 * Every backend search here is a case-insensitive "contains" match, so a longer term can only match fewer rows:
 * - The same query again (e.g. "touch panel" → "touch pan" → back to "touch panel") is served from memory.
 * - A term that extends a term whose result was complete (all matches fit on one page) is filtered locally, e.g.
 *   once "touch" returned 6 rows, "touch panel" is those 6 rows filtered. This needs `matches`, which must test the
 *   same fields the backend searches.
 * - Erasing ("touch panel" → "touch pan") widens the search. The narrower result cannot answer it, so it is fetched
 *   unless that wider term (or a complete one it extends) was loaded before.
 *
 * Entries expire after `ttlMs`; call `clear()` after any change to the data (save, approve, manual refresh).
 */
export interface SearchPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export interface SearchQuery {
  /** Every request input except the term and the page (filters, sort, page size), e.g. `JSON.stringify(...)`. */
  scope: string;
  term: string;
  page: number;
}

export interface SearchResultCacheOptions<T> {
  /** True when `row` contains `term` (already lower-cased) in one of the fields the backend searches. */
  matches?: (row: T, term: string) => boolean;
  ttlMs?: number;
  maxEntries?: number;
}

interface Entry<P> {
  query: SearchQuery;
  result: P;
  storedAt: number;
}

// SQL LIKE treats these as wildcards, so a local "contains" check would not agree with the server.
const LIKE_WILDCARDS = /[%_\\]/;

/** Lower-cased "contains" over the given field values; empty values never match. */
export const containsTerm = (term: string, ...fields: (string | null | undefined)[]) =>
  fields.some((field) => !!field && field.toLowerCase().includes(term));

export const createSearchResultCache = <T, P extends SearchPage<T> = SearchPage<T>>({
  matches,
  ttlMs = 60_000,
  maxEntries = 30,
}: SearchResultCacheOptions<T> = {}) => {
  const entries = new Map<string, Entry<P>>();
  const keyOf = ({ scope, term, page }: SearchQuery) => `${scope}|${page}|${term.toLowerCase()}`;
  const fresh = (entry: Entry<P>) => Date.now() - entry.storedAt < ttlMs;

  const get = (query: SearchQuery): P | null => {
    const exact = entries.get(keyOf(query));
    if (exact && fresh(exact)) return exact.result;
    if (!matches || query.page !== 0 || LIKE_WILDCARDS.test(query.term)) return null;

    const term = query.term.toLowerCase();
    let base: Entry<P> | null = null;
    for (const entry of entries.values()) {
      const complete = entry.result.content.length >= entry.result.totalElements;
      const wider = term.includes(entry.query.term.toLowerCase());
      if (entry.query.scope === query.scope && entry.query.page === 0 && complete && wider && fresh(entry)) {
        if (!base || entry.query.term.length > base.query.term.length) base = entry;
      }
    }
    if (!base) return null;
    const content = base.result.content.filter((row) => matches(row, term));
    return { ...base.result, content, totalElements: content.length, totalPages: content.length ? 1 : 0 };
  };

  const set = (query: SearchQuery, result: P) => {
    const key = keyOf(query);
    entries.delete(key);
    entries.set(key, { query, result, storedAt: Date.now() });
    if (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
  };

  const clear = () => entries.clear();

  return { get, set, clear };
};

export type SearchResultCache<T, P extends SearchPage<T> = SearchPage<T>> = ReturnType<typeof createSearchResultCache<T, P>>;
