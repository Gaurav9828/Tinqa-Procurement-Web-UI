import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { axiosClient } from '../../../api/axiosClient';
import { useItemWarranties } from './useItemWarranties';

vi.mock('../../../api/axiosClient', () => ({ axiosClient: { get: vi.fn() } }));
const http = vi.mocked(axiosClient);
const body = (data: unknown) => ({ data: { success: true, message: 'OK', data } });

beforeEach(() => vi.clearAllMocks());

describe('useItemWarranties', () => {
  it('loads GET /v1/admin/items/{id}/warranties and reloads on demand', async () => {
    http.get.mockResolvedValueOnce(body([{ id: 1, title: 'A' }])).mockResolvedValueOnce(body([{ id: 1, title: 'A' }, { id: 2, title: 'B' }]));
    const { result } = renderHook(() => useItemWarranties(5));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(http.get).toHaveBeenCalledWith('/v1/admin/items/5/warranties');
    expect(result.current.warranties).toHaveLength(1);

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.warranties).toHaveLength(2));
  });

  it('returns the error instead of throwing', async () => {
    http.get.mockRejectedValueOnce(new Error('Item not found with ID: 9'));
    const { result } = renderHook(() => useItemWarranties(9));
    await waitFor(() => expect(result.current.error).toBe('Item not found with ID: 9'));
    expect(result.current.warranties).toEqual([]);
  });

  it('does nothing for no item, and ignores stale responses after switching items', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    http.get.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r))).mockResolvedValueOnce(body([{ id: 3, title: 'Second' }]));
    const { result, rerender } = renderHook(({ id }) => useItemWarranties(id), { initialProps: { id: null as number | null } });
    expect(result.current).toMatchObject({ isLoading: false, warranties: [] });
    expect(http.get).not.toHaveBeenCalled();

    rerender({ id: 1 });
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.warranties).toEqual([{ id: 3, title: 'Second' }]));
    resolveFirst(body([{ id: 99, title: 'Stale' }]));
    await Promise.resolve();
    expect(result.current.warranties).toEqual([{ id: 3, title: 'Second' }]);
  });
});
