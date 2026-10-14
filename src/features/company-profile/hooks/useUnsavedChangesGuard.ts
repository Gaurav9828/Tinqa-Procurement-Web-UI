import { useEffect, useRef } from 'react';

export const UNSAVED_CHANGES_PROMPT = 'You have unsaved changes. Leave without saving?';

/**
 * Warns before losing unsaved edits: closing/reloading the tab, and clicking any in-app link
 * (sidebar, breadcrumbs). The app uses <BrowserRouter>, which has no navigation blocker, so link
 * clicks are intercepted in the capture phase. Programmatic navigation after a save is not blocked.
 */
export const useUnsavedChangesGuard = (dirty: boolean) => {
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.origin !== window.location.origin) return;
      if (!window.confirm(UNSAVED_CHANGES_PROMPT)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  /** For in-page buttons (Back / Cancel): true when it's fine to leave. */
  return () => !dirtyRef.current || window.confirm(UNSAVED_CHANGES_PROMPT);
};
