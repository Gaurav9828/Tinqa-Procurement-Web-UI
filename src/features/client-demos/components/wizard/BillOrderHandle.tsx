import React from 'react';
import { GripVertical } from 'lucide-react';

const KEY_STEP: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };

/** Drag handle of a day's journey, stay or meal; ↑ ↓ move it one place on its day. */
export const BillOrderHandle: React.FC<{
  title: string;
  /** 0-based place on its day. */
  index: number;
  count: number;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (from: number, to: number) => void;
}> = ({ title, index, count, onDragStart, onDragEnd, onMove }) => (
  <button
    type="button"
    draggable
    onDragStart={(e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', title);
      const card = e.currentTarget.closest('[role="group"]');
      if (card) e.dataTransfer.setDragImage(card, 16, 16);
      onDragStart();
    }}
    onDragEnd={onDragEnd}
    onKeyDown={(e) => {
      const step = KEY_STEP[e.key];
      if (step === undefined) return;
      e.preventDefault();
      const to = index + step;
      if (to >= 0 && to < count) onMove(index, to);
    }}
    className="p-1 -m-1 rounded-md text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white cursor-grab active:cursor-grabbing"
    title="Drag to change its place on the day (or use the ↑ ↓ keys)"
    aria-label={`Move ${title}, place ${index + 1} of ${count}`}
  >
    <GripVertical className="w-3.5 h-3.5" />
  </button>
);
