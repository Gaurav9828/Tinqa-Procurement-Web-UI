import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { CompanyProfileVersion } from '../types/companyProfile.types';
import type { CompanyProfileAccess } from '../hooks/useCompanyProfileAccess';
import { useCompanyProfileActions } from '../hooks/useCompanyProfileActions';
import { ConfirmDialog } from './Dialogs';
import { BUTTON } from '../utils/companyProfileUi';
import { sameUser } from '../utils/companyProfile.utils';

interface Props {
  version: CompanyProfileVersion;
  access: CompanyProfileAccess;
  /** After the draft is deleted. */
  onDeleted: (deleted: CompanyProfileVersion) => void;
  /** After a 409 (the version moved on). */
  onStale?: () => void;
  className?: string;
}

/**
 * Delete a DRAFT / REJECTED version, after confirmation: the creator's own, or anyone's for a Super Admin.
 * Renders nothing when the current admin can't delete it.
 */
export const DeleteDraftButton: React.FC<Props> = ({ version, access, onDeleted, onStale, className }) => {
  const actions = useCompanyProfileActions({ onStale });
  const [open, setOpen] = useState(false);
  if (!access.canDelete(version)) return null;

  const someoneElses = !sameUser(version.createdBy, access.username);
  return (
    <>
      <button
        type="button"
        disabled={!!actions.busy}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`${BUTTON.secondary} text-rose-600 dark:text-rose-400 ${className ?? ''}`}
        aria-label={`Delete version ${version.versionNo}`}
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      {open && (
        // Rendered inside clickable rows: keep the dialog's clicks from reaching them.
        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title={`Delete version ${version.versionNo}?`}
            body={
              someoneElses
                ? `This draft was created by ${version.createdBy ?? 'another admin'}. Deleting it can't be undone; it stays in the history as Deleted.`
                : "Deleting this draft can't be undone; it stays in the history as Deleted. You can start a new draft at any time."
            }
            confirmLabel="Delete draft"
            tone="danger"
            busy={actions.busy === 'delete'}
            onClose={() => setOpen(false)}
            onConfirm={async () => {
              const result = await actions.deleteDraft(version.id);
              if (result.ok || result.code) setOpen(false);
              if (result.ok && result.version) onDeleted(result.version);
            }}
          />
        </div>
      )}
    </>
  );
};
