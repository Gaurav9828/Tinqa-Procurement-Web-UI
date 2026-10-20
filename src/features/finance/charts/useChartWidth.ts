import { useEffect, useRef, useState } from 'react';

/** Width of the chart's container, kept up to date (charts redraw instead of stretching). */
export const useChartWidth = <T extends HTMLElement>(fallback = 640) => {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(240, Math.floor(node.getBoundingClientRect().width) || fallback));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fallback]);
  return { ref, width };
};
