import React from 'react';
import { Copy } from 'lucide-react';
import { useNotify } from '../../../hooks/useNotify';

/** A monospace ID the user can select, with a copy button ("Copy <label>"). */
export const CopyableId: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const notify = useNotify();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(`${label} copied.`);
    } catch {
      notify.error(`${label} could not be copied. Select it and copy it manually.`);
    }
  };
  return (
    <span className="inline-flex items-center gap-1.5 max-w-full">
      <span className="font-mono select-all break-all">{value}</span>
      <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="p-1 rounded-md text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0">
        <Copy className="w-3 h-3" />
      </button>
    </span>
  );
};
