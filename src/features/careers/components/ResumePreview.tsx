import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Download, FileText, Loader2 } from 'lucide-react';
import type { ApplicationDetail } from '../types/careers.types';
import { useResumeFile } from '../hooks/useResumeFile';
import { formatBytes } from '../utils/careers';

const pagesText = (pages: number) => (pages === 1 ? '1 page' : `${pages} pages`);

/**
 * The résumé PDF, shown inside the page. Nothing is downloaded until "Show résumé" is pressed; the PDF then comes
 * through the signed-in API client as a blob and is shown from an object URL (revoked when the page closes).
 */
export const ResumePreview: React.FC<{ application: ApplicationDetail }> = ({ application }) => {
  const [open, setOpen] = useState(false);
  const resume = application.resume;
  const available = !!resume?.available;
  const file = useResumeFile(application.id, open && available);
  const fileName = resume?.fileName || `${application.referenceNumber}.pdf`;

  return (
    <section aria-label="Résumé" className="apple-card p-5 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#0071e3]" /> Résumé
          {resume && (
            <span className="font-normal text-gray-400">
              {resume.fileName} · {formatBytes(resume.sizeBytes)}
              {resume.pages ? ` · ${pagesText(resume.pages)}` : ''}
            </span>
          )}
        </h2>
        {available && (
          <div className="flex gap-2">
            {file.url && (
              <button type="button" onClick={() => file.download(fileName)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            )}
            <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#0071e3]/40 text-[#0071e3] hover:bg-[#0071e3]/10 font-semibold cursor-pointer">
              {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} {open ? 'Hide résumé' : 'Show résumé'}
            </button>
          </div>
        )}
      </div>
      {!available && <p className="text-gray-500">The résumé is no longer kept (deleted after the retention period).</p>}
      {open && available && file.isLoading && (
        <p className="flex items-center gap-2 text-gray-500" role="status"><Loader2 className="w-4 h-4 animate-spin" /> Loading the résumé…</p>
      )}
      {open && file.purged && <p className="text-gray-500">The résumé is no longer kept (deleted after the retention period).</p>}
      {open && file.failed && !file.purged && <p className="text-rose-600 dark:text-rose-400">The résumé could not be loaded. Reload the page to try again.</p>}
      {open && file.url && (
        <iframe title={`Résumé of ${application.fullName}`} src={file.url} className="w-full h-[75vh] rounded-xl border border-black/10 dark:border-white/10 bg-white" />
      )}
    </section>
  );
};
