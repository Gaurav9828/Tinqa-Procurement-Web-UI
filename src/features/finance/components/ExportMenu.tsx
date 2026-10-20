import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';
import type { FinanceReport } from '../export/report.types';
import { useNotify } from '../../../hooks/useNotify';
import { useAccess } from '../../../hooks/useAccess';

type Format = 'pdf' | 'xlsx' | 'docx';

const FORMATS: { id: Format; label: string; Icon: typeof FileText }[] = [
  { id: 'pdf', label: 'PDF', Icon: FileText },
  { id: 'xlsx', label: 'Excel (.xlsx)', Icon: FileSpreadsheet },
  { id: 'docx', label: 'Word (.docx)', Icon: FileType },
];

/**
 * Exports a report (charts as pictures, figures and tables as data) to PDF, Excel or Word. `build` may load data
 * (e.g. the full ledger) and is called only when a format is picked. Needs FINANCE_REPORT_EXPORT.
 */
export const ExportMenu: React.FC<{ build: () => Promise<FinanceReport> | FinanceReport; label?: string; compact?: boolean }> = ({
  build,
  label = 'Export',
  compact = false,
}) => {
  const { can } = useAccess();
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!can('FINANCE_REPORT_EXPORT')) return null;

  const run = async (format: Format) => {
    setOpen(false);
    setBusy(format);
    try {
      const report = await build();
      if (format === 'pdf') await (await import('../export/exportPdf')).exportPdf(report);
      else if (format === 'xlsx') await (await import('../export/exportExcel')).exportExcel(report);
      else await (await import('../export/exportWord')).exportWord(report);
      notify.success(`${report.title} exported.`);
    } catch (err: unknown) {
      notify.error(err, 'The export could not be created.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? `${label}: choose a format` : undefined}
        disabled={busy !== null}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white font-semibold cursor-pointer disabled:opacity-60 ${
          compact ? 'p-2 text-[11px]' : 'px-3 py-2 text-xs'
        }`}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {!compact && label}
        {!compact && <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] shadow-lg p-1 text-xs">
          {FORMATS.map(({ id, label: text, Icon }) => (
            <li key={id}>
              <button type="button" role="menuitem" onClick={() => run(id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white cursor-pointer">
                <Icon className="w-3.5 h-3.5 text-gray-500" /> {text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
