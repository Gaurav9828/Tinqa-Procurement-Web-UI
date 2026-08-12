import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Clock, Eye } from 'lucide-react';

interface DocumentItem {
  id: number;
  name: string;
  status: string;
  date: string;
}

export const DocumentsTab: React.FC = () => {
  const [docs] = useState<DocumentItem[]>([
    { id: 1, name: 'GST Identification Certificate', status: 'Verified', date: '2026-01-15' },
    { id: 2, name: 'PAN Authorization Letter', status: 'Verified', date: '2026-01-15' },
    { id: 3, name: 'Regional Operating License', status: 'Pending Admin II Verification', date: '2026-08-08' },
  ]);

  return (
    <div className="space-y-6">
      <div className="apple-card p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Upload Compliance Document</h3>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            Uploaded attachments are linked to employee record and submitted to Admin-II.
          </p>
        </div>
        <label className="px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-sm font-medium cursor-pointer transition-colors flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload Document
          <input type="file" className="hidden" />
        </label>
      </div>

      <div className="apple-card divide-y divide-black/10 dark:divide-white/10">
        {docs.map((doc) => (
          <div key={doc.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#0071e3]" />
              <div>
                <p className="font-medium text-sm">{doc.name}</p>
                <p className="text-xs text-gray-400">Uploaded on {doc.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {doc.status === 'Verified' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" /> Pending Admin II
                </span>
              )}

              <button
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                title="Preview Document"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};