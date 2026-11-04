import { describe, expect, it } from 'vitest';
import {
  formatVersion,
  matchVersions,
  modelChanges,
  modelLine,
  modelNameError,
  newVersionBlockedReason,
  nextVersionNumberOfName,
  versionHintFor,
  versionNumberFor,
} from './productVersion';

const version = (id: number, title: string, versionNumber: number, modelName: string | null = null, extra = {}) => ({
  id,
  title,
  versionNumber,
  modelName,
  draft: false,
  previousVersionId: null as number | null,
  sold: false,
  ...extra,
});

const RUDRA = [version(1, 'RudraX', 1, 'RX-100'), version(2, 'rudrax ', 2, 'RX-200'), version(3, 'Vayu', 1, 'VY-1')];

describe('versions', () => {
  it('count in tenths, rolling over after .9', () => {
    expect([1, 2, 9, 10, 11, 20].map(formatVersion)).toEqual(['v0.1', 'v0.2', 'v0.9', 'v1.0', 'v1.1', 'v2.0']);
  });

  it('are numbered per product name, ignoring case and outer spaces', () => {
    expect(nextVersionNumberOfName('RUDRAX', RUDRA)).toBe(3);
    expect(nextVersionNumberOfName('Vayu', RUDRA)).toBe(2);
    expect(nextVersionNumberOfName('Agni', RUDRA)).toBe(1);
    expect(nextVersionNumberOfName('  ', RUDRA)).toBe(1);
    // The product being edited doesn't count against itself
    expect(nextVersionNumberOfName('RudraX', RUDRA, 2)).toBe(2);
  });

  it('a saved product keeps its version unless renamed', () => {
    expect(versionNumberFor('RudraX', RUDRA, RUDRA[0])).toBe(1);
    expect(versionNumberFor('vayu', RUDRA, RUDRA[0])).toBe(2);
    expect(versionNumberFor('RudraX', RUDRA, null)).toBe(3);
    expect(versionHintFor('Vayu', 2, RUDRA[0])).toBe('Renamed: it becomes the newest version of Vayu when saved.');
    expect(versionHintFor('RudraX', 3, null)).toBe('Given when saved: the next version of RudraX.');
    expect(versionHintFor('Agni', 1, null)).toBe('Given when saved: the first version of Agni.');
  });

  it('wait for a draft copy to be finished before another is copied from the same version', () => {
    const draftCopy = version(4, 'RudraX', 3, null, { draft: true, previousVersionId: 1 });
    expect(newVersionBlockedReason(RUDRA[0], [...RUDRA, draftCopy])).toBe('v0.3 (#4), copied from this version, is still a draft. Finish that one first.');
    expect(newVersionBlockedReason(RUDRA[0], [...RUDRA, { ...draftCopy, draft: false }])).toBeNull();
    expect(newVersionBlockedReason(draftCopy, [...RUDRA, draftCopy])).toMatch(/This is a draft/);
  });
});

describe('model names', () => {
  it('are required to create or submit, and belong to one version (ignoring case)', () => {
    expect(modelNameError('', RUDRA, true)).toBe('Model name is required.');
    expect(modelNameError('', RUDRA, false)).toBeNull();
    expect(modelNameError(' rx-200 ', RUDRA, true)).toBe('rx-200 is already the model name of rudrax  v0.2 (#2). Each version needs its own.');
    expect(modelNameError('RX-200', RUDRA, true, 2)).toBeNull();
    expect(modelNameError('RX-300', RUDRA, true)).toBeNull();
    expect(modelNameError('x'.repeat(101), RUDRA, true)).toMatch(/cannot exceed 100/);
  });

  it('are written under the description with the version', () => {
    expect(modelLine('RX-200', 2)).toBe('Model RX-200 · Version v0.2');
    expect(modelLine('  ', 2)).toBeNull();
    expect(modelLine(null, 2)).toBeNull();
  });

  it('show in an edit’s change summary with any version change', () => {
    expect(modelChanges(RUDRA[0], 'RX-100', 1, 'RudraX')).toEqual([]);
    expect(modelChanges(RUDRA[0], 'RX-101', 2, 'Vayu')).toEqual([
      { label: 'Model name', oldVal: 'RX-100', newVal: 'RX-101' },
      { label: 'Version', oldVal: 'v0.1', newVal: 'v0.2 (newest of Vayu)' },
    ]);
  });
});

describe('adapting from a version', () => {
  it('lists the versions whose name or model name matches, grouped by name, newest first', () => {
    expect(matchVersions('rud', RUDRA).map((p) => p.id)).toEqual([2, 1]);
    expect(matchVersions('vy-', RUDRA).map((p) => p.id)).toEqual([3]);
    expect(matchVersions(' ', RUDRA)).toEqual([]);
    expect(matchVersions('x', RUDRA, 1)).toHaveLength(1);
  });
});
