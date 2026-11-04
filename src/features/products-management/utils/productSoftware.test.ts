import { describe, expect, it } from 'vitest';
import { softwareChanged, softwareLine, toSoftwareFields, toSoftwareForm, validateSoftware } from './productSoftware';

describe('product software', () => {
  it('is optional, but its name and version come together', () => {
    expect(validateSoftware({ name: '', version: '  ' })).toEqual({});
    expect(validateSoftware({ name: 'TinQa OS', version: '2.1.0' })).toEqual({});
    expect(validateSoftware({ name: 'TinQa OS', version: '' })).toEqual({ softwareVersion: 'Enter the version of TinQa OS, or clear the software name.' });
    expect(validateSoftware({ name: ' ', version: '2.1.0' })).toEqual({ softwareName: 'Enter the name of the software at version 2.1.0, or clear the version.' });
  });

  it('refuses more than one line and the server limits', () => {
    expect(validateSoftware({ name: 'TinQa\nOS', version: '2' }).softwareName).toBe('Software name must be a single line.');
    expect(validateSoftware({ name: 'x'.repeat(101), version: '2' }).softwareName).toMatch(/at most 100/);
    expect(validateSoftware({ name: 'TinQa OS', version: '1'.repeat(51) }).softwareVersion).toMatch(/at most 50/);
  });

  it('leaves empty software out of a new product, but an edit always sends it so clearing removes it', () => {
    expect(toSoftwareFields({ name: ' ', version: '' }, false)).toEqual({});
    expect(toSoftwareFields({ name: ' ', version: '' }, true)).toEqual({ softwareName: '', softwareVersion: '' });
    expect(toSoftwareFields({ name: ' TinQa OS ', version: ' 2.1.0' }, false)).toEqual({ softwareName: 'TinQa OS', softwareVersion: '2.1.0' });
  });

  it('reads as customers see it and notices a change', () => {
    expect(softwareLine('TinQa OS', '2.1.0')).toBe('TinQa OS 2.1.0');
    expect(softwareLine(null, null)).toBeNull();
    const saved = { softwareName: 'TinQa OS', softwareVersion: '2.1.0' };
    expect(toSoftwareForm(saved)).toEqual({ name: 'TinQa OS', version: '2.1.0' });
    expect(toSoftwareForm(null)).toEqual({ name: '', version: '' });
    expect(softwareChanged(saved, { name: 'TinQa OS ', version: '2.1.0' })).toBe(false);
    expect(softwareChanged(saved, { name: 'TinQa OS', version: '2.2.0' })).toBe(true);
  });
});
