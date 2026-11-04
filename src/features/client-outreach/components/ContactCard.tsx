import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Eye, FileText, ImageIcon, Loader2, Pencil } from 'lucide-react';
import { CHOICE_TONE } from '../../../components/ui/actionTones';
import { useProofOpener, useProofThumbnails } from '../hooks/useProofFiles';
import type { OutreachContact } from '../types/outreach.types';
import {
  CHANNEL_LABELS,
  INTEREST_LABELS,
  INTEREST_TONE,
  NEXT_ACTION_LABELS,
  RATING_LABELS,
  businessPath,
  fileSize,
  formatDateTime,
  isImageProof,
  isOverdue,
} from '../utils/outreach';

interface Props {
  contact: OutreachContact;
  /** Show the business name as a link (lists across businesses). */
  showBusiness?: boolean;
  /** Set when the signed-in user may edit this contact (their own, with OUTREACH_LOG). */
  onEdit?: (contact: OutreachContact) => void;
}

const ProofIcon: React.FC<{ busy: boolean; contentType: string }> = ({ busy, contentType }) => {
  if (busy) return <Loader2 className="w-3 h-3 animate-spin" />;
  return isImageProof(contentType) ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />;
};

/** One logged contact: when, how, who logged it, what was said, how it went and what comes next, with its proofs. */
export const ContactCard: React.FC<Props> = ({ contact, showBusiness, onEdit }) => {
  const [previews, setPreviews] = useState(false);
  const thumbnails = useProofThumbnails(contact.id, contact.proofs, previews);
  const opener = useProofOpener();
  const hasImages = contact.proofs.some((proof) => isImageProof(proof.contentType));
  const overdue = contact.nextAction !== 'NONE' && isOverdue(contact.followUpAt);

  return (
    <article aria-label={`Contact on ${formatDateTime(contact.contactedAt)}`} className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-2">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          {showBusiness && (
            <Link to={businessPath(contact.businessId)} className="text-sm font-semibold text-[#0071e3] hover:underline">
              {contact.businessName}
            </Link>
          )}
          <p className="text-xs text-gray-600 dark:text-neutral-300">
            <span className="font-semibold">{formatDateTime(contact.contactedAt)}</span> · {CHANNEL_LABELS[contact.channel] ?? contact.channel} · logged by{' '}
            {contact.loggedByName}
            {contact.contactPerson && <> · spoke with {contact.contactPerson}</>}
            {contact.contactPhone && <> ({contact.contactPhone})</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {contact.rating && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-black/10 dark:border-white/10 text-gray-600 dark:text-neutral-300">
              {RATING_LABELS[contact.rating]}
            </span>
          )}
          {contact.interest && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${INTEREST_TONE[contact.interest]}`}>{INTEREST_LABELS[contact.interest]}</span>
          )}
          {onEdit && contact.editable && (
            <button type="button" onClick={() => onEdit(contact)} aria-label="Edit contact"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${CHOICE_TONE.primary.idle}`}>
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
        </div>
      </header>

      <p className="text-sm text-black dark:text-white whitespace-pre-line">{contact.summary}</p>
      {contact.response && (
        <p className="text-xs text-gray-600 dark:text-neutral-300 whitespace-pre-line">
          <span className="font-semibold">Response: </span>
          {contact.response}
        </p>
      )}
      {contact.nextAction !== 'NONE' && (
        <p className={`text-xs flex items-center gap-1.5 ${overdue ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-gray-600 dark:text-neutral-300'}`}>
          <CalendarClock className="w-3.5 h-3.5" /> {NEXT_ACTION_LABELS[contact.nextAction]} · {formatDateTime(contact.followUpAt)}
          {overdue && ' (due)'}
        </p>
      )}

      {contact.proofs.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {contact.proofs.map((proof) => (
              <button key={proof.id} type="button" disabled={opener.busyId === proof.id} onClick={() => opener.open(contact.id, proof)}
                title={`Open ${proof.fileName}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[11px] text-[#0071e3] hover:underline cursor-pointer disabled:opacity-50">
                <ProofIcon busy={opener.busyId === proof.id} contentType={proof.contentType} />
                {proof.fileName} <span className="text-gray-400">· {fileSize(proof.size)}</span>
              </button>
            ))}
            {hasImages && !previews && (
              <button type="button" onClick={() => setPreviews(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0071e3] cursor-pointer">
                <Eye className="w-3 h-3" /> Show previews
              </button>
            )}
          </div>
          {previews && (
            <div className="flex flex-wrap gap-2">
              {contact.proofs
                .filter((proof) => thumbnails[proof.id])
                .map((proof) => (
                  <button key={proof.id} type="button" onClick={() => opener.open(contact.id, proof)} className="cursor-pointer">
                    <img src={thumbnails[proof.id]} alt={proof.fileName} className="h-20 w-20 object-cover rounded-lg border border-black/10 dark:border-white/10" />
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
