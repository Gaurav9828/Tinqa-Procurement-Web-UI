import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEARCH_DEBOUNCE_MS, useSearchTerm } from './useSearchTerm';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = () => renderHook(({ raw }) => useSearchTerm(raw), { initialProps: { raw: '' } });

describe('useSearchTerm', () => {
  it('settles only after typing pauses for two seconds', () => {
    const { result, rerender } = setup();
    rerender({ raw: 'touch' });
    act(() => vi.advanceTimersByTime(1500));
    rerender({ raw: 'touch panel ' });
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1));
    expect(result.current).toMatchObject({ term: '', pending: true });
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toMatchObject({ term: 'touch panel', pending: false });
  });

  it('settles at once on flush (Enter) and when the box is cleared', () => {
    const { result, rerender } = setup();
    rerender({ raw: 'touch' });
    act(() => result.current.flush());
    expect(result.current).toMatchObject({ term: 'touch', pending: false });
    rerender({ raw: '' });
    expect(result.current).toMatchObject({ term: '', pending: false });
  });

  it('is not pending when the text returns to the settled term', () => {
    const { result, rerender } = setup();
    rerender({ raw: 'touch' });
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    rerender({ raw: 'touchx' });
    expect(result.current.pending).toBe(true);
    rerender({ raw: 'touch' });
    expect(result.current).toMatchObject({ term: 'touch', pending: false });
  });
});
