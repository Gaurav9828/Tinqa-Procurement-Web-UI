import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Where a panel opens: under its field, or above it when there's no room below, always on screen. */
const usePanelPosition = (open: boolean, triggerRef: React.RefObject<HTMLElement | null>, height: number, width: number) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight && rect.top > height ? rect.top - 6 - height : below;
    setPosition({ top, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) });
  }, [triggerRef, height, width]);
  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);
  return position;
};

/**
 * A panel `width` by `height` opened from a field (`triggerRef`): placed by it, closed by a click outside it or by Escape (focus goes back
 * to the field).
 */
export const usePopover = (triggerRef: React.RefObject<HTMLElement | null>, height: number, width: number) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const position = usePanelPosition(open, triggerRef, height, width);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    // Escape closes it wherever the focus is (a picked hour's button is gone once the minutes show)
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, triggerRef]);
  return { open, setOpen, panelRef, position };
};
