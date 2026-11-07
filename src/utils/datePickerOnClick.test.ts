import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDatePickerOnClick } from './datePickerOnClick';

describe('installDatePickerOnClick', () => {
  let uninstall: () => void;
  const showPicker = vi.fn();

  beforeEach(() => {
    showPicker.mockReset();
    HTMLInputElement.prototype.showPicker = showPicker;
    uninstall = installDatePickerOnClick();
  });

  afterEach(() => {
    uninstall();
    document.body.innerHTML = '';
  });

  const input = (type: string, attrs: Partial<HTMLInputElement> = {}) => {
    const el = document.createElement('input');
    el.type = type;
    Object.assign(el, attrs);
    document.body.appendChild(el);
    return el;
  };

  it('opens the calendar when a date field is clicked anywhere', () => {
    input('date').click();
    input('datetime-local').click();
    expect(showPicker).toHaveBeenCalledTimes(2);
  });

  it('leaves disabled, read-only and non-date fields alone', () => {
    input('date', { disabled: true }).click();
    input('date', { readOnly: true }).click();
    input('text').click();
    expect(showPicker).not.toHaveBeenCalled();
  });

  it('ignores a browser that refuses to open the picker', () => {
    showPicker.mockImplementation(() => { throw new DOMException('NotAllowedError'); });
    expect(() => input('date').click()).not.toThrow();
  });

  it('stops after it is removed', () => {
    uninstall();
    input('date').click();
    expect(showPicker).not.toHaveBeenCalled();
    uninstall = () => {};
  });
});
