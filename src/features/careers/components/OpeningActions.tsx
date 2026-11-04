import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Pencil, RotateCcw, Send } from 'lucide-react';
import { useAccess } from '../../../hooks/useAccess';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import type { AdminOpeningRow } from '../types/careers.types';
import { deadlinePassed, editOpeningPath, formatDate } from '../utils/careers';
import { ActionButton } from './CareersUi';

/**
 * Edit, Publish, Close and Reopen for one opening (CAREER_OPENING_MANAGE). A deadline in the past can't be published:
 * the button says so and points to Edit. Closing asks first, as the opening then leaves the website.
 */
export const OpeningActions: React.FC<{
  opening: Pick<AdminOpeningRow, 'id' | 'status' | 'applicationDeadline' | 'title'>;
  busy: boolean;
  small?: boolean;
  onPublish: (reopen: boolean) => void;
  onClose: () => Promise<unknown>;
}> = ({ opening, busy, small, onPublish, onClose }) => {
  const { can } = useAccess();
  const [confirming, setConfirming] = useState(false);
  if (!can('CAREER_OPENING_MANAGE')) return null;
  const expired = deadlinePassed(opening.applicationDeadline);
  const expiredTitle = expired ? `The deadline (${formatDate(opening.applicationDeadline)}) has passed: edit it first.` : undefined;
  const icon = 'w-3.5 h-3.5';
  return (
    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
      <Link
        to={editOpeningPath(opening.id)}
        aria-label={`Edit ${opening.title}`}
        className={`inline-flex items-center gap-1.5 ${small ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'} rounded-xl font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white`}
      >
        <Pencil className={icon} /> Edit
      </Link>
      {opening.status === 'DRAFT' && (
        <ActionButton small={small} label="Publish" icon={<Send className={icon} />} tone="approve" disabled={busy || expired} title={expiredTitle} onClick={() => onPublish(false)} />
      )}
      {opening.status === 'PUBLISHED' && <ActionButton small={small} label="Close" icon={<Lock className={icon} />} tone="warning" disabled={busy} onClick={() => setConfirming(true)} />}
      {opening.status === 'CLOSED' && (
        <ActionButton small={small} label="Reopen" icon={<RotateCcw className={icon} />} tone="approve" disabled={busy || expired} title={expiredTitle} onClick={() => onPublish(true)} />
      )}
      <ConfirmationModal
        isOpen={confirming}
        actionType="CONFIRM"
        title={`Close ${opening.title}?`}
        description="It leaves the website and takes no more applications. Applicants already in the pipeline stay. You can reopen it later."
        confirmLabel="Close opening"
        tone="warning"
        isSubmitting={busy}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await onClose();
          setConfirming(false);
        }}
      />
    </div>
  );
};
