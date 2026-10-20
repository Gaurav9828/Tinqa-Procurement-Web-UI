import { afterEach, describe, expect, it, vi } from 'vitest';
import { containsTerm, createSearchResultCache } from './searchResultCache';

interface Row {
  name: string;
}

const row = (name: string): Row => ({ name });
const pageOf = (names: string[], totalElements = names.length) => ({
  content: names.map(row),
  totalElements,
  totalPages: Math.ceil(totalElements / 20),
});
const query = (term: string, page = 0, scope = 'all') => ({ scope, term, page });
const newCache = () => createSearchResultCache<Row>({ matches: (r, term) => containsTerm(term, r.name) });

afterEach(() => vi.useRealTimers());

describe('searchResultCache', () => {
  it('answers a query it has seen, whatever its case', () => {
    const cache = newCache();
    cache.set(query('touch panel'), pageOf(['Touch Panel 7"']));
    expect(cache.get(query('Touch Panel'))?.content).toEqual([row('Touch Panel 7"')]);
  });

  it('answers a narrower term locally once a wider result was complete', () => {
    const cache = newCache();
    cache.set(query('touch'), pageOf(['Touch Panel 7"', 'Touch Pen', 'Touch Panel 10"']));
    const narrower = cache.get(query('touch panel'));
    expect(narrower?.content.map((r) => r.name)).toEqual(['Touch Panel 7"', 'Touch Panel 10"']);
    expect(narrower).toMatchObject({ totalElements: 2, totalPages: 1 });
  });

  it('does not answer a narrower term from an incomplete (multi-page) result', () => {
    const cache = newCache();
    cache.set(query('touch'), pageOf(['Touch Panel 7"'], 45));
    expect(cache.get(query('touch panel'))).toBeNull();
  });

  it('does not answer a wider term (erasing) from a narrower result', () => {
    const cache = newCache();
    cache.set(query('touch panel'), pageOf(['Touch Panel 7"']));
    // "touch pan" can also match "Touch Pane", which the "touch panel" result could never contain.
    expect(cache.get(query('touch pan'))).toBeNull();
  });

  it('answers the erased term when it, or a complete wider term, was loaded before', () => {
    const cache = newCache();
    cache.set(query('touch'), pageOf(['Touch Pane', 'Touch Panel 7"', 'Touch Pen']));
    cache.set(query('touch panel'), pageOf(['Touch Panel 7"']));
    expect(cache.get(query('touch pan'))?.content.map((r) => r.name)).toEqual(['Touch Pane', 'Touch Panel 7"']);
  });

  it('keeps filters, pages and expired entries apart', () => {
    vi.useFakeTimers();
    const cache = newCache();
    cache.set(query('', 0, 'active'), pageOf(['Touch Pen']));
    expect(cache.get(query('touch', 0, 'inactive'))).toBeNull();
    expect(cache.get(query('touch', 1, 'active'))).toBeNull();
    expect(cache.get(query('touch', 0, 'active'))).not.toBeNull();
    vi.advanceTimersByTime(60_001);
    expect(cache.get(query('touch', 0, 'active'))).toBeNull();
  });

  it('leaves SQL wildcard terms to the server and forgets everything on clear', () => {
    const cache = newCache();
    cache.set(query(''), pageOf(['A_B', 'AXB']));
    expect(cache.get(query('a_b'))).toBeNull();
    cache.clear();
    expect(cache.get(query(''))).toBeNull();
  });

  it('only reuses exact queries when no matcher is given', () => {
    const cache = createSearchResultCache<Row>();
    cache.set(query(''), pageOf(['Touch Pen']));
    expect(cache.get(query('touch'))).toBeNull();
    expect(cache.get(query(''))).not.toBeNull();
  });
});
