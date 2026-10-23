import React from 'react';
import { GripVertical } from 'lucide-react';

interface ProductOrderHandleProps {
  title: string;
  /** 0-based position in the listed products. */
  index: number;
  count: number;
  /** A move is being saved: dragging and keys wait. Not `disabled`, which would drop keyboard focus mid-move. */
  busy: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (from: number, to: number) => void;
}

const KEY_STEP: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };

/** Drag handle and position of a product row; ↑ ↓ move it one place. */
export const ProductOrderHandle: React.FC<ProductOrderHandleProps> = ({ title, index, count, busy, onDragStart, onDragEnd, onMove }) => (
  <div className="flex items-center gap-1 text-gray-400">
    <button
      type="button"
      draggable={!busy}
      aria-disabled={busy}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', title);
        const row = e.currentTarget.closest('tr');
        if (row) e.dataTransfer.setDragImage(row, 16, 16);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onKeyDown={(e) => {
        const step = KEY_STEP[e.key];
        if (step === undefined) return;
        e.preventDefault();
        const to = index + step;
        if (!busy && to >= 0 && to < count) onMove(index, to);
      }}
      className="p-1 -m-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white cursor-grab active:cursor-grabbing aria-disabled:cursor-wait aria-disabled:opacity-50"
      title="Drag to change where this product appears on the storefront (or use the ↑ ↓ keys)"
      aria-label={`Move ${title}, position ${index + 1} of ${count}`}
    >
      <GripVertical className="w-3.5 h-3.5" />
    </button>
    <span className="tabular-nums">{index + 1}</span>
  </div>
);
