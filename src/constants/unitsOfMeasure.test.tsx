import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_UNIT, UNITS_OF_MEASURE, formatUnit, isKnownUnit, unitSelectOptions } from './unitsOfMeasure';
import { UnitOfMeasureSelect } from '../components/ui/UnitOfMeasureSelect';

// Procurement backend ValidationPatterns.UNIT, max 20 characters.
const BACKEND_UNIT = /^[A-Za-z][A-Za-z ._-]*$/;

describe('units of measure', () => {
  it('every code is accepted by the backend and unique', () => {
    for (const { code } of UNITS_OF_MEASURE) {
      expect(code).toMatch(BACKEND_UNIT);
      expect(code.length).toBeLessThanOrEqual(20);
    }
    expect(new Set(UNITS_OF_MEASURE.map((u) => u.code)).size).toBe(UNITS_OF_MEASURE.length);
  });

  it('covers the hardware units and keeps the original preset codes', () => {
    for (const code of ['MM', 'CM', 'INCH', 'KG', 'PCS', 'LTR', 'GRAM', 'METER', 'BOX', 'PACK', 'SET']) expect(isKnownUnit(code)).toBe(true);
    expect(DEFAULT_UNIT).toBe('PCS');
    expect(formatUnit('MM')).toBe('MM — Millimetre');
    expect(formatUnit('kg')).toBe('KG — Kilogram');
  });

  it('keeps an older saved value selectable', () => {
    expect(unitSelectOptions('METERS')[0]).toEqual({ label: 'METERS (current value)', value: 'METERS' });
    expect(unitSelectOptions('KG').some((o) => o.label.includes('current value'))).toBe(false);
  });

  it('the select offers only the fixed list, grouped, and reports the chosen code', async () => {
    const onChange = vi.fn();
    render(<UnitOfMeasureSelect label="Unit of Measure" required value="PCS" onChange={onChange} />);
    const select = screen.getByLabelText(/Unit of Measure/);
    expect(select.tagName).toBe('SELECT');
    expect(within(select).getAllByRole('group').map((g) => g.getAttribute('label'))).toEqual(['Count', 'Length', 'Weight', 'Volume', 'Area']);
    expect(within(select).getAllByRole('option')).toHaveLength(UNITS_OF_MEASURE.length);
    await userEvent.setup().selectOptions(select, 'INCH');
    expect(onChange).toHaveBeenCalledWith('INCH');
  });

  it('shows a legacy value as the current selection instead of silently changing it', () => {
    render(<UnitOfMeasureSelect label="Unit of Measure" value="METERS" onChange={() => undefined} />);
    expect(screen.getByLabelText(/Unit of Measure/)).toHaveValue('METERS');
    expect(screen.getByRole('option', { name: 'METERS (current value)' })).toBeInTheDocument();
  });
});
