import { describe, expect, it } from 'vitest';
import { moveItem, reorderInPlace } from './productOrder';

const items = (...ids: number[]) => ids.map((id) => ({ id }));
const ids = (list: { id: number }[]) => list.map((item) => item.id);

describe('moveItem', () => {
  it('moves an item up or down, shifting the ones in between', () => {
    expect(moveItem(['a', 'b', 'c', 'd', 'e'], 4, 0)).toEqual(['e', 'a', 'b', 'c', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd', 'e'], 0, 2)).toEqual(['b', 'c', 'a', 'd', 'e']);
  });

  it('leaves the list as it is for out-of-range or same positions', () => {
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
});

describe('reorderInPlace', () => {
  it('reorders a category within the positions it holds, leaving the other products in place', () => {
    // 1, 3, 4 are dioramas; 2 and 5 are accessories
    expect(ids(reorderInPlace(items(1, 2, 3, 4, 5), [4, 1, 3]))).toEqual([4, 2, 1, 3, 5]);
  });

  it('sets the overall order when every product is given', () => {
    expect(ids(reorderInPlace(items(1, 2, 3), [3, 1, 2]))).toEqual([3, 1, 2]);
  });

  it('ignores ids that are not in the list', () => {
    expect(ids(reorderInPlace(items(1, 2, 3), [3, 9, 1]))).toEqual([3, 2, 1]);
  });
});
