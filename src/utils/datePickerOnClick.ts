/** Input types whose browser picker should open on a single click anywhere in the field, not only on the icon. */
const PICKER_TYPES = new Set(['date', 'datetime-local', 'month', 'week', 'time']);

/**
 * Opens the native calendar when a date field is clicked anywhere, so no field needs its own handler. Disabled and
 * read-only fields are left alone. Returns a function that removes the listener.
 */
export function installDatePickerOnClick(root: Document = document): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !PICKER_TYPES.has(target.type)) return;
    if (target.disabled || target.readOnly || typeof target.showPicker !== 'function') return;
    try {
      target.showPicker();
    } catch {
      // Already open, or the browser refuses (e.g. inside a cross-origin frame): the icon still works.
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
